import { test, expect, type Page } from './fixtures';

const SERIF_FILE = '/fonts/instrument-serif-latin.woff2';

const fontOf = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((node) => getComputedStyle(node).fontFamily);

test('my name is the Home heading, as real text in Instrument Serif from the self-hosted font file', async ({ page }) => {
  const serifRequest = page.waitForRequest((request) => new URL(request.url()).pathname === SERIF_FILE);
  await page.goto('/');

  const heading = page.locator('#sky h1');
  await expect(heading).toHaveText('guilherme oliveira');
  await expect(page.getByRole('heading', { level: 1, name: 'guilherme oliveira' })).toBeVisible();
  expect(await fontOf(page, '#sky h1')).toMatch(/^"?Instrument Serif"?,/);
  await serifRequest;
  expect(await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('48px "Instrument Serif"', 'guilherme oliveira');
  })).toBe(true);
  // The font has one weight, so the heading never asks for a bold the browser would fake.
  await expect(heading).toHaveCSS('font-weight', '400');
});

test('everything on Home but my name stays JetBrains Mono', async ({ page }) => {
  await page.goto('/');
  for (const selector of ['#about', '#contact', '#tech-stack', '#about-site', '#now-playing', '#projects', 'nav']) {
    expect(await fontOf(page, selector), selector).toMatch(/^"?JetBrains Mono"?,/);
  }
});

// Thoughts is left out: its posts read in Source Serif 4, which thoughts.spec.ts checks along with its title.
for (const [path, title] of [['/top-5', 'top 5'], ['/videos', 'videos']] as const) {
  test(`the ${title} page title is in Instrument Serif and its text stays JetBrains Mono`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    expect(await fontOf(page, '#sky h1')).toMatch(/^"?Instrument Serif"?,/);
    await expect(page.locator('#sky h1')).toHaveCSS('font-weight', '400');
    expect(await fontOf(page, '#sky p, #sky span')).toMatch(/^"?JetBrains Mono"?,/);
  });
}

// Source Serif 4 is the reading type of Thoughts only, so no other page fetches it or asks for it early.
test('Source Serif 4 is never downloaded or preloaded outside Thoughts', async ({ page }) => {
  const readingFont: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.includes('source-serif')) readingFont.push(request.url());
  });
  for (const path of ['/', '/videos', '/chatbot', '/top-5']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('link[href*="source-serif"]'), path).toHaveCount(0);
  }
  expect(readingFont).toEqual([]);
});
