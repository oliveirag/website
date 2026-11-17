// The Intro: on the first visit to Home in a browser session, the name grows flowers full screen until the
// visitor clicks, taps or presses a key. Ending it marks the Intro seen, starts the sound and shows Home with
// keyboard focus on its heading.
//
// <html data-intro> drives it: "showing" while it covers the page, "leaving" while it fades out, and absent
// otherwise. The head script sets "showing" before first paint on a full load (introBeforePaintScript in
// preferences.ts), and followIntro sets it after a client-side change to Home.
import { read, write } from './preferences';
import { unlockSound } from './sound';

const HOME = '/';
const FADE_MS = 400;
const REDUCED_FADE_MS = 150;
// A tap's follow-up mouse events and click arrive after the finger lifts. The Intro keeps catching them for
// this long at most, so they can't land on Home under it.
const POINTER_SETTLE_MS = 1000;

const root = () => document.documentElement;

export function introPending(pathname = location.pathname) {
  return pathname === HOME && !read('introSeen');
}

// A client-side page change copies <html>'s attributes from the new page, which never marks the Intro, so
// a first arrival at Home this way is marked straight after the swap, before the new page paints.
export function followIntro() {
  document.addEventListener('astro:after-swap', () => {
    if (introPending()) root().setAttribute('data-intro', 'showing');
  });
}

// The real page heading with the name, which takes focus when the Intro ends.
function homeHeading() {
  const heading = document.querySelector<HTMLElement>('#sky h1');
  if (heading && !heading.hasAttribute('tabindex')) heading.tabIndex = -1;
  heading?.setAttribute('data-intro-focus', '');
  return heading;
}

// Bloom Type is loaded only for a visitor who sees the Intro, and only after the first paint.
function loadBloom(stage: HTMLElement, isEnded: () => boolean): () => void {
  let unmount: (() => void) | undefined;
  let cancelled = false;
  const frame = requestAnimationFrame(() => {
    setTimeout(() => {
      if (cancelled || isEnded()) return;
      import('../components/IntroBloom')
        .then(({ mountIntroBloom }) => {
          if (!cancelled) unmount = mountIntroBloom(stage);
        })
        .catch(() => {
          // No drawing: the Intro still shows its sky, hint and skip control, and ends the same way.
        });
    }, 0);
  });
  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
    unmount?.();
  };
}

// Runs the Intro shown in `intro`. Returns a function that tears it down without ending it.
export function startIntro(intro: HTMLElement): () => void {
  const stage = intro.querySelector<HTMLElement>('[data-intro-stage]');
  const skip = intro.querySelector<HTMLButtonElement>('[data-intro-skip]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fadeMs = reduced ? REDUCED_FADE_MS : FADE_MS;
  intro.style.setProperty('--intro-fade', `${fadeMs}ms`);

  let ended = false;
  let fadeDone = false;
  let pointerDone = true;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  const unloadBloom = stage ? loadBloom(stage, () => ended) : () => {};

  const finish = () => {
    if (!fadeDone || !pointerDone) return;
    teardown();
    if (root().getAttribute('data-intro') === 'leaving') root().removeAttribute('data-intro');
  };

  const settlePointer = () => {
    clearTimeout(settleTimer);
    pointerDone = true;
    finish();
  };

  const onPointerUp = () => {
    settleTimer = setTimeout(settlePointer, POINTER_SETTLE_MS);
  };

  const end = (byPointer: boolean) => {
    if (ended) return;
    ended = true;
    write('introSeen', true);
    unlockSound();
    homeHeading()?.focus({ preventScroll: true });
    root().setAttribute('data-intro', 'leaving');
    if (byPointer) {
      pointerDone = false;
      intro.addEventListener('click', settlePointer, { once: true });
      intro.addEventListener('pointercancel', settlePointer, { once: true });
      intro.addEventListener('pointerup', onPointerUp, { once: true });
    }
    fadeTimer = setTimeout(() => {
      fadeDone = true;
      finish();
    }, fadeMs);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    end(true);
  };
  // Clicking would move focus to the Intro itself after the heading took it.
  const onMouseDown = (event: MouseEvent) => event.preventDefault();
  // Any key ends the Intro, and does only that. Browser shortcuts (with Ctrl, Alt or Cmd) are left alone.
  const onKeyDown = (event: KeyboardEvent) => {
    if (ended || event.ctrlKey || event.altKey || event.metaKey) return;
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
    clearTimeout(settleTimer);
    clearTimeout(fadeTimer);
    intro.removeEventListener('pointerdown', onPointerDown);
    intro.removeEventListener('mousedown', onMouseDown);
    intro.removeEventListener('click', settlePointer);
    intro.removeEventListener('pointercancel', settlePointer);
    intro.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('keydown', onKeyDown, true);
    skip?.removeEventListener('click', onSkip);
    unloadBloom();
  }

  return teardown;
}
