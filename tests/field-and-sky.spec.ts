import { test, expect, type Page } from './fixtures';

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

// The Field is the grass band along the bottom of the screen. The Sky is the scrolling region above it.
const field = (page: Page) => page.locator('#field');
const sky = (page: Page) => page.getByRole('main');

// Everything painted over the Field band, found two ways:
// - geometry: each element's box, cut down to what its scrolling ancestors let show;
// - hit testing: what the browser finds at points across the band.
// Clipped boxes matter because an element scrolled out of the Sky still reports its full box.
async function contentOverField(page: Page) {
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

async function scrollSkyTo(page: Page, fraction: number) {
  await sky(page).evaluate((el, f) => el.scrollTo({ top: (el.scrollHeight - el.clientHeight) * f, behavior: 'instant' }), fraction);
}

test('the Field is pinned to the bottom of the viewport and takes about 30% of it on desktop', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');

  const box = (await field(page).boundingBox())!;
  expect(box.y + box.height).toBeCloseTo(DESKTOP.height, 0);
  expect(box.width).toBe(DESKTOP.width);
  expect(box.height / DESKTOP.height).toBeGreaterThan(0.27);
  expect(box.height / DESKTOP.height).toBeLessThan(0.33);
});

for (const [size, viewport] of Object.entries({ desktop: DESKTOP, phone: PHONE })) {
  test(`no content overlaps the Field at any scroll position on any tab (${size})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByText('412 commits in 2026')).toBeAttached();

    for (const tab of ['Projects', 'Chatbot', 'Top 5']) {
      await page.getByRole('tab', { name: tab }).click();
      for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        await scrollSkyTo(page, fraction);
        expect(await contentOverField(page), `${tab} tab, scrolled ${fraction * 100}%`).toEqual([]);
      }
    }
  });
}

const scrollHint = (page: Page) => page.getByText('scroll', { exact: true });

test('a scroll hint shows while there is more below and goes away after the first scroll', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  await expect(scrollHint(page)).toBeVisible();
  expect(await contentOverField(page)).toEqual([]);

  const skyBox = (await sky(page).boundingBox())!;
  await page.mouse.move(skyBox.x + skyBox.width / 2, skyBox.y + skyBox.height / 2);
  await page.mouse.wheel(0, 300);
  await expect(scrollHint(page)).toBeHidden();

  // Scrolling back up does not bring it back.
  await page.mouse.wheel(0, -300);
  await expect.poll(() => sky(page).evaluate((el) => el.scrollTop)).toBe(0);
  await expect(scrollHint(page)).toBeHidden();
});

test('there is no scroll hint when everything fits in the Sky', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 3600 });
  await page.goto('/');
  await expect(page.getByText('412 commits in 2026')).toBeVisible();
  expect(await sky(page).evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  await expect(scrollHint(page)).toBeHidden();
});

const skyScrollTop = (page: Page) => sky(page).evaluate((el) => el.scrollTop);

test('Page Down, Space and the arrow keys scroll the Sky without clicking first', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');

  for (const [key, back] of [['PageDown', 'PageUp'], ['Space', 'Shift+Space'], ['ArrowDown', 'ArrowUp']]) {
    const before = await skyScrollTop(page);
    await page.keyboard.press(key);
    await expect.poll(() => skyScrollTop(page), { message: key }).toBeGreaterThan(before);
    const after = await skyScrollTop(page);
    await page.keyboard.press(back);
    await expect.poll(() => skyScrollTop(page), { message: back }).toBeLessThan(after);
  }

  await page.keyboard.press('End');
  await expect.poll(() => sky(page).evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Home');
  await expect.poll(() => skyScrollTop(page)).toBe(0);
  await expect(scrollHint(page)).toBeHidden();
});

test('keys still reach the control that has focus', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');

  // A focused button outside the Sky: arrows scroll the Sky, Space presses the button.
  const toggle = page.getByRole('button', { name: /^theme:/ });
  await toggle.focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => skyScrollTop(page)).toBeGreaterThan(0);
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAccessibleName('theme: day');

  // Space types in the Chatbot's message box.
  await page.getByRole('tab', { name: 'Chatbot' }).click();
  const message = page.getByRole('textbox', { name: 'Message' });
  await message.fill('hi');
  await message.press('Space');
  await expect(message).toHaveValue('hi ');
});

// The part of the Sky where content shows in full: below the controls at the top and above the fade.
function clearAreaOfSky() {
  const sky = document.getElementById('sky')!;
  const style = getComputedStyle(sky);
  const box = sky.getBoundingClientRect();
  return { top: box.top + parseFloat(style.paddingTop), bottom: box.bottom - parseFloat(style.paddingBottom) };
}

// Where an element sits in the Sky: its top against the clear area's top, and whether that top is inside it.
async function placeInSky(page: Page, selector: string) {
  await page.addScriptTag({ content: `window.clearAreaOfSky = ${clearAreaOfSky.toString()}` });
  return page.evaluate((selector) => {
    const clear = (window as unknown as { clearAreaOfSky: typeof clearAreaOfSky }).clearAreaOfSky();
    const box = document.querySelector(selector)!.getBoundingClientRect();
    return { fromClearTop: box.top - clear.top, inClearArea: box.top >= clear.top - 1 && box.top < clear.bottom };
  }, selector);
}

for (const [size, viewport] of Object.entries({ desktop: DESKTOP, phone: PHONE })) {
  test(`in-page anchors land at the top of the Sky (${size})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#projects');
    await expect.poll(() => placeInSky(page, '#projects')).toEqual({ fromClearTop: 0, inClearArea: true });

    await page.evaluate(() => document.getElementById('sky')!.scrollTo({ top: 0, behavior: 'instant' }));
    await page.evaluate(() => (window.location.hash = '#tech-stack'));
    await expect.poll(async () => (await placeInSky(page, '#tech-stack')).inClearArea).toBe(true);
    expect(Math.abs((await placeInSky(page, '#tech-stack')).fromClearTop)).toBeLessThanOrEqual(1);
  });
}

