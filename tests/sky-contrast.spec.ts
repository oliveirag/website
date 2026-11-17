import { test, expect, reply, type Page } from './fixtures';

// Every piece of text on Home that sits on the sky must reach 4.5:1 (WCAG AA) wherever it can be: content
// scrolls from the top of the sky down to just above the horizon, so it is checked against both ends.
// Text on a card, button or other surface is on that surface's colour instead.
const AA = 4.5;

type Rgba = [number, number, number, number];
type Found = {
  text: string;
  /** Every colour the text is drawn in: one, or the stops (and blends between them) of a gradient fill. */
  colours: Rgba[];
  /** Translucent backgrounds between the text and the sky, innermost first. */
  overlays: Rgba[];
  /** An opaque background the text sits on instead of the sky, if any. */
  surface: Rgba | null;
};

function channel(v: number) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const luminance = ([r, g, b]: Rgba) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const over = ([r, g, b, a]: Rgba, [R, G, B]: Rgba): Rgba => [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a), 1];
function ratio(text: Rgba, background: Rgba) {
  const fg = luminance(over(text, background));
  const bg = luminance(background);
  return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
}
// Truncated, never rounded up, so a reported 4.5 really is at least 4.5.
const show = (r: number) => (Math.floor(r * 100) / 100).toFixed(2);

function parseHex(hex: string): Rgba {
  const n = parseInt(hex.trim().slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255, 1];
}

async function findText(page: Page): Promise<Found[]> {
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

async function openHome(page: Page, theme: 'night' | 'day') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  if (theme === 'day') await page.getByRole('button', { name: /^theme:/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.getByRole('region', { name: 'Now Playing' })).not.toContainText('Loading');
  await expect(page.getByRole('region', { name: 'Commits' })).not.toContainText('Loading');
  // Let entrance fades finish, so text is checked at the opacity it settles at.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
}

async function skyEnds(page: Page) {
  const [top, horizon] = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return [root.getPropertyValue('--sky-top'), root.getPropertyValue('--sky-horizon')];
  });
  return { top: parseHex(top), horizon: parseHex(horizon) };
}

const commitsStates = {
  loaded: undefined,
  failed: reply.serverError(),
  empty: reply.json({ year: 2026, totalCommits: 0 }),
};

for (const theme of ['night', 'day'] as const) {
  for (const [state, commits] of Object.entries(commitsStates)) {
    test(`in ${theme}, all text on Home reaches 4.5:1 from the top of the sky to the horizon (Commits ${state})`, async ({ page }) => {
      if (commits) await page.route('https://my-website-spotify-api.vercel.app/api/github-contributions', commits);
      await openHome(page, theme);
      const sky = await skyEnds(page);
      const found = await findText(page);
      expect(found.length).toBeGreaterThan(20);

      const failures: string[] = [];
      const rows: string[] = [];
      for (const { text, colours, overlays, surface } of found) {
        const backgrounds = surface
          ? { surface }
          : {
              top: overlays.reduceRight((under, layer) => over(layer, under), sky.top),
              horizon: overlays.reduceRight((under, layer) => over(layer, under), sky.horizon),
            };
        const worst = Object.entries(backgrounds).map(([where, bg]) => [where, Math.min(...colours.map((c) => ratio(c, bg)))] as const);
        rows.push(`${text} | ${worst.map(([where, r]) => `${where} ${show(r)}`).join(' | ')}`);
        for (const [where, r] of worst) if (r < AA) failures.push(`"${text}" is ${show(r)}:1 at the ${where}`);
      }
      if (process.env.PRINT_CONTRAST) console.log(`\n${theme} (Commits ${state})\n${rows.join('\n')}`);
      expect(failures).toEqual([]);
    });
  }
}

test('no tertiary text sits on the sky on Home, in either theme', async ({ page }) => {
  // Day's tertiary grey can't reach 4.5:1 on any blue sky, so Home keeps it on surfaces only.
  for (const theme of ['night', 'day'] as const) {
    await openHome(page, theme);
    const tertiary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim());
    const found = await findText(page);
    const tertiaryOnSky = found.filter(({ colours, surface }) => !surface && colours.some(([r, g, b]) => {
      const n = parseInt(tertiary.slice(1), 16);
      return r === n >> 16 && g === ((n >> 8) & 255) && b === (n & 255);
    }));
    expect(tertiaryOnSky.map((f) => f.text), theme).toEqual([]);
  }
});
