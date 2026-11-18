import type { Page } from './fixtures';
import { type Rgba, rgbaFromHex, contrastRatio, compositeOver, formatRatio } from './contrast';

// Text on the sky, for the contrast tests. Content scrolls from the top of the sky down to just above the
// horizon, so text on the sky is checked against both ends; text on a card, button or other surface is on
// that surface's colour instead. Contrast can't be observed without reading canvas pixels, which the tests
// never do, so this reads the computed colours a visitor sees and the sky's two end colours from the custom
// properties the Field paints with. A throwaway probe confirmed the WebGL scene draws exactly those colours.
const AA = 4.5;

export type Found = {
  text: string;
  /** Every colour the text is drawn in: one, or the stops (and blends between them) of a gradient fill. */
  colours: Rgba[];
  /** Translucent backgrounds between the text and the sky, innermost first. */
  overlays: Rgba[];
  /** An opaque background the text sits on instead of the sky, if any. */
  surface: Rgba | null;
};

export async function findText(page: Page): Promise<Found[]> {
  return page.evaluate(() => {
    const parse = (c: string): [number, number, number, number] => {
      const v = c.match(/[\d.]+/g)!.map(Number);
      return [v[0], v[1], v[2], v[3] ?? 1];
    };
    const found: Found[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || seen.has(element) || !node.textContent!.trim()) continue;
      seen.add(element);
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      // Skip what a visitor can't see: hidden, collapsed, or visually hidden for screen readers only.
      // Text hidden from assistive tech but drawn on screen (the sound control's "on") still counts.
      if (style.visibility !== 'visible' || box.width <= 1 || box.height <= 1) continue;
      if (element.closest('script, style, noscript, #intro')) continue;

      let opacity = 1;
      const overlays: [number, number, number, number][] = [];
      let surface: [number, number, number, number] | null = null;
      let onCard = false;
      for (let at: Element | null = element; at && at !== document.body; at = at.parentElement) {
        const s = getComputedStyle(at);
        opacity *= Number(s.opacity);
        const textFill = s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text';
        if (s.backgroundImage !== 'none' && !textFill) {
          onCard = true;
          break;
        }
        const bg = parse(s.backgroundColor);
        if (bg[3] >= 1) {
          surface = bg;
          break;
        }
        if (bg[3] > 0) overlays.push(bg);
      }
      if (onCard) continue;

      let colours: [number, number, number, number][];
      const fill = style.webkitTextFillColor;
      if ((style.backgroundClip === 'text' || style.webkitBackgroundClip === 'text') && parse(fill)[3] === 0) {
        const stops = (style.backgroundImage.match(/rgba?\([^)]*\)/g) ?? []).map(parse);
        colours = [];
        stops.forEach((stop, i) => {
          colours.push(stop);
          const next = stops[i + 1];
          // A blend can be darker or lighter than both its ends, so check the steps between stops too.
          if (next) for (const t of [0.25, 0.5, 0.75]) colours.push(stop.map((v, k) => v + (next[k] - v) * t) as typeof stop);
        });
      } else {
        colours = [parse(style.color)];
      }
      colours = colours.map(([r, g, b, a]) => [r, g, b, a * opacity]);
      found.push({ text: node.textContent!.trim().replace(/\s+/g, ' ').slice(0, 48), colours, overlays, surface });
    }
    return found;
  });
}

async function skyEnds(page: Page) {
  const [top, horizon] = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return [root.getPropertyValue('--sky-top'), root.getPropertyValue('--sky-horizon')];
  });
  return { top: rgbaFromHex(top), horizon: rgbaFromHex(horizon) };
}

// Every piece of text below 4.5:1 at either end of the sky (or on its surface), and a row per piece of text
// with its worst ratios, for printing with PRINT_CONTRAST=1.
export async function textBelowAA(page: Page) {
  const sky = await skyEnds(page);
  const found = await findText(page);
  const failures: string[] = [];
  const rows: string[] = [];
  for (const { text, colours, overlays, surface } of found) {
    const backgrounds = surface
      ? { surface }
      : {
          top: overlays.reduceRight((under, layer) => compositeOver(layer, under), sky.top),
          horizon: overlays.reduceRight((under, layer) => compositeOver(layer, under), sky.horizon),
        };
    const worst = Object.entries(backgrounds).map(([where, bg]) => [where, Math.min(...colours.map((c) => contrastRatio(c, bg)))] as const);
    rows.push(`${text} | ${worst.map(([where, r]) => `${where} ${formatRatio(r)}`).join(' | ')}`);
    for (const [where, r] of worst) if (r < AA) failures.push(`"${text}" is ${formatRatio(r)}:1 at the ${where}`);
  }
  return { found, failures, rows };
}