// Playwright can't drive the browser's find bar, and window.find selects a match without scrolling to it.
// So this checks the two things the layout decides: text in the Sky can be found, and a match brought into
// view the way the find bar does it (centred in its scroller) shows in full above the fade.
test('browser find reaches text in the Sky and shows the match clear of the fade', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('/');
  await expect(page.getByText('412 commits in 2026')).toBeAttached();
  await expect(page.getByText('412 commits in 2026')).not.toBeInViewport();

  const found = await page.evaluate(() => {
    if (!(window as unknown as { find(text: string): boolean }).find('412 commits in 2026')) return 'not found';
    const match = getSelection()!.getRangeAt(0);
    const element = match.startContainer.parentElement!;
    if (!element.closest('#sky')) return 'found outside the Sky';
    element.scrollIntoView({ block: 'center', behavior: 'instant' });
    return element.id || 'found';
  });
  expect(found).toBe('found');
  await expect(page.getByText('412 commits in 2026')).toBeInViewport();
  await page.addScriptTag({ content: `window.clearAreaOfSky = ${clearAreaOfSky.toString()}` });
  const shownInFull = await page.evaluate(() => {
    const clear = (window as unknown as { clearAreaOfSky: typeof clearAreaOfSky }).clearAreaOfSky();
    const box = getSelection()!.getRangeAt(0).getBoundingClientRect();
    return box.top >= clear.top && box.bottom <= clear.bottom;
  });
  expect(shownInFull).toBe(true);
});

test.describe('with the scene running', () => {
  test.use({ scene: true });

  test('switching theme changes the scene palette in place, without restarting the scene', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    const scene = field(page).locator('[data-palette]');
    await expect(scene).toHaveAttribute('data-palette', 'night');
    // Where the browser has WebGL2 the scene draws into a canvas: wait for it before keeping hold of it.
    const hasWebGL2 = await page.evaluate(() => document.createElement('canvas').getContext('webgl2') !== null);
    if (hasWebGL2) await expect(field(page).locator('canvas')).toHaveCount(1);
    // Keep hold of the scene's elements, to tell afterwards whether they were replaced.
    await page.evaluate(() => {
      const kept = window as unknown as { keptStage?: Element; keptCanvas?: Element | null };
      kept.keptStage = document.querySelector('#field [data-palette]')!.firstElementChild!;
      kept.keptCanvas = document.querySelector('#field canvas');
    });

    const toggle = page.getByRole('button', { name: /^theme:/ });
    await toggle.click();
    await expect(scene).toHaveAttribute('data-palette', 'day');
    await toggle.click();
    await expect(scene).toHaveAttribute('data-palette', 'night');

    const same = await page.evaluate(() => {
      const kept = window as unknown as { keptStage?: Element; keptCanvas?: Element | null };
      return {
        stage: kept.keptStage === document.querySelector('#field [data-palette]')!.firstElementChild && kept.keptStage!.isConnected,
        canvas: kept.keptCanvas === document.querySelector('#field canvas'),
        canvases: document.querySelectorAll('#field canvas').length,
      };
    });
    expect(same.stage).toBe(true);
    if (hasWebGL2) expect(same.canvases).toBe(1);
    expect(same.canvas).toBe(true);
    expect(same.canvases).toBeLessThanOrEqual(1);
  });
});

test('the scripts the site serves still carry the Designely runtime copyright notice', async ({ page }) => {
  const scripts: Promise<string>[] = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/_astro/') && response.url().endsWith('.js')) scripts.push(response.text());
  });
  await page.goto('/');
  await expect(field(page).locator('[data-palette]')).toBeAttached();

  const bodies = await Promise.all(scripts);
  expect(bodies.some((body) => body.includes('Copyright (c) 2026 DESIGNELY LTD. Licensed only to play this export'))).toBe(true);
});

for (const [size, viewport] of Object.entries({ desktop: DESKTOP, phone: PHONE })) {
  test(`everything on Home can still be scrolled to and clicked (${size})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByText('412 commits in 2026')).toBeAttached();

    const controls = [
      page.getByRole('link', { name: 'github', exact: true }),
      page.getByRole('link', { name: 'instagram' }),
      page.getByRole('link', { name: 'view the source code here' }),
      page.getByRole('link', { name: 'Download resume' }),
      page.getByRole('img', { name: 'Guilherme Oliveira' }),
      page.getByRole('region', { name: 'Now Playing' }),
      ...['Zaklang', 'Ollie', 'OneTap', 'Aperture'].map((name) => page.getByRole('link', { name: new RegExp(name) })),
      page.getByText('412 commits in 2026'),
      page.getByRole('tab', { name: 'Top 5' }),
    ];
    for (const control of controls) {
      // A trial click scrolls the control into view and checks nothing covers it, without clicking.
      await control.click({ trial: true });
      await expect(control).toBeInViewport();
    }

    await page.getByRole('tab', { name: 'Top 5' }).click();
    await page.getByText('video games', { exact: true }).click({ trial: true });
    await page.getByRole('tab', { name: 'Chatbot' }).click();
    await page.getByRole('textbox', { name: 'Message' }).click({ trial: true });
  });
}
