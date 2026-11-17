// The phone menu: the menu button opens and closes it, and it closes on Escape (handing focus back to the
// button), on following a link, on a click outside and when focus moves out of it.
// The navigation is replaced on every page change, so these listeners sit on the document and look the
// navigation up each time. They are added once.

const currentNav = () => document.querySelector<HTMLElement>('.site-nav');

function setOpen(nav: HTMLElement, open: boolean) {
  nav.dataset.open = String(open);
  nav.querySelector('.nav-menu-button')?.setAttribute('aria-expanded', String(open));
}

let following = false;

export function followMenu() {
  if (following) return;
  following = true;

  document.addEventListener('click', (event) => {
    const nav = currentNav();
    const target = event.target instanceof Element ? event.target : null;
    if (!nav || !target) return;
    if (target.closest('.nav-menu-button')) setOpen(nav, nav.dataset.open !== 'true');
    else if (target.closest('.nav-links a') || !nav.contains(target)) setOpen(nav, false);
  });

  document.addEventListener('keydown', (event) => {
    const nav = currentNav();
    if (event.key !== 'Escape' || nav?.dataset.open !== 'true') return;
    setOpen(nav, false);
    nav.querySelector<HTMLElement>('.nav-menu-button')?.focus();
  });

  document.addEventListener('focusout', (event) => {
    const nav = currentNav();
    const next = event.relatedTarget;
    if (nav?.dataset.open === 'true' && next instanceof Node && !nav.contains(next)) setOpen(nav, false);
  });
}
