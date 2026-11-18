import { test, expect, type Page } from './fixtures';
import { contentOverField } from './field';

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

// The Field is the grass band along the bottom of the screen. The Sky is the scrolling region above it.
const field = (page: Page) => page.locator('#field');
const sky = (page: Page) => page.getByRole('main');

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

// Every page in the site frame. Each is checked before its data or Chatbot reply could change its height
// and again after, at every scroll position.
const ROUTES = ['/', '/chatbot', '/top-5', '/thoughts', '/videos'];

for (const [size, viewport] of Object.entries({ desktop: DESKTOP, phone: PHONE, 'phone on its side': { width: 667, height: 375 } })) {
  test(`no content overlaps the Field at any scroll position on any page (${size})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(sky(page)).toBeVisible();
      if (route === '/') await expect(page.getByText('412 commits in 2026')).toBeAttached();
      for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        await scrollSkyTo(page, fraction);
        expect(await contentOverField(page), `${route}, scrolled ${fraction * 100}%`).toEqual([]);
      }
    }
  });
}

// A phone held upright, and one on its side: short enough that five menu rows would reach the grass.
for (const [size, viewport] of Object.entries({ phone: PHONE, 'phone on its side': { width: 667, height: 375 } })) {
  test(`the open phone menu stays clear of the Field (${size})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/chatbot');
    await page.getByRole('button', { name: 'menu' }).click();
    await expect(page.getByRole('link', { name: 'top 5' })).toBeVisible();
    expect(await contentOverField(page)).toEqual([]);
    // Every link can still be reached, scrolling the menu if it has to.
    for (const name of ['projects', 'thoughts', 'videos', 'chatbot', 'top 5']) {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).click({ trial: true });
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

// The keys scroll smoothly, so the Sky keeps moving after a press. A key pressed mid-scroll adds to where the
// scroll is heading, not to where the Sky is now, so each step waits for the Sky to stop before reading it.
async function skyAtRest(page: Page) {
  let last = Number.NaN;
  await expect
    .poll(async () => {
      const now = await skyScrollTop(page);
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [100] })
    .toBe(true);
}

test('Page Down, Space and the arrow keys scroll the Sky without clicking first', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');

  for (const [key, back] of [['PageDown', 'PageUp'], ['Space', 'Shift+Space'], ['ArrowDown', 'ArrowUp']]) {
    await skyAtRest(page);
    const before = await skyScrollTop(page);
    await page.keyboard.press(key);
    await expect.poll(() => skyScrollTop(page), { message: key }).toBeGreaterThan(before);
    await skyAtRest(page);
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

});

test('Space types in the Chatbot message box', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/chatbot');
  // The message box is in the page before the Chatbot starts, and typing that early is lost when it does.
  // Its greeting shows once it has started.
  await expect(page.getByText(/^Hi, i'm google gemini/)).toBeVisible();
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

// Headless Chromium draws WebGL in software, and each frame of the scene costs time in proportion to its
// pixels: about 4.5s at 1280x800 on the CI runner, during which the page's own scripts wait. A small
// viewport keeps the scene running, and what this test proves doesn't depend on the size.
const SCENE_VIEWPORT = { width: 320, height: 240 };

test.describe('with the scene running', () => {
  test.use({ scene: true });

  test('switching theme changes the scene palette in place, without restarting the scene', async ({ page }) => {
    await page.setViewportSize(SCENE_VIEWPORT);
    await page.goto('/');
    const scene = field(page).locator('[data-palette]');
    await expect(scene).toHaveAttribute('data-palette', 'night');
    const hasWebGL2 = await page.evaluate(() => document.createElement('canvas').getContext('webgl2') !== null);
    // Where the browser has WebGL2 the scene draws into a canvas: wait for it before keeping hold of it.
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

  // The scene's code only downloads where WebGL2 can draw it, so this runs with the scene.
  test('the scripts the site serves still carry the Designely runtime copyright notice', async ({ page }) => {
    const scripts: Promise<string>[] = [];
    page.on('response', (response) => {
      if (new URL(response.url()).pathname.startsWith('/_astro/') && response.url().endsWith('.js')) scripts.push(response.text());
    });
    await page.setViewportSize(SCENE_VIEWPORT);
    await page.goto('/');
    await expect(field(page).locator('[data-palette]')).toBeAttached();

    // The scene's code loads once the page has painted and the browser is idle, so keep reading what arrives.
    await expect
      .poll(async () => (await Promise.all(scripts)).some((body) => body.includes('Copyright (c) 2026 DESIGNELY LTD. Licensed only to play this export')))
      .toBe(true);
  });

  test('moving between pages keeps the same scene running, without restarting it', async ({ page }) => {
    await page.setViewportSize(SCENE_VIEWPORT);
    await page.goto('/');
    const scene = field(page).locator('[data-palette]');
    await expect(scene).toHaveAttribute('data-palette', 'night');
    const hasWebGL2 = await page.evaluate(() => document.createElement('canvas').getContext('webgl2') !== null);
    if (hasWebGL2) await expect(field(page).locator('canvas')).toHaveCount(1);
    await page.evaluate(() => {
      const kept = window as unknown as { keptStage?: Element; keptCanvas?: Element | null };
      kept.keptStage = document.querySelector('#field [data-palette]')!.firstElementChild!;
      kept.keptCanvas = document.querySelector('#field canvas');
    });

    // At this width the links sit in the phone menu.
    await page.getByRole('button', { name: 'menu' }).click();
    await page.getByRole('link', { name: 'chatbot' }).click();
    await expect(page).toHaveURL(/\/chatbot$/);
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();
    await page.getByRole('button', { name: 'menu' }).click();
    await page.getByRole('link', { name: 'top 5' }).click();
    await expect(page).toHaveURL(/\/top-5$/);

    const same = await page.evaluate(() => {
      const kept = window as unknown as { keptStage?: Element; keptCanvas?: Element | null };
      return {
        stage: kept.keptStage === document.querySelector('#field [data-palette]')!.firstElementChild && kept.keptStage!.isConnected,
        canvas: kept.keptCanvas === document.querySelector('#field canvas'),
        canvases: document.querySelectorAll('#field canvas').length,
      };
    });
    expect(same.stage).toBe(true);
    expect(same.canvas).toBe(true);
    if (hasWebGL2) expect(same.canvases).toBe(1);
    expect(same.canvases).toBeLessThanOrEqual(1);
  });
});


for (const [size, viewport] of Object.entries({ desktop: DESKTOP, phone: PHONE })) {
  test(`everything on Home can be scrolled to and clicked (${size})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByText('412 commits in 2026')).toBeAttached();

    const controls = [
      page.getByRole('link', { name: 'github', exact: true }),
      page.getByRole('link', { name: 'instagram' }),
      page.getByRole('link', { name: 'Download resume' }),
      page.getByRole('img', { name: 'Guilherme Oliveira' }),
      page.getByRole('region', { name: 'Now Playing' }),
      ...['Zaklang', 'Ollie', 'OneTap', 'Aperture'].map((name) => page.getByRole('link', { name: new RegExp(name) })),
      page.getByText('412 commits in 2026'),
    ];
    for (const control of controls) {
      // A trial click scrolls the control into view and checks nothing covers it, without clicking.
      await control.click({ trial: true });
      await expect(control).toBeInViewport();
    }

  });

  test(`everything on Top 5 and Chatbot can be scrolled to and clicked (${size})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/top-5');
    for (const title of ['The Prestige', 'Vinland Saga', 'Valorant']) {
      await page.getByRole('img', { name: title }).click({ trial: true });
      await expect(page.getByRole('img', { name: title })).toBeInViewport();
    }
    await page.goto('/chatbot');
    await page.getByRole('textbox', { name: 'Message' }).click({ trial: true });
    await page.getByRole('button', { name: 'Send message' }).click({ trial: true });
  });
}
