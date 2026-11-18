import { test, expect, motionSettled, PLAYER_HOST, THUMBNAIL_HOST, type Page } from './fixtures';
import { contentOverField } from './field';
import { textBelowAA } from './sky-text';

// These run against the build with the fixture list in tests/fixtures/videos.json (the "fixtures" project in
// playwright.config.ts), whose entries are out of date order on purpose. empty-states.spec.ts covers the page
// with no videos, and pages.spec.ts checks these never reach the live build.

const newestFirst = [
  { id: 'fixtureNew1', title: 'Fixture video, the newest one', date: '2026-09-14' },
  { id: 'fixtureMid1', title: 'Fixture video from the summer hike', date: '2026-06-20' },
  { id: 'fixtureOld1', title: 'Fixture video, the oldest one', date: '2026-03-02' },
];

const videos = (page: Page) => page.getByRole('main').getByRole('list', { name: 'videos' }).getByRole('listitem');

test('Videos lists the videos newest first with a thumbnail, title and date', async ({ page }) => {
  await page.goto('/videos');
  await expect(page.getByRole('heading', { name: 'videos', level: 1 })).toBeVisible();
  await expect(page.getByText('no videos yet. coming soon.')).toHaveCount(0);

  await expect(videos(page)).toHaveCount(newestFirst.length);
  for (const [i, video] of newestFirst.entries()) {
    const item = videos(page).nth(i);
    await expect(item.getByRole('heading', { name: video.title })).toBeVisible();
    await expect(item.locator('time')).toHaveText(video.date);
    await expect(item.locator('time')).toHaveAttribute('datetime', video.date);
    const thumbnail = item.locator('img');
    await expect(thumbnail).toHaveAttribute('src', new RegExp(`^${THUMBNAIL_HOST}/vi/${video.id}/`));
    await thumbnail.scrollIntoViewIfNeeded();
    await expect.poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
});

const playButton = (page: Page, title: string) => page.getByRole('button', { name: `play ${title}` });
const playerFor = (id: string) => `${PLAYER_HOST}/embed/${id}?autoplay=1`;

// Every request to the player's host from the moment the page starts loading.
function playerRequests(page: Page) {
  const seen: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith(PLAYER_HOST)) seen.push(request.url());
  });
  return seen;
}

test('no player loads until play is pressed, then only that video gets one', async ({ page }) => {
  const requests = playerRequests(page);
  await page.goto('/videos');
  for (const video of newestFirst) await expect(playButton(page, video.title)).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(requests).toEqual([]);

  const [, middle] = newestFirst;
  await playButton(page, middle.title).click();

  const player = videos(page).nth(1).locator('iframe');
  await expect(player).toHaveAttribute('src', playerFor(middle.id));
  await expect(player).toHaveAttribute('title', middle.title);
  await expect(page.locator('iframe')).toHaveCount(1);
  await expect(playButton(page, middle.title)).toHaveCount(0);
  for (const other of [newestFirst[0], newestFirst[2]]) await expect(playButton(page, other.title)).toBeVisible();
  await expect.poll(() => requests).toEqual([playerFor(middle.id)]);
  // Focus moves into the player, so a keyboard visitor carries on from there.
  await expect(player).toBeFocused();
});

test('play works from the keyboard and its button is big enough to tap', async ({ page }) => {
  await page.goto('/videos');
  const [newest] = newestFirst;
  const button = playButton(page, newest.title);
  const box = (await button.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);

  await button.focus();
  await page.keyboard.press('Enter');
  await expect(videos(page).first().locator('iframe')).toHaveAttribute('src', playerFor(newest.id));
});

const navLink = (page: Page, name: string) => page.getByRole('navigation').getByRole('link', { name, exact: true });

