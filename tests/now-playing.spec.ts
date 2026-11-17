import { test, expect, stubApis, reply, track, type Page } from './fixtures';

const nowPlaying = (page: Page) => page.getByRole('region', { name: 'Now Playing' });

test.describe('Now Playing', () => {
  test('shows the track when something is playing', async ({ page }) => {
    await page.goto('/');

    await expect(nowPlaying(page)).toContainText(track.title);
    await expect(nowPlaying(page)).toContainText(track.artist);
    await expect(nowPlaying(page)).not.toContainText('Loading...');
  });

  test('shows offline when the API returns nothing', async ({ page }) => {
    await stubApis(page, { nowPlaying: reply.noContent() });
    await page.goto('/');

    await expect(nowPlaying(page)).toContainText('Currently offline');
    await expect(nowPlaying(page)).not.toContainText('Loading...');
  });

  test('shows an error when the API fails', async ({ page }) => {
    await stubApis(page, { nowPlaying: reply.serverError() });
    await page.goto('/');

    await expect(nowPlaying(page)).toContainText("Couldn't load");
    await expect(nowPlaying(page)).not.toContainText('Loading...');
  });

  test('shows an error when the request never reaches the API', async ({ page }) => {
    await stubApis(page, { nowPlaying: reply.networkError() });
    await page.goto('/');

    await expect(nowPlaying(page)).toContainText("Couldn't load");
    await expect(nowPlaying(page)).not.toContainText('Loading...');
  });

  test('shows a loading state until the API answers', async ({ page }) => {
    let release!: () => void;
    const answered = new Promise<void>((resolve) => (release = resolve));
    await stubApis(page, {
      nowPlaying: async (route) => {
        await answered;
        await reply.json(track)(route);
      },
    });
    await page.goto('/');

    await expect(nowPlaying(page)).toContainText('Loading...');
    release();
    await expect(nowPlaying(page)).toContainText(track.title);
  });

  test('renders the track as text, never as HTML', async ({ page }) => {
    const title = '<img src=x id="injected-title">';
    const artist = '<b id="injected-artist">bold</b>';
    await stubApis(page, { nowPlaying: reply.json({ ...track, title, artist }) });
    await page.goto('/');

    await expect(nowPlaying(page)).toContainText(title);
    await expect(nowPlaying(page)).toContainText(artist);
    await expect(page.locator('#injected-title, #injected-artist')).toHaveCount(0);
  });

  test('keeps updating without going back to loading', async ({ page }) => {
    await page.clock.install();
    let calls = 0;
    await stubApis(page, {
      nowPlaying: (route) => (++calls === 1 ? reply.json(track)(route) : reply.noContent()(route)),
    });
    await page.goto('/');
    await expect(nowPlaying(page)).toContainText(track.title);

    await page.clock.runFor(10_000);

    await expect(nowPlaying(page)).toContainText('Currently offline');
    await expect(nowPlaying(page)).not.toContainText('Loading...');
  });
});
