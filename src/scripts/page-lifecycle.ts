// Pages change through Astro's client router, so a bundled script runs once, but the page it set up can be
// swapped out under it. onEveryPage runs `setup` for the page that is showing now and again after every
// navigation, once per page. If `setup` returns a function, that runs just before the page is swapped out.
//
// Each navigation brings a new <body>, so "once per page" means once per body. On the first full load the
// script runs before astro:page-load fires (that waits for the window load event), so it sets up at once.
type Setup = () => void | (() => void);

export function onEveryPage(setup: Setup) {
  const done = new WeakSet<HTMLElement>();
  let cleanup: (() => void) | undefined;

  const run = () => {
    if (done.has(document.body)) return;
    done.add(document.body);
    cleanup = setup() || undefined;
  };

  document.addEventListener('astro:before-swap', () => {
    cleanup?.();
    cleanup = undefined;
  });
  document.addEventListener('astro:page-load', run);
  run();
}