test('play works after arriving through the navigation, leaving and coming back', async ({ page }) => {
  await page.goto('/');
  await navLink(page, 'videos').click();
  await expect(page).toHaveURL(/\/videos$/);
  await playButton(page, newestFirst[0].title).click();
  await expect(page.locator('iframe')).toHaveAttribute('src', playerFor(newestFirst[0].id));

  await navLink(page, 'thoughts').click();
  await expect(page).toHaveURL(/\/thoughts$/);
  await expect(page.locator('iframe')).toHaveCount(0);

  await navLink(page, 'videos').click();
  await expect(page).toHaveURL(/\/videos$/);
  // A fresh page: every video is back to its thumbnail, and play works again.
  await expect(page.locator('iframe')).toHaveCount(0);
  await playButton(page, newestFirst[2].title).click();
  await expect(page.locator('iframe')).toHaveCount(1);
  await expect(videos(page).nth(2).locator('iframe')).toHaveAttribute('src', playerFor(newestFirst[2].id));
});

// The sound engine reports on the document whether the Ambience is playing. These read only that, never audio.
const ambience = (page: Page) => page.locator('html');
const soundControl = (page: Page) => page.getByRole('button', { name: /^sound:/ });

test('the Ambience pauses when a video starts and comes back after leaving the page', async ({ page }) => {
  await page.goto('/videos');
  await page.getByRole('heading', { name: 'videos', level: 1 }).click();
  await expect(ambience(page)).toHaveAttribute('data-ambience', 'playing');

  await playButton(page, newestFirst[0].title).click();
  await expect(ambience(page)).toHaveAttribute('data-ambience', 'paused');
  // Only the Ambience stops: sound itself stays on, so Cues still play.
  await expect(ambience(page)).toHaveAttribute('data-sound', 'playing');

  // Muting and unmuting while the video is there doesn't bring the Ambience back over it.
  await soundControl(page).click();
  await soundControl(page).click();
  await expect(ambience(page)).toHaveAttribute('data-sound', 'playing');
  await expect(ambience(page)).toHaveAttribute('data-ambience', 'paused');

  await navLink(page, 'thoughts').click();
  await expect(page).toHaveURL(/\/thoughts$/);
  await expect(ambience(page)).toHaveAttribute('data-ambience', 'playing');
});

test('pressing play as the very first gesture unlocks sound but keeps the Ambience paused', async ({ page }) => {
  await page.goto('/videos');
  await expect(ambience(page)).toHaveAttribute('data-sound', 'locked');
  await playButton(page, newestFirst[0].title).click();
  await expect(ambience(page)).toHaveAttribute('data-sound', 'playing');
  await expect(ambience(page)).toHaveAttribute('data-ambience', 'paused');
});

for (const theme of ['night', 'day'] as const) {
  test(`in ${theme}, all text on Videos reaches 4.5:1 from the top of the sky to the horizon`, async ({ page }) => {
    await page.goto('/videos');
    if (theme === 'day') await page.getByRole('button', { name: /^theme:/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    // Colours ease to the new theme, so they are read once every transition has finished.
    await motionSettled(page);
    const { found, failures, rows } = await textBelowAA(page);
    expect(found.length).toBeGreaterThan(6);
    if (process.env.PRINT_CONTRAST) console.log(`\n${theme}, videos\n${rows.join('\n')}`);
    expect(failures).toEqual([]);
  });
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 667, height: 375 }]) {
  test(`Videos scrolls in the Sky and never touches the grass, before and after a player loads (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/videos');
    const sky = page.getByRole('main');
    expect(await sky.evaluate((el) => el.scrollHeight > el.clientHeight), 'the list scrolls').toBe(true);
    const everyScroll = async (when: string) => {
      for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        await sky.evaluate((el, f) => el.scrollTo({ top: (el.scrollHeight - el.clientHeight) * f, behavior: 'instant' }), fraction);
        expect(await contentOverField(page), `${when}, scrolled ${fraction * 100}%`).toEqual([]);
      }
    };
    await everyScroll('thumbnails');

    await playButton(page, newestFirst[2].title).click();
    await expect(page.locator('iframe')).toHaveCount(1);
    await everyScroll('with a player');
  });
}
