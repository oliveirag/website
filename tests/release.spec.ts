import { test, expect, motionSettled, type Page } from './fixtures';
import { textBelowAA } from './sky-text';

// Checks from the release check (#19) that no other spec covered: contrast on the Chatbot and Top 5 pages, no
// jQuery in anything the site serves, and every page working before the scenes have loaded.

const PAGES = ['/', '/chatbot', '/top-5', '/thoughts', '/videos'];

async function openInTheme(page: Page, path: string, theme: 'night' | 'day') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path);
  if (theme === 'day') await page.getByRole('button', { name: /^theme:/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  // Colours ease to the new theme and entrance fades run on load, so text is read once they have finished.
  await motionSettled(page);
}

for (const theme of ['night', 'day'] as const) {
  for (const path of ['/chatbot', '/top-5']) {
    test(`in ${theme}, all text on ${path} reaches 4.5:1 from the top of the sky to the horizon`, async ({ page }) => {
      await openInTheme(page, path, theme);
      if (path === '/chatbot') await expect(page.getByText(/tuned to act like Gui/)).toBeVisible();
      const { found, failures, rows } = await textBelowAA(page);
      expect(found.length).toBeGreaterThan(path === '/top-5' ? 10 : 4);
      if (process.env.PRINT_CONTRAST) console.log(`\n${theme}, ${path}\n${rows.join('\n')}`);
      expect(failures).toEqual([]);
    });
  }
}

test.describe('with the scenes able to load', () => {
  test.use({ scene: true, intro: true, viewport: { width: 320, height: 240 } });

  test('no script the site serves on any page contains jQuery, the scenes included', async ({ page }) => {
    const scripts = new Set<string>();
    page.on('request', (request) => {
      if (request.resourceType() === 'script' && request.url().startsWith('http://127.0.0.1')) scripts.add(request.url());
    });
    for (const path of PAGES) {
      await page.goto(path);
      if (path === '/') {
        // The Intro's drawing only downloads while the Intro shows.
        await expect(page.locator('[data-palette]').first()).toBeAttached();
        await page.keyboard.press('Enter');
      }
      await expect(page.locator('#field [data-palette]')).toBeAttached();
      expect(await page.evaluate(() => 'jQuery' in window || '$' in window), path).toBe(false);
    }
    // Read once every page has been visited: a response body is gone after the page that loaded it.
    const bodies = await Promise.all([...scripts].map(async (url) => (await page.request.get(url)).text()));
    // Grass and Bloom Type both downloaded, so the scenes' chunks were read too.
    expect(bodies.some((body) => body.includes('DESIGNELY'))).toBe(true);
    expect(bodies.length).toBeGreaterThan(15);
    expect(bodies.filter((body) => /jquery/i.test(body))).toEqual([]);
  });
});

test.describe('before the scenes have loaded', () => {
  test.use({ scene: true, intro: true });

  test('every page can be read, scrolled, themed, navigated and used while the Grass and Bloom Type never arrive', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const asked: string[] = [];
    await page.route(/\/_astro\/(Grass|IntroBloom)\.[^/]+\.js$/, async (route) => {
      asked.push(new URL(route.request().url()).pathname);
      await held;
      await route.abort();
    });
    await page.route('https://my-website-spotify-api.vercel.app/api/chatbot', (route) => {
      const headers = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
      };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ botOutput: 'still here' }) });
    });

    // Home, with the Intro showing and its drawing held back: a key ends it and Home is there.
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-intro', 'showing');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).not.toHaveAttribute('data-intro', /./);
    await expect(page.getByRole('heading', { name: 'guilherme oliveira' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Commits' })).toContainText('412 commits in 2026');

    // Scrolls by keyboard, switches theme, and moves to every other page by the navigation.
    const sky = page.locator('#sky');
    await page.keyboard.press('PageDown');
    await expect.poll(() => sky.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await page.getByRole('button', { name: /^theme:/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');

    for (const [name, path, heading] of [
      ['top 5', '/top-5', /top 5/i],
      ['thoughts', '/thoughts', /thoughts/i],
      ['videos', '/videos', /videos/i],
      ['chatbot', '/chatbot', /chatbot/i],
    ] as const) {
      await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeAttached();
    }

    const message = page.getByRole('textbox', { name: 'Message' });
    await message.fill('hi gui');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('still here')).toBeVisible();

    // All of that happened before either scene arrived: both were asked for and neither was delivered.
    expect(asked.some((path) => path.includes('/Grass.'))).toBe(true);
    expect(asked.some((path) => path.includes('/IntroBloom.'))).toBe(true);
    await expect(page.locator('#field canvas')).toHaveCount(0);
    release();
  });
});
