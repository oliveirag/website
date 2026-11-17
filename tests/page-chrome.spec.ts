import { test, expect, type Locator } from './fixtures';

// The glow is painted from --mouse-x/--mouse-y, so reading them back is the closest observable to the effect.
async function glowPosition(target: Locator) {
  return target.evaluate((el) => {
    const style = getComputedStyle(el);
    return [style.getPropertyValue('--mouse-x'), style.getPropertyValue('--mouse-y')].map((value) => parseFloat(value));
  });
}

test('the glow on borders follows the pointer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('412 commits in 2026')).toBeVisible();

  const targets = {
    'project card': page.getByRole('link', { name: /Zaklang/ }),
    'Now Playing': page.getByRole('region', { name: 'Now Playing' }),
    'tab switcher': page.locator('#switcher'),
    divider: page.locator('.glow-divider').first(),
  };

  for (const [name, target] of Object.entries(targets)) {
    await target.scrollIntoViewIfNeeded();
    const box = (await target.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    // Pointer positions are rounded to whole pixels, so allow one pixel either way.
    await expect
      .poll(async () => {
        const [x, y] = await glowPosition(target);
        return Math.max(Math.abs(x - 10), Math.abs(y - box.height / 2));
      }, { message: name })
      .toBeLessThanOrEqual(1);
  }
});

test('the Google tag and Speed Insights load', async ({ page }) => {
  const googleTag = page.waitForRequest((req) => req.url().startsWith('https://www.googletagmanager.com/gtag/js?id=G-6LCTQSHDRD'));
  const speedInsights = page.waitForRequest((req) => new URL(req.url()).pathname.endsWith('/speed-insights/script.js'));

  await page.goto('/');

  await googleTag;
  await speedInsights;
});
