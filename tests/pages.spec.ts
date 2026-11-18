import { test, expect } from './fixtures';

test('Home holds About, Projects and Commits, and no tab switcher', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('about me')).toBeVisible();
  await expect(page.getByRole('link', { name: /Zaklang/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Commits' })).toContainText('412 commits in 2026');
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Message' })).toHaveCount(0);
  await expect(page.getByText('my favorite media')).toHaveCount(0);
});

test('Top 5 is its own page with the movies, anime and video games lists', async ({ page }) => {
  await page.goto('/top-5');
  await expect(page).toHaveTitle(/top 5/);
  await expect(page.getByRole('heading', { name: 'top 5' })).toBeVisible();
  const lists = {
    '#movies': ['The Prestige', 'Interstellar', 'Fight Club', 'Shutter Island', 'Shawshank Redemption'],
    '#anime': ['Vinland Saga', 'Attack on Titan', 'Hunter x Hunter', 'Solo Leveling', 'Chainsaw Man'],
    '#video-games': ['CSGO', 'Ghost of Tsushima', 'Red Dead Redemption 2', 'The Last Of Us Part 1', 'Valorant'],
  };
  for (const [list, titles] of Object.entries(lists)) {
    const shown = await page.locator(list).getByRole('img').evaluateAll((images) => images.map((img) => img.getAttribute('alt')));
    expect(shown).toEqual(titles);
    for (const title of titles) await expect(page.locator(list).getByRole('img', { name: title })).toBeVisible();
  }
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`Chatbot is its own page and fits inside the Sky (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/chatbot');
    await expect(page).toHaveTitle(/chatbot/);
    await expect(page.getByText('GuiBot 1.0')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();

    // The whole panel shows at once: the Sky does not scroll, and the panel ends above the fade.
    const fit = await page.evaluate(() => {
      const sky = document.getElementById('sky')!;
      const clearBottom = sky.getBoundingClientRect().bottom - parseFloat(getComputedStyle(sky).paddingBottom);
      return {
        overflow: sky.scrollHeight - sky.clientHeight,
        belowClearArea: document.getElementById('chatbot')!.getBoundingClientRect().bottom - clearBottom,
      };
    });
    expect(fit.overflow).toBeLessThanOrEqual(1);
    expect(fit.belowClearArea).toBeLessThanOrEqual(0.5);
  });
}

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
  });
}

test('the live build has no Thoughts posts: its feed is empty and the test posts are not there', async ({ page }) => {
  const feed = await page.request.get('/thoughts/rss.xml');
  expect(feed.status()).toBe(200);
  const items = await page.evaluate(
    (xml) => new DOMParser().parseFromString(xml, 'application/xml').querySelectorAll('channel > item').length,
    await feed.text(),
  );
  expect(items).toBe(0);
  for (const slug of ['on-the-ridge', 'a-short-one', 'first-light']) {
    expect((await page.request.get(`/thoughts/${slug}/`)).status(), slug).toBe(404);
  }
});
