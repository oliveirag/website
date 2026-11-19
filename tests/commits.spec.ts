import { test, expect, stubApis, reply, commits, type Page } from './fixtures';

const commitsRegion = (page: Page) => page.getByRole('region', { name: 'Commits' });

test.describe('Commits', () => {
  test('shows the yearly count and the repositories', async ({ page }) => {
    await page.goto('/');
    const region = commitsRegion(page);

    await expect(region).toContainText('412 commits in 2026');
    await expect(region).toContainText('#1 zaklang');
    await expect(region).toContainText('Python • 200 commits');
    await expect(region).toContainText('#2 ollie');
    await expect(region).toContainText('#3 onetap');
    await expect(region).toContainText('website');
    await expect(region).not.toContainText('#4');
    await expect(region).not.toContainText('Loading');
  });

  test('says so when there are no commits this year', async ({ page }) => {
    await stubApis(page, { commits: reply.json({ year: 2026, totalCommits: 0, repositories: [] }) });
    await page.goto('/');

    await expect(commitsRegion(page)).toContainText('No contribution data found');
  });

  test('shows a clear message when the API fails', async ({ page }) => {
    await stubApis(page, { commits: reply.serverError() });
    await page.goto('/');

    await expect(commitsRegion(page)).toContainText("Couldn't load git commits. Refresh to try again");
    await expect(commitsRegion(page)).not.toContainText('Loading');
  });

  test('shows a clear message when the request never reaches the API', async ({ page }) => {
    await stubApis(page, { commits: reply.networkError() });
    await page.goto('/');

    await expect(commitsRegion(page)).toContainText("Couldn't load git commits. Refresh to try again");
  });

  test('renders repositories as text, never as HTML', async ({ page }) => {
    const name = '<img src=x id="injected-repo">';
    const language = '<b id="injected-language">Go</b>';
    await stubApis(page, {
      commits: reply.json({ ...commits, repositories: [{ name, language, commits: 3 }] }),
    });
    await page.goto('/');

    await expect(commitsRegion(page)).toContainText(name);
    await expect(commitsRegion(page)).toContainText(language);
    await expect(page.locator('#injected-repo, #injected-language')).toHaveCount(0);
  });
});

test('a repository with no language shows only its commits, and one commit reads as "1 commit"', async ({ page }) => {
  await stubApis(page, {
    commits: reply.json({
      year: 2026,
      totalCommits: 13,
      repositories: [
        { name: 'website', language: 'Astro', commits: 12 },
        { name: 'design-system', language: null, commits: 1 },
      ],
    }),
  });
  await page.goto('/');
  const region = commitsRegion(page);

  await expect(region).toContainText('Astro • 12 commits');
  await expect(region).toContainText('design-system');
  await expect(region).not.toContainText('null');
  await expect(region.getByText('1 commit', { exact: true })).toBeVisible();
});
