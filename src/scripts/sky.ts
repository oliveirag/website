// The Sky's behaviour: the scroll hint, and keyboard scrolling.
// Every page change brings a new Sky (scrolled to the top) and a new hint, so the hint is set up again for
// each page, and the keyboard handler looks the Sky up when a key is pressed.
import { onEveryPage } from './page-lifecycle';

// Shows the hint while the Sky can scroll and the visitor has not scrolled it yet.
// Returns a function that stops following them.
function followHint(sky: HTMLElement, hint: HTMLElement) {
  let scrolled = false;

  const update = () => {
    const canScroll = sky.scrollHeight - sky.clientHeight > 1;
    hint.dataset.shown = String(canScroll && !scrolled);
  };

  const onScroll = () => {
    if (sky.scrollTop > 0) scrolled = true;
    update();
  };
  sky.addEventListener('scroll', onScroll, { passive: true });

  // The content's height changes as data loads, and the Sky's with the viewport.
  const resized = new ResizeObserver(update);
  resized.observe(sky);
  for (const child of sky.children) resized.observe(child);

  update();
  return () => {
    resized.disconnect();
    sky.removeEventListener('scroll', onScroll);
  };
}

const editable = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const pressable = 'a[href], button, summary, [role="button"], [role="tab"], [role="link"], [role="checkbox"], [role="switch"]';

// The browser scrolls the Sky by keyboard only when focus is inside it. With nothing focused, or with focus
// on a control outside it (the theme toggle), the keys would scroll the page, which does not scroll.
// So those keys scroll the Sky here, the way the browser would.
function scrollByKeyboard() {
  const line = 40;
  const page = (sky: HTMLElement) => {
    const style = getComputedStyle(sky);
    const clear = sky.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    return Math.max(line, clear);
  };

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const sky = document.getElementById('sky');
    if (!sky) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target && (sky.contains(target) || target.closest(editable))) return;

    let top: number | undefined;
    let by: number | undefined;
    switch (event.key) {
      case 'ArrowDown':
        by = line;
        break;
      case 'ArrowUp':
        by = -line;
        break;
      case 'PageDown':
        by = page(sky);
        break;
      case 'PageUp':
        by = -page(sky);
        break;
      case ' ':
        if (target?.closest(pressable)) return;
        by = event.shiftKey ? -page(sky) : page(sky);
        break;
      case 'Home':
        top = 0;
        break;
      case 'End':
        top = sky.scrollHeight;
        break;
      default:
        return;
    }

    event.preventDefault();
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (top !== undefined) sky.scrollTo({ top, behavior });
    else sky.scrollBy({ top: by, behavior });
  });
}

let following = false;

export function followSky() {
  if (following) return;
  following = true;
  scrollByKeyboard();
  onEveryPage(() => {
    const sky = document.getElementById('sky');
    const hint = document.getElementById('scroll-hint');
    if (sky && hint) return followHint(sky, hint);
  });
}
