import { test, expect } from './fixtures';

// These run against a build with no Thoughts posts and an empty Videos list (the "empty" project in
// playwright.config.ts), so the empty states stay covered once the real lists have entries.
for (const [route, heading, emptyState] of [
  ['/thoughts', 'thoughts', 'nothing written yet. check back soon.'],
  ['/videos', 'videos', 'no videos yet. coming soon.'],
]) {
  test(`${heading} exists and shows only its empty state`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveTitle(new RegExp(heading));
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByText(emptyState)).toBeVisible();
    await expect(page.getByRole('main').getByRole('link')).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('list')).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('main').locator('img, iframe')).toHaveCount(0);
  });
}
