// The Sky's behaviour: the scroll hint, and keyboard scrolling.

// Shows the hint while the Sky can scroll and the visitor has not scrolled it yet.
function followHint(sky: HTMLElement, hint: HTMLElement) {
  let scrolled = false;

  const update = () => {
    const canScroll = sky.scrollHeight - sky.clientHeight > 1;
    hint.dataset.shown = String(canScroll && !scrolled);
  };

  sky.addEventListener(
    'scroll',
    () => {
      if (sky.scrollTop > 0) scrolled = true;
      update();
    },
    { passive: true },
  );

  // The content's height changes as data loads and tabs switch, and the Sky's with the viewport.
  const resized = new ResizeObserver(update);
  resized.observe(sky);
  for (const child of sky.children) resized.observe(child);

  update();
}

const editable = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const pressable = 'a[href], button, summary, [role="button"], [role="tab"], [role="link"], [role="checkbox"], [role="switch"]';

// The browser scrolls the Sky by keyboard only when focus is inside it. With nothing focused, or with focus
// on a control outside it (the theme toggle), the keys would scroll the page, which does not scroll.
// So those keys scroll the Sky here, the way the browser would.
function scrollByKeyboard(sky: HTMLElement) {
  const line = 40;
  const page = () => {
    const style = getComputedStyle(sky);
    const clear = sky.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    return Math.max(line, clear);
  };

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
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
        by = page();
        break;
      case 'PageUp':
        by = -page();
        break;
      case ' ':
        if (target?.closest(pressable)) return;
        by = event.shiftKey ? -page() : page();
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

export function followSky(sky: HTMLElement, hint: HTMLElement) {
  followHint(sky, hint);
  scrollByKeyboard(sky);
}
