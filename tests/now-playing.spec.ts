import { test, expect, stubApis, reply, track, motionSettled, type Page } from './fixtures';

const nowPlaying = (page: Page) => page.getByRole('region', { name: 'Now Playing' });

test.describe('Now Playing', () => {
  test('shows one line, "title - artist", directly above the photo while a track plays', async ({ page }) => {
    await page.goto('/');

    await expect(nowPlaying(page)).toBeVisible();
    await expect(nowPlaying(page)).toHaveText('Pink + White - Frank Ocean');
    await motionSettled(page);
    const line = (await nowPlaying(page).boundingBox())!;
    const photo = (await page.getByRole('img', { name: 'Guilherme Oliveira' }).boundingBox())!;
    expect(line.height).toBeLessThanOrEqual(24);
    expect(line.y + line.height).toBeLessThanOrEqual(photo.y);
    expect(photo.y - (line.y + line.height)).toBeLessThanOrEqual(16);
    expect(line.x).toBeGreaterThanOrEqual(photo.x - 1);
    expect(line.x + line.width).toBeLessThanOrEqual(photo.x + photo.width + 1);
  });

  // Nothing shows, but the line keeps its place so the photo doesn't move.
  async function expectHidden(page: Page) {
    await expect(nowPlaying(page)).toHaveText('');
    await expect(nowPlaying(page).locator(':visible')).toHaveCount(0);
  }

  const nothingPlaying = {
    'the API returns nothing (offline)': reply.noContent(),
    'the track is paused': reply.json({ ...track, isPlaying: false }),
    'the API fails': reply.serverError(),
    'the request never reaches the API': reply.networkError(),
  };
  for (const [when, answer] of Object.entries(nothingPlaying)) {
    test(`disappears when ${when}`, async ({ page }) => {
      await stubApis(page, { nowPlaying: answer });
      await page.goto('/');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectHidden(page);
    });
  }

  test('shows nothing until the API answers, then the track', async ({ page }) => {
    let release!: () => void;
    const answered = new Promise<void>((resolve) => (release = resolve));
    await stubApis(page, {
      nowPlaying: async (route) => {
        await answered;
        await reply.json(track)(route);
      },
    });
    await page.goto('/');

    await expectHidden(page);
    release();
    await expect(nowPlaying(page)).toHaveText('Pink + White - Frank Ocean');
  });

  test('the photo stays in place when a track starts playing', async ({ page }) => {
    await page.clock.install();
    let calls = 0;
    await stubApis(page, {
      nowPlaying: (route) => (++calls === 1 ? reply.noContent()(route) : reply.json(track)(route)),
    });
    await page.goto('/');
    const photo = page.getByRole('img', { name: 'Guilherme Oliveira' });
    await expectHidden(page);
    await motionSettled(page);
    const before = (await photo.boundingBox())!;

    await page.clock.runFor(10_000);

    await expect(nowPlaying(page)).toHaveText('Pink + White - Frank Ocean');
    expect((await photo.boundingBox())!.y).toBe(before.y);
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

  test('disappears when the track stops on a later poll', async ({ page }) => {
    await page.clock.install();
    let calls = 0;
    await stubApis(page, {
      nowPlaying: (route) => (++calls === 1 ? reply.json(track)(route) : reply.noContent()(route)),
    });
    await page.goto('/');
    await expect(nowPlaying(page)).toContainText(track.title);

    await page.clock.runFor(10_000);

    await expectHidden(page);
  });
});
