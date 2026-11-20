// The Post menu on a Thoughts post (PostMenu.astro, opened by PostMenuButton.astro). It follows the menu button
// pattern: Enter, Space or Down opens it on its first item and Up on its last; the arrows, Home and End move through
// it; Escape, Tab or a click outside closes it and puts focus back on the button. Copies confirm in place for a
// moment and are announced. Share Quote works on the text selected in the post, and is greyed out without any.
import { quoteLink } from './text-fragment';

const CONFIRM_MS = 1500;
// Space between the button and the menu, and between the menu and the screen's edges.
const GAP = 8;
const EDGE = 16;
const SELECT_FIRST = 'Select text in the post first';

export function setUpPostMenu() {
  const button = document.getElementById('post-menu-button') as HTMLButtonElement | null;
  const menu = document.getElementById('post-menu');
  const status = document.getElementById('post-menu-status');
  const sky = document.getElementById('sky');
  const post = document.querySelector<HTMLElement>('[data-post-body]');
  if (!button || !menu || !status || !sky || !post) return;

  const url = menu.dataset.url!;
  const markdownPath = menu.dataset.markdown!;
  const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  const shareQuote = menu.querySelector<HTMLElement>('[data-action="share-quote"]')!;
  const descriptionOf = (item: HTMLElement) => item.querySelector<HTMLElement>('[data-description]')!;
  const listening = new AbortController();
  const { signal } = listening;
  const timers = new Map<HTMLElement, number>();

  // The text selected in the post. A tap on the button can clear the selection before the menu opens, so the last
  // one is kept while the button is being pressed and while the menu is open.
  let quote = '';
  let pressing = false;
  // The Markdown copy, fetched when the menu opens. Safari only lets a click copy straight away, so Copy Page must
  // not wait for a download it hasn't started yet.
  let markdown: Promise<string> | undefined;
  let markdownText: string | undefined;

  const isOpen = () => !menu.hidden;

  const selectedInPost = () => {
    const selection = document.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return '';
    if (!post.contains(selection.getRangeAt(0).commonAncestorContainer)) return '';
    return selection.toString().trim();
  };

  const resetDescriptions = () => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    for (const item of items) {
      const description = descriptionOf(item);
      description.textContent = description.dataset.description!;
    }
    const hasQuote = Boolean(quote);
    shareQuote.setAttribute('aria-disabled', String(!hasQuote));
    if (!hasQuote) descriptionOf(shareQuote).textContent = SELECT_FIRST;
  };

  const place = () => {
    const at = button.getBoundingClientRect();
    const area = sky.getBoundingClientRect();
    // Once the button scrolls out of the Sky, the menu has nothing to hang from.
    if (at.bottom < area.top || at.top > area.bottom) {
      close();
      return;
    }
    const top = at.bottom + GAP;
    menu.style.top = `${top}px`;
    menu.style.left = `${Math.max(EDGE, at.right - menu.offsetWidth)}px`;
    // It stops at the Sky's bottom edge and scrolls inside past that, so it never covers the grass.
    menu.style.maxHeight = `${Math.max(120, area.bottom - top - GAP)}px`;
  };

  const focusItem = (index: number) => items[(index + items.length) % items.length].focus();

  function open(focusAt: 'first' | 'last') {
    quote = selectedInPost() || quote;
    resetDescriptions();
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    place();
    focusItem(focusAt === 'first' ? 0 : items.length - 1);
    if (!markdown) {
      markdown = fetch(markdownPath).then((response) => {
        if (!response.ok) throw new Error(`${markdownPath} answered ${response.status}`);
        return response.text();
      });
      markdown.then(
        (text) => (markdownText = text),
        () => (markdown = undefined),
      );
    }
  }

  function close() {
    if (!isOpen()) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.focus({ preventScroll: true });
    if (!selectedInPost()) quote = '';
    resetDescriptions();
  }

  async function write(text: string | Promise<string>) {
    if (typeof text === 'string') return navigator.clipboard.writeText(text);
    if (typeof ClipboardItem !== 'undefined') {
      const blob = text.then((value) => new Blob([value], { type: 'text/plain' }));
      return navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
    }
    return navigator.clipboard.writeText(await text);
  }

  async function copy(item: HTMLElement, text: string | Promise<string>, announcement: string) {
    const description = descriptionOf(item);
    let said: string;
    try {
      await write(text);
      said = 'Copied';
      status.textContent = announcement;
    } catch {
      said = 'Could not copy';
      status.textContent = 'Could not copy';
    }
    if (!isOpen()) return;
    description.textContent = said;
    clearTimeout(timers.get(item));
    timers.set(
      item,
      window.setTimeout(() => {
        description.textContent = description.dataset.description!;
        timers.delete(item);
      }, CONFIRM_MS),
    );
  }

  button.addEventListener('pointerdown', () => (pressing = true), { signal });
  button.addEventListener('pointercancel', () => (pressing = false), { signal });
  button.addEventListener(
    'click',
    () => {
      pressing = false;
      if (isOpen()) close();
      else open('first');
    },
    { signal },
  );
  button.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      open(event.key === 'ArrowDown' ? 'first' : 'last');
    },
    { signal },
  );

  menu.addEventListener(
    'keydown',
    (event) => {
      const at = items.indexOf(document.activeElement as HTMLElement);
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
          // Focus goes back to the button, and Tab carries on from there.
          close();
          return;
        case ' ':
          // A link has no Space key of its own; a button does.
          if (!(document.activeElement instanceof HTMLAnchorElement)) return;
          document.activeElement.click();
          break;
        default:
          return;
      }
      event.preventDefault();
    },
    { signal },
  );

  menu.addEventListener(
    'click',
    (event) => {
      const item = (event.target as Element).closest<HTMLElement>('[role="menuitem"]');
      if (!item) return;
      // The browser opens a link's new tab itself.
      if (item instanceof HTMLAnchorElement) return close();
      switch (item.dataset.action) {
        case 'copy-link':
          return copy(item, url, 'Link copied');
        case 'copy-page':
          return copy(item, markdownText ?? markdown ?? fetch(markdownPath).then((r) => r.text()), 'Page copied as Markdown');
        case 'share-quote': {
          const link = quote && quoteLink(url, quote);
          if (item.getAttribute('aria-disabled') === 'true' || !link) return;
          return copy(item, link, 'Quote link copied');
        }
      }
    },
    { signal },
  );

  // A click anywhere else closes the menu.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Node;
      if (isOpen() && !menu.contains(target) && !button.contains(target)) close();
    },
    { capture: true, signal },
  );

  document.addEventListener(
    'selectionchange',
    () => {
      const text = selectedInPost();
      if (text) quote = text;
      else if (!pressing && !isOpen()) quote = '';
    },
    { signal },
  );

  sky.addEventListener('scroll', () => isOpen() && place(), { passive: true, signal });
  window.addEventListener('resize', () => isOpen() && place(), { signal });

  return () => {
    listening.abort();
    for (const timer of timers.values()) clearTimeout(timer);
  };
}
