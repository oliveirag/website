// The Intro: on the first visit to Home in a browser session, the name grows flowers full screen until the
// visitor clicks, taps or presses a key. Ending it marks the Intro seen, starts the sound and turns it into Home,
// with keyboard focus on Home's heading: the flowers drift off, the name moves and scales into the heading and
// the Field rises from below the screen. Home takes input from the first moment of that move.
//
// <html data-intro> drives it: "showing" while it covers the page, "leaving" while it turns into Home, and absent
// otherwise. Only the head script sets "showing", before first paint on a full load of Home with no hash and
// the Intro not seen (introBeforePaintScript in preferences.ts). A client-side page change never brings it:
// the only link into Home is "projects", which points at a spot on the page.
import type { IntroDrawing } from '../components/IntroBloom';
import { flyNameHome, type Flight } from './intro-flight';
import { write } from './preferences';
import { unlockSound } from './sound';

export type IntroState = 'showing' | 'leaving';

// The whole move into Home. The name and the flowers take all of it, and so does the Field (see Intro.astro).
const LEAVE_MS = 900;
// The Intro's sky fades off Home a little sooner, so the page is readable before the name lands.
const FADE_MS = 700;
// Under reduced motion nothing travels: the Intro crossfades into Home.
const REDUCED_FADE_MS = 150;
// A tap's click arrives after the finger lifts, by which time Home is taking input. The click that belongs to
// the press that ended the Intro is swallowed if it comes within this long of the lift.
const POINTER_SETTLE_MS = 1000;

const root = () => document.documentElement;

export function introState(): IntroState | null {
  return root().getAttribute('data-intro') as IntroState | null;
}

function setIntroState(state: IntroState | null) {
  if (state) root().setAttribute('data-intro', state);
  else root().removeAttribute('data-intro');
}

// Moves keyboard focus to the real page heading with the name. It isn't a control, so it's made focusable
// from script only, and marked so it shows no focus ring.
function focusHomeHeading() {
  const heading = document.querySelector<HTMLElement>('#sky h1');
  if (!heading) return null;
  if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
  heading.setAttribute('data-intro-focus', '');
  heading.focus({ preventScroll: true });
  return heading;
}

// Bloom Type is loaded only for a visitor who sees the Intro, and only after the first paint.
function loadBloom(stage: HTMLElement, isEnded: () => boolean) {
  let drawing: IntroDrawing | undefined;
  let cancelled = false;
  const frame = requestAnimationFrame(() => {
    setTimeout(() => {
      if (cancelled || isEnded()) return;
      import('../components/IntroBloom')
        .then(({ mountIntroBloom }) => {
          // An Intro that ended while the drawing downloaded has nothing to draw for.
          if (!cancelled && !isEnded()) drawing = mountIntroBloom(stage);
        })
        .catch(() => {
          // No drawing: the Intro still shows its sky, hint and skip control, and ends the same way.
        });
    }, 0);
  });
  return {
    release: () => drawing?.release(),
    unload() {
      cancelled = true;
      cancelAnimationFrame(frame);
      drawing?.unmount();
    },
  };
}

// The press that ended the Intro mustn't also act on Home, which takes input as soon as the Intro starts to
// leave. Its mouse events are cancelled at the press, and the click that follows the lift is swallowed here.
// Any later click goes through.
function swallowTrailingClick() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    clearTimeout(timer);
    window.removeEventListener('click', swallow, true);
    window.removeEventListener('pointerup', settle, true);
    window.removeEventListener('pointercancel', stop, true);
  };
  const swallow = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    stop();
  };
  const settle = () => {
    clearTimeout(timer);
    timer = setTimeout(stop, POINTER_SETTLE_MS);
  };
  window.addEventListener('click', swallow, true);
  window.addEventListener('pointerup', settle, true);
  window.addEventListener('pointercancel', stop, true);
}

