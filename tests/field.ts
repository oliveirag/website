import type { Page } from './fixtures';

// Everything painted over the Field band, found two ways:
// - geometry: each element's box, cut down to what its scrolling ancestors let show;
// - hit testing: what the browser finds at points across the band.
// Clipped boxes matter because an element scrolled out of the Sky still reports its full box.
export async function contentOverField(page: Page) {
  return page.evaluate(() => {
    const band = document.getElementById('field')!.getBoundingClientRect();
    const isScene = (el: Element) => el.closest('#field, .field-sky') !== null;
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} "${(el.textContent ?? '').trim().slice(0, 30)}"`;
    const offenders = new Set<string>();

    // The area an element's ancestors let it paint in: cut by every clipping ancestor, up to a fixed one.
    type Area = { top: number; bottom: number; left: number; right: number };
    const everywhere: Area = { top: -Infinity, bottom: Infinity, left: -Infinity, right: Infinity };
    const areas = new Map<Element, Area>();
    const areaInside = (parent: Element | null): Area => {
      if (!parent || parent === document.body) return everywhere;
      const known = areas.get(parent);
      if (known) return known;
      const style = getComputedStyle(parent);
      let area = style.position === 'fixed' ? everywhere : areaInside(parent.parentElement);
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
        const clip = parent.getBoundingClientRect();
        area = {
          top: Math.max(area.top, clip.top),
          bottom: Math.min(area.bottom, clip.bottom),
          left: Math.max(area.left, clip.left),
          right: Math.min(area.right, clip.right),
        };
      }
      areas.set(parent, area);
      return area;
    };

    for (const el of document.body.querySelectorAll('*')) {
      if (isScene(el) || ['SCRIPT', 'STYLE', 'TEMPLATE'].includes(el.tagName)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden') continue;
      const area = style.position === 'fixed' ? everywhere : areaInside(el.parentElement);
      const top = Math.max(rect.top, area.top), bottom = Math.min(rect.bottom, area.bottom);
      const left = Math.max(rect.left, area.left), right = Math.min(rect.right, area.right);
      const overlaps = Math.min(bottom, band.bottom) - Math.max(top, band.top) > 0.5 &&
        Math.min(right, band.right) - Math.max(left, band.left) > 0.5;
      if (overlaps) offenders.add(describe(el));
    }

    for (let y = band.top + 1; y < band.bottom; y += 30) {
      for (let x = 1; x < band.right; x += 30) {
        for (const el of document.elementsFromPoint(x, y)) {
          if (el !== document.documentElement && el !== document.body && !isScene(el)) offenders.add(describe(el));
        }
      }
    }
    return [...offenders];
  });
}
