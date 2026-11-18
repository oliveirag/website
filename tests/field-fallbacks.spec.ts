import { test, expect, type Page } from './fixtures';

// How the Field holds up where the full scene can't or shouldn't run: phones, browsers without WebGL2,
// reduced motion and hidden tabs. What the scene draws is never checked; whether it draws at all is, by
// counting the WebGL draw calls the page makes.

const DESKTOP = { width: 1280, height: 800 };
const PHONES = { 'phone': { width: 390, height: 844 }, 'phone on its side': { width: 667, height: 375 } };

const field = (page: Page) => page.locator('#field');
const sky = (page: Page) => page.getByRole('main');

for (const [size, viewport] of Object.entries(PHONES)) {
  test(`on a ${size} the Field takes about 22% of the screen and the Sky and its controls stop above it`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/top-5');

    const band = (await field(page).boundingBox())!;
    expect(band.y + band.height).toBeCloseTo(viewport.height, 0);
    expect(band.height / viewport.height).toBeGreaterThan(0.2);
    expect(band.height / viewport.height).toBeLessThan(0.24);

    // The Sky's clip line follows the shorter Field, and so do the sound control and the scroll hint.
    const skyBox = (await sky(page).boundingBox())!;
    expect(skyBox.y + skyBox.height).toBeLessThanOrEqual(band.y);
    expect(band.y - (skyBox.y + skyBox.height)).toBeLessThan(24);
    const sound = (await page.getByRole('button', { name: /^sound:/ }).boundingBox())!;
    expect(sound.y + sound.height).toBeLessThanOrEqual(band.y);
    const hint = page.getByText('scroll', { exact: true });
    await expect(hint).toBeVisible();
    const hintBox = (await hint.boundingBox())!;
    expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(band.y);
  });
}

// The scene reports the quality it was given on its wrapper, as it does its palette.
test('phones run the scene at its fast quality and desktops at its full quality', async ({ page }) => {
  const quality = field(page).locator('[data-quality]');
  for (const viewport of Object.values(PHONES)) {
    await page.setViewportSize(viewport);
    await page.goto('/top-5');
    await expect(quality).toHaveAttribute('data-quality', 'fast');
  }
  await page.setViewportSize(DESKTOP);
  await page.goto('/top-5');
  await expect(quality).toHaveAttribute('data-quality', 'high');
  // Turning a phone or resizing a window changes it on the running scene.
  await page.setViewportSize(PHONES.phone);
  await expect(quality).toHaveAttribute('data-quality', 'fast');
});

// The picture painted in the Field band: the last shown element in #field with a background image (later
// siblings paint over earlier ones), whether it fills the band, and whether the browser can load it as an
// image. The Field takes no pointer events, so hit testing can't find it; this reads boxes instead.
async function pictureInField(page: Page) {
  const shown = await page.evaluate(() => {
    const band = document.getElementById('field')!.getBoundingClientRect();
    const pictures = [...document.querySelectorAll('#field *')].filter((el) => {
      const style = getComputedStyle(el);
      return style.backgroundImage.startsWith('url') && Number(style.opacity) > 0 && style.visibility === 'visible';
    });
    const top = pictures.at(-1);
    if (!top) return null;
    const box = top.getBoundingClientRect();
    const fills = box.left <= band.left + 1 && box.right >= band.right - 1 && box.top <= band.top + 1 && box.bottom >= band.bottom - 1;
    return { url: /url\("?([^")]+)"?\)/.exec(getComputedStyle(top).backgroundImage)![1]!, fills };
  });
  if (!shown) return null;
  const size = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  }, shown.url);
  return { ...shown, ...size };
}

// Fixtures make WebGL2 unavailable unless a test asks for the scene, so these run without it.
test('without WebGL2 the Field is a still picture of the grass under the gradient sky, in Night and in Day', async ({ page }) => {
  for (const viewport of [DESKTOP, ...Object.values(PHONES)]) {
    await page.setViewportSize(viewport);
    await page.goto('/top-5');
    await expect.poll(() => pictureInField(page)).not.toBeNull();
    const night = (await pictureInField(page))!;
    expect(night.width).toBeGreaterThan(0);
    expect(night.fills).toBe(true);
    // Above the grass the sky is the theme's gradient, the same one the Intro and the Sky's contrast are set on.
    await expect(page.locator('.field-sky')).toHaveCSS('background-image', /linear-gradient/);
    await expect(field(page).locator('canvas')).toHaveCount(0);

    await page.getByRole('button', { name: /^theme:/ }).click();
    await expect.poll(async () => (await pictureInField(page))?.url).not.toBe(night.url);
    expect((await pictureInField(page))!.width).toBeGreaterThan(0);
    await page.getByRole('button', { name: /^theme:/ }).click();
    await expect.poll(async () => (await pictureInField(page))?.url).toBe(night.url);
  }
});