// The ease-out the move into Home travels on (Intro.astro).
const travelEasing = () => getComputedStyle(root()).getPropertyValue('--intro-travel-ease').trim() || 'ease-out';

// Runs the Intro shown in `intro`. Returns a function that tears it down without ending it.
export function startIntro(intro: HTMLElement): () => void {
  const stage = intro.querySelector<HTMLElement>('[data-intro-stage]');
  const skip = intro.querySelector<HTMLButtonElement>('[data-intro-skip]');
  const flightLayer = document.querySelector<HTMLElement>('[data-intro-flight]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fadeMs = reduced ? REDUCED_FADE_MS : FADE_MS;
  const leaveMs = reduced ? REDUCED_FADE_MS : LEAVE_MS;
  intro.style.setProperty('--intro-fade', `${fadeMs}ms`);

  let ended = false;
  let flight: Flight | null = null;
  let drift: Animation | undefined;
  let leaveTimer: ReturnType<typeof setTimeout> | undefined;
  const bloom = stage ? loadBloom(stage, () => ended) : { release() {}, unload() {} };

  // A scroll, a press, a key or a resize during the move puts the name in its place at once, since the heading
  // may be about to move under it. The fades and the Field carry on; none of them is in the way of input.
  const land = () => flight?.land();
  const moving = new AbortController();

  const finish = () => {
    teardown();
    if (introState() === 'leaving') setIntroState(null);
  };

  const end = (byPointer: boolean) => {
    if (ended) return;
    ended = true;
    write('introSeen', true);
    unlockSound();
    if (byPointer) swallowTrailingClick();
    const heading = focusHomeHeading();
    // Leaving shows the flight layer, so the name can be measured in it.
    setIntroState('leaving');
    if (!reduced && stage && flightLayer && heading) {
      flight = flyNameHome(stage, flightLayer, heading, {
        duration: leaveMs,
        easing: travelEasing(),
        ink: getComputedStyle(intro).color,
      });
      bloom.release();
      // The flowers rise away as they wither and fade with the cover.
      drift = stage.animate([{ transform: 'none' }, { transform: 'translateY(-12%) scale(1.06)' }], {
        duration: leaveMs,
        easing: travelEasing(),
        fill: 'forwards',
      });
    }
    const listen = { capture: true, passive: true, signal: moving.signal };
    for (const type of ['wheel', 'pointerdown', 'keydown', 'resize']) window.addEventListener(type, land, listen);
    document.getElementById('sky')?.addEventListener('scroll', land, listen);
    leaveTimer = setTimeout(finish, leaveMs);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    // No mouse events follow this press, so nothing on Home under it is pressed or focused.
    event.preventDefault();
    end(true);
  };
  // Clicking would move focus to the Intro itself after the heading took it.
  const onMouseDown = (event: MouseEvent) => event.preventDefault();
  // Any key ends the Intro, and does only that. Browser shortcuts (Cmd, or Ctrl without Alt) are left alone.
  // Ctrl with Alt is AltGr on Windows, which types characters, so it counts as a key.
  const onKeyDown = (event: KeyboardEvent) => {
    if (ended || event.metaKey || (event.ctrlKey && !event.altKey)) return;
    event.preventDefault();
    event.stopPropagation();
    end(false);
  };
  // For a click that comes without a pointer, such as a screen reader activating the button.
  const onSkip = () => end(false);

  intro.addEventListener('pointerdown', onPointerDown);
  intro.addEventListener('mousedown', onMouseDown);
  window.addEventListener('keydown', onKeyDown, true);
  skip?.addEventListener('click', onSkip);

  intro.focus({ preventScroll: true });

  function teardown() {
    clearTimeout(leaveTimer);
    flight?.land();
    drift?.cancel();
    intro.removeEventListener('pointerdown', onPointerDown);
    intro.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('keydown', onKeyDown, true);
    moving.abort();
    skip?.removeEventListener('click', onSkip);
    bloom.unload();
  }

  return teardown;
}
