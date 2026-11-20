// The Section pill on a Thoughts post (SectionPill.astro). As the Sky scrolls, it names the section being read: the
// last section heading to pass a line a third of the way down the Sky, or "Introduction" above the first one. At the
// very end of a post, a last section too short to reach that line still counts once its heading is on screen. Its
// ring fills with how far the post has been read.
// The list follows the menu button pattern, as the Post menu does: Enter, Space or a click opens it on the current
// section, Down on its first item and Up on its last; the arrows, Home and End move through it; Escape, Tab or a click
// outside closes it and puts focus back on the pill. Choosing a section scrolls the Sky to it (at once with reduced
// motion), closes the list and moves focus to that heading, so a screen reader reads on from there.

// Space between the list and the Sky's top edge.
const GAP = 8;
// How far down the Sky a heading must reach to start its section.
const READING_LINE = 1 / 3;

export function setUpSectionPill() {
  const pill = document.getElementById('section-pill') as HTMLButtonElement | null;
  const list = document.getElementById('section-list');
  const sky = document.getElementById('sky');
  if (!pill || !list || !sky) return;

  const label = pill.querySelector<HTMLElement>('[data-section-label]')!;
  const progress = pill.querySelector<SVGCircleElement>('.section-pill-progress')!;
  const items = [...list.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
  // Item 0 is the Introduction; the others match the headings one for one.
  const headings = items.slice(1).map((item) => document.getElementById(item.dataset.section!));
  if (headings.some((heading) => !heading)) return;
  const names = items.map((item) => item.querySelector('.section-list-name')!.textContent!.trim());
  const listening = new AbortController();
  const { signal } = listening;

  let current = -1;
  let frame = 0;

  const isOpen = () => !list.hidden;

  // The index of the item being read: 0 for the Introduction, i for the i-th heading.
  const reading = () => {
    const area = sky.getBoundingClientRect();
    const line = area.top + area.height * READING_LINE;
    let at = 0;
    headings.forEach((heading, i) => {
      if (heading!.getBoundingClientRect().top <= line) at = i + 1;
    });
    const atEnd = sky.scrollTop + sky.clientHeight >= sky.scrollHeight - 2;
    if (atEnd && sky.scrollTop > 0) {
      const fade = parseFloat(getComputedStyle(sky).paddingBottom);
      headings.forEach((heading, i) => {
        if (heading!.getBoundingClientRect().top < area.bottom - fade) at = Math.max(at, i + 1);
      });
    }
    return at;
  };

  const update = () => {
    frame = 0;
    const scrollable = sky.scrollHeight - sky.clientHeight;
    const read = scrollable > 0 ? Math.min(1, sky.scrollTop / scrollable) : 1;
    progress.setAttribute('stroke-dashoffset', String(Math.round((1 - read) * 100)));

    const at = reading();
    if (at === current) return;
    current = at;
    label.textContent = names[at];
    pill.setAttribute('aria-label', `Show post sections. Current section: ${names[at]}`);
    items.forEach((item, i) => {
      if (i === at) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    });
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  // The list stops at the Sky's top edge and scrolls inside past that.
  const place = () => {
    const room = pill.getBoundingClientRect().top - GAP - sky.getBoundingClientRect().top - GAP;
    list.style.maxHeight = `${Math.max(120, room)}px`;
  };

  const focusItem = (index: number) => items[(index + items.length) % items.length].focus();

  function open(focusAt: 'current' | 'first' | 'last') {
    update();
    list.hidden = false;
    pill.setAttribute('aria-expanded', 'true');
    place();
    focusItem(focusAt === 'first' ? 0 : focusAt === 'last' ? items.length - 1 : current);
  }

  function close(returnFocus = true) {
    if (!isOpen()) return;
    list.hidden = true;
    pill.setAttribute('aria-expanded', 'false');
    if (returnFocus) pill.focus({ preventScroll: true });
  }

  function jumpTo(index: number) {
    close(false);
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    const heading = headings[index - 1];
    if (!heading) {
      sky.scrollTo({ top: 0, behavior });
      pill.focus({ preventScroll: true });
      return;
    }
    // The heading lands just under the Sky's top fade, where an anchor link would put it.
    const inset = parseFloat(getComputedStyle(sky).scrollPaddingTop) || 0;
    const top = sky.scrollTop + heading.getBoundingClientRect().top - sky.getBoundingClientRect().top - inset;
    sky.scrollTo({ top, behavior });
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }

  pill.addEventListener('click', () => (isOpen() ? close() : open('current')), { signal });
  pill.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      open(event.key === 'ArrowDown' ? 'first' : 'last');
    },
    { signal },
  );

  list.addEventListener(
    'keydown',
    (event) => {
      const at = items.indexOf(document.activeElement as HTMLButtonElement);
      switch (event.key) {
        case 'ArrowDown':
          focusItem(at + 1);
          break;
        case 'ArrowUp':
          focusItem(at - 1);
          break;
        case 'Home':
          focusItem(0);
          break;
        case 'End':
          focusItem(items.length - 1);
          break;
        case 'Escape':
          close();
          break;
        case 'Tab':
          // Focus goes back to the pill, and Tab carries on from there.
          close();
          return;
        default:
          return;
      }
      // Stops the Sky's own keyboard scrolling (scripts/sky.ts) from moving the post behind the list.
      event.preventDefault();
    },
    { signal },
  );

  list.addEventListener(
    'click',
    (event) => {
      const item = (event.target as Element).closest<HTMLButtonElement>('[role="menuitem"]');
      if (item) jumpTo(items.indexOf(item));
    },
    { signal },
  );

  // A click anywhere else closes the list, the Post menu's button included.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Node;
      if (isOpen() && !list.contains(target) && !pill.contains(target)) close();
    },
    { capture: true, signal },
  );

  sky.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', () => (schedule(), isOpen() && place()), { signal });
  // The post's height changes as its fonts and images load.
  const resized = new ResizeObserver(schedule);
  for (const child of sky.children) resized.observe(child);

  update();
  return () => {
    listening.abort();
    resized.disconnect();
    cancelAnimationFrame(frame);
  };
}
