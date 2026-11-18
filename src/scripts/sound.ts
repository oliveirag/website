// The sound engine: the one owner of the Ambience loop and the Cues.
//
// It reports its state on <html data-sound>: "locked" until the visitor's first gesture, then "playing",
// or "muted" whenever the muted preference is on (before or after a gesture). The state describes what the
// engine is doing, not what can be heard: with no Ambience file, "playing" is quiet between Cues.
// It also reports the Ambience on <html data-ambience>: "playing" while sound is on, the tab is showing and no
// video is playing on the page, "paused" otherwise. Cues carry on while a video plays.
//
// Nothing loads before the first gesture. On it, the engine starts an AudioContext, begins the Ambience
// and fetches the Cue files. A Cue with no file is generated in code instead (generated-cues.ts). The audio lives outside the DOM and this module runs once per visit, so the
// Ambience carries on across client-side page changes without restarting.
import { read, subscribe } from './preferences';
import { generatedCues, type CueName } from './generated-cues';
import type { SoundFiles, SoundName } from './sound-files';

export type SoundState = 'locked' | 'playing' | 'muted';
export type AmbienceState = 'playing' | 'paused';
export type { CueName };

// Quiet by default, so it never startles. Gains run from 0 to 1.
const AMBIENCE_VOLUME = 0.2;
// For Cue files. Generated Cues carry their own levels.
const CUE_VOLUME = 0.4;
const FADE_IN_SECONDS = 1.5;
const FADE_OUT_SECONDS = 0.2;
// A Cue whose file is still loading plays only if it arrives within this time, so it never lags its action.
const CUE_LATENESS_MS = 250;

let files: SoundFiles = {};
let started = false;
let unlocked = false;
let muted = false;
let videoPlaying = false;
let context: AudioContext | undefined;
let ambience: { element: HTMLAudioElement; gain?: GainNode } | undefined;
let pauseTimer: ReturnType<typeof setTimeout> | undefined;
const cues = new Map<SoundName, Promise<AudioBuffer | null>>();

const ignore = () => {};

export function soundState(): SoundState {
  if (muted) return 'muted';
  return unlocked ? 'playing' : 'locked';
}

export function ambienceState(): AmbienceState {
  return unlocked && !muted && !videoPlaying && document.visibilityState === 'visible' ? 'playing' : 'paused';
}

function report() {
  document.documentElement.setAttribute('data-sound', soundState());
  document.documentElement.setAttribute('data-ambience', ambienceState());
}

// The AudioContext, created on the first gesture.
function audio(): AudioContext | undefined {
  if (!context) {
    try {
      context = new AudioContext();
    } catch {
      // No Web Audio: the Ambience falls back to a plain audio element, and Cues stay silent.
    }
  }
  if (context && context.state !== 'running') context.resume().catch(ignore);
  return context;
}

function fade(gain: GainNode, to: number, seconds: number) {
  const now = gain.context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(to, now + seconds);
}

function createAmbience(src: string) {
  const element = new Audio();
  element.loop = true;
  element.preload = 'auto';
  element.src = src;
  const ctx = audio();
  if (!ctx) {
    element.volume = AMBIENCE_VOLUME;
    return { element };
  }
  // Routed through a gain node: iOS ignores an audio element's own volume.
  const gain = ctx.createGain();
  gain.gain.value = 0;
  ctx.createMediaElementSource(element).connect(gain).connect(ctx.destination);
  return { element, gain };
}

// Plays the Ambience while the visitor has made a gesture, sound is on, the tab is showing and no video is
// playing; pauses it otherwise. Pausing keeps its place, so it resumes where it left off.
function updateAmbience() {
  report();
  const shouldPlay = ambienceState() === 'playing' && files.ambience;
  if (shouldPlay) {
    // Also wakes the AudioContext, which some browsers suspend while the tab is hidden.
    audio();
    ambience ??= createAmbience(files.ambience!);
    clearTimeout(pauseTimer);
    const { element, gain } = ambience;
    if (element.paused) element.play().catch(ignore);
    if (gain) fade(gain, AMBIENCE_VOLUME, FADE_IN_SECONDS);
  } else if (ambience && !ambience.element.paused) {
    const { element, gain } = ambience;
    if (gain) fade(gain, 0, FADE_OUT_SECONDS);
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => element.pause(), gain ? FADE_OUT_SECONDS * 1000 : 0);
  }
}

// Fetches and decodes a Cue once. A file that fails to load or decode resolves to null and stays silent.
function loadCue(name: SoundName): Promise<AudioBuffer | null> {
  let buffer = cues.get(name);
  if (!buffer) {
    const src = files[name];
    const ctx = audio();
    buffer =
      src && ctx
        ? fetch(src)
            .then((response) => (response.ok ? response.arrayBuffer() : null))
            .then((data) => (data ? ctx.decodeAudioData(data) : null))
            .catch(() => null)
        : Promise.resolve(null);
    cues.set(name, buffer);
  }
  return buffer;
}

// Called from inside a gesture: a click, a key press, or the end of the Intro. Safe to call any number of
// times; each call also retries starting the audio, in case the browser didn't count an earlier gesture.
export function unlockSound() {
  if (!started) return;
  unlocked = true;
  audio();
  for (const name of ['cue-link', 'cue-theme', 'cue-chatbot'] as const) if (files[name]) loadCue(name);
  updateAmbience();
}

// Plays a short Cue for one action: its file if there is one, otherwise the generated one.
// Silent while locked, muted or hidden.
export function playCue(cue: CueName) {
  const name: SoundName = `cue-${cue}`;
  if (!started || !unlocked || muted || document.visibilityState !== 'visible') return;
  const ctx = audio();
  if (!ctx) return;
  if (!files[name]) {
    generatedCues[cue](ctx, ctx.destination, read('theme'));
    return;
  }
  const requested = performance.now();
  loadCue(name).then((buffer) => {
    if (!buffer || muted || performance.now() - requested > CUE_LATENESS_MS) return;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = CUE_VOLUME;
    source.connect(gain).connect(ctx.destination);
    source.start();
  });
}

function setMuted(value: boolean) {
  muted = value;
  updateAmbience();
}

// A video started (true) or its player left the page (false). The Ambience pauses while one plays, so the two
// never sound over each other.
export function setVideoPlaying(value: boolean) {
  videoPlaying = value;
  updateAmbience();
}

// Starts the engine once per visit. `available` lists the sound files the build found.
export function startSound(available: SoundFiles) {
  if (started) return;
  started = true;
  files = available;
  muted = read('muted');
  report();

  subscribe('muted', setMuted);
  subscribe('theme', () => playCue('theme'));

  // The first click or key press unlocks sound. Listening in the capture phase on the window means this
  // runs before anything on the page handles the same event, so a link's Cue can play on that very click.
  // Escape doesn't count: browsers don't let it start audio.
  window.addEventListener('click', unlockSound, true);
  window.addEventListener('keydown', (event) => event.key !== 'Escape' && unlockSound(), true);

  document.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a[href]')) playCue('link');
  });

  document.addEventListener('visibilitychange', updateAmbience);

  // A client-side page change copies <html>'s attributes from the new page, which always says "locked",
  // so the real state is put back straight after the swap, before the new page paints.
  document.addEventListener('astro:after-swap', report);
}
