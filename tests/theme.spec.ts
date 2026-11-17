import { test, expect, type Page } from './fixtures';

// What a visitor sees in each theme: the page background, and a coloured word that uses a dark-variant class.
const NIGHT = { background: 'rgb(23, 23, 23)', ucf: 'rgb(250, 204, 21)' };
const DAY = { background: 'rgb(255, 255, 255)', ucf: 'rgb(202, 138, 4)' };

async function expectTheme(page: Page, theme: typeof NIGHT) {
  await expect(page.locator('body')).toHaveCSS('background-color', theme.background);
  await expect(page.getByText('ucf', { exact: true })).toHaveCSS('color', theme.ucf);
}

for (const colorScheme of ['dark', 'light'] as const) {
  test(`a first visit opens in Night when the OS is set to ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');

    await expectTheme(page, NIGHT);
  });
}

const themeToggle = (page: Page) => page.getByRole('button', { name: /^theme:/ });

test('the toggle switches between Night and Day and names the theme that is on', async ({ page }) => {
  await page.goto('/');
  await expect(themeToggle(page)).toHaveAccessibleName('theme: night');

  await themeToggle(page).click();
  await expectTheme(page, DAY);
  await expect(themeToggle(page)).toHaveAccessibleName('theme: day');

  await themeToggle(page).click();
  await expectTheme(page, NIGHT);
  await expect(themeToggle(page)).toHaveAccessibleName('theme: night');
});

test('switching theme is announced to assistive tech', async ({ page }) => {
  await page.goto('/');
  // Nothing is announced on load: the button's name already says the theme.
  await expect(page.getByRole('status')).toHaveText('');

  await themeToggle(page).click();
  await expect(page.getByRole('status')).toHaveText('day is on');

  await themeToggle(page).click();
  await expect(page.getByRole('status')).toHaveText('night is on');
});

test('Day survives a reload and shows from the first paint, before any page script runs', async ({ page }) => {
  await page.goto('/');
  await themeToggle(page).click();
  await expectTheme(page, DAY);

  // Hold back every bundled page script, so whatever shows now comes from the HTML and CSS alone.
  let releaseScripts!: () => void;
  const scriptsHeld = new Promise<void>((resolve) => (releaseScripts = resolve));
  await page.route('**/_astro/*.js', async (route) => {
    await scriptsHeld;
    await route.continue();
  });

  await page.reload({ waitUntil: 'commit' });
  await expectTheme(page, DAY);
  await expect(themeToggle(page)).toHaveAccessibleName('theme: day');

  releaseScripts();
  await page.waitForLoadState('load');
  await expectTheme(page, DAY);
});

test('switching back to Night also survives a reload', async ({ page }) => {
  await page.goto('/');
  await themeToggle(page).click();
  await expectTheme(page, DAY);
  await themeToggle(page).click();
  await expectTheme(page, NIGHT);

  await page.reload();
  await expectTheme(page, NIGHT);
  await expect(themeToggle(page)).toHaveAccessibleName('theme: night');
});

test('the browser theme colour follows the theme', async ({ page }) => {
  const themeColor = page.locator('meta[name="theme-color"]');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(themeColor).toHaveCount(1);
  await expect(themeColor).toHaveAttribute('content', '#171717');

  await themeToggle(page).click();
  await expect(themeColor).toHaveAttribute('content', '#FFFFFF');

  await page.reload();
  await expect(themeColor).toHaveAttribute('content', '#FFFFFF');
});
