// Cues generated in code with Web Audio, used for any Cue that has no file in public/sounds/.
// Nothing is downloaded: each one is built from noise or a few tones at the moment it plays.
// The levels are the ones picked by ear, played at full volume.
import type { Theme } from './preferences';

export type CueName = 'link' | 'theme' | 'chatbot';

type Play = (ctx: AudioContext, destination: AudioNode, theme: Theme) => void;

// A short tone that rises in 5ms and dies away over `seconds`.
function tone(ctx: AudioContext, destination: AudioNode, frequency: number, peak: number, seconds: number, at: number, type: OscillatorType) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  oscillator.connect(gain).connect(destination);
  oscillator.start(at);
  oscillator.stop(at + seconds + 0.02);
}

export const generatedCues: Record<CueName, Play> = {
  // A soft tick: 8ms of noise that dies away fast, through a band-pass filter around 3.5kHz.
  link(ctx, destination) {
    const buffer = ctx.createBuffer(1, Math.ceil(0.008 * ctx.sampleRate), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / 40);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 3500;
    filter.Q.value = 3;
    gain.gain.value = 0.9;
    source.connect(filter).connect(gain).connect(destination);
    source.start();
  },

  // A two-note chime, E5 and B5: it rises when Day comes on and falls when Night does.
  theme(ctx, destination, theme) {
    const at = ctx.currentTime + 0.01;
    const [first, second] = theme === 'day' ? [659.25, 987.77] : [987.77, 659.25];
    tone(ctx, destination, first, first < second ? 0.35 : 0.3, 0.18, at, 'triangle');
    tone(ctx, destination, second, first < second ? 0.3 : 0.35, 0.25, at + 0.09, 'triangle');
  },

  // Two soft notes, G5 then C6, for a message sent.
  chatbot(ctx, destination) {
    const at = ctx.currentTime + 0.01;
    tone(ctx, destination, 783.99, 0.4, 0.12, at, 'sine');
    tone(ctx, destination, 1046.5, 0.35, 0.2, at + 0.08, 'sine');
  },
};