// Headless Chromium draws WebGL in software, at a cost per frame that grows with the pixels, so the scene
// tests run on a small screen (a phone's quality, by its height). What they prove doesn't depend on the size.
const SCENE_VIEWPORT = { width: 320, height: 240 };

// Counts the WebGL draw calls the page makes: while the scene runs it draws every frame, and held still it
// draws nothing.
async function countDraws(page: Page) {
  await page.addInitScript(() => {
    const counted = window as unknown as { draws: number };
    counted.draws = 0;
    const proto = WebGL2RenderingContext.prototype;
    const draw = proto.drawArrays;
    proto.drawArrays = function (this: WebGL2RenderingContext, ...args: Parameters<typeof draw>) {
      counted.draws++;
      return draw.apply(this, args);
    };
  });
}

const draws = (page: Page) => page.evaluate(() => (window as unknown as { draws: number }).draws);

async function drawsOver(page: Page, ms: number) {
  const before = await draws(page);
  await page.waitForTimeout(ms);
  return (await draws(page)) - before;
}

async function expectDrawing(page: Page) {
  await expect.poll(() => drawsOver(page, 500), { timeout: 15_000 }).toBeGreaterThan(0);
}

// Held still: once a frame already under way has finished, nothing more is drawn.
async function expectHeldStill(page: Page) {
  await page.waitForTimeout(1000);
  expect(await drawsOver(page, 1500)).toBe(0);
}

// A tab can't be hidden from inside a headless browser, so the page is told it is, the way the browser would.
async function setTabHidden(page: Page, hidden: boolean) {
  await page.evaluate((isHidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => isHidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (isHidden ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test.describe('with the scene running', () => {
  test.use({ scene: true, viewport: SCENE_VIEWPORT });

  test('the scene stops drawing while the tab is hidden and starts again when it comes back', async ({ page }) => {
    await countDraws(page);
    await page.goto('/videos');
    await expectDrawing(page);

    await setTabHidden(page, true);
    await expectHeldStill(page);

    await setTabHidden(page, false);
    await expectDrawing(page);
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the scene draws one still frame and holds it', async ({ page }) => {
      await countDraws(page);
      await page.goto('/videos');
      await expect(field(page).locator('canvas')).toHaveCount(1);
      await expect.poll(() => draws(page), { timeout: 15_000 }).toBeGreaterThan(0);
      await expectHeldStill(page);
    });
  });

  test.describe('under the Intro', () => {
    test.use({ intro: true });

    test('the scene holds still while the Field waits below the screen and runs once it has risen', async ({ page }) => {
      await countDraws(page);
      await page.goto('/');
      await expect(page.getByRole('dialog', { name: 'intro' })).toBeVisible();
      await expect(field(page).locator('canvas')).toHaveCount(1);
      // The scene draws its first frame even held still, so the grass has something to rise with.
      await expect.poll(() => draws(page), { timeout: 15_000 }).toBeGreaterThan(0);
      await expectHeldStill(page);

      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog', { name: 'intro' })).toBeHidden();
      await expectDrawing(page);
    });
  });

  test('the scene arrives after the page first paints and shifts nothing', async ({ page }) => {
    await page.addInitScript(() => {
      const seen = window as unknown as { sceneAt?: number; shifts: number };
      seen.shifts = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) seen.shifts += (entry as PerformanceEntry & { value: number }).value;
      }).observe({ type: 'layout-shift', buffered: true });
      new MutationObserver(() => {
        if (seen.sceneAt === undefined && document.querySelector('#field canvas')) seen.sceneAt = performance.now();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto('/top-5');
    const band = await field(page).boundingBox();
    await expect(field(page).locator('canvas')).toHaveCount(1);

    const { sceneAt, firstPaint, shifts } = await page.evaluate(() => {
      const seen = window as unknown as { sceneAt: number; shifts: number };
      return {
        sceneAt: seen.sceneAt,
        firstPaint: performance.getEntriesByName('first-contentful-paint')[0]!.startTime,
        shifts: seen.shifts,
      };
    });
    expect(sceneAt).toBeGreaterThan(firstPaint);
    expect(shifts).toBe(0);
    expect(await field(page).boundingBox()).toEqual(band);
  });
});
