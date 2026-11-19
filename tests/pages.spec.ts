import { test, expect } from './fixtures';
import { contrastRatio, rgbaFromCss, rgbaFromHex } from './contrast';

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
  await expect(page.getByText('my favorite media (updated nov 2026)', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Valorant' })).toHaveCount(0);
  const lists = {
    '#movies': ['The Prestige', 'Interstellar', 'Fight Club', 'Shutter Island', 'Shawshank Redemption'],
    '#anime': ['Vinland Saga', 'Attack on Titan', 'Hunter x Hunter', 'Solo Leveling', 'Chainsaw Man'],
    '#video-games': ['CSGO', 'Ghost of Tsushima', 'Red Dead Redemption 2', 'AC Black Flag Resynced', 'The Last Of Us Part 1'],
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

// The fixture posts and videos only ever reach the test builds. These hold whatever the real lists contain.
test('the live build has none of the test posts, in its pages or its feed', async ({ page }) => {
  const feed = await page.request.get('/thoughts/rss.xml');
  expect(feed.status()).toBe(200);
  expect(await feed.text()).not.toContain('Fixture post');
  for (const slug of ['on-the-ridge', 'a-short-one', 'first-light']) {
    expect((await page.request.get(`/thoughts/${slug}/`)).status(), slug).toBe(404);
  }
});

test('the live build has none of the test videos', async ({ page }) => {
  const html = await (await page.request.get('/videos')).text();
  for (const id of ['fixtureNew1', 'fixtureMid1', 'fixtureOld1']) expect(html, id).not.toContain(id);
  expect(html).not.toContain('Fixture video');
});

for (const theme of ['night', 'day'] as const) {
  test(`in the Chatbot, guiBot's messages show the guiBot logo and a blue name that reads on the panel (${theme})`, async ({ page }) => {
    await page.goto('/chatbot');
    if (theme === 'day') await page.getByRole('button', { name: /^theme:/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    const chatbot = page.locator('#chatbot');
    const name = chatbot.getByText('guiBot', { exact: true }).first();
    await expect(name).toBeVisible();
    await expect(chatbot.locator('img[src="/images/projects/guibot.png"]').first()).toBeVisible();
    await expect(chatbot.getByText('r', { exact: true })).toHaveCount(0);

    const colour = rgbaFromCss(await name.evaluate((node) => getComputedStyle(node).color));
    const [r, g, b] = colour;
    expect(b, 'blue is the strongest channel').toBeGreaterThan(Math.max(r, g) + 40);
    const panel = rgbaFromHex(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface-default').trim()));
    expect(contrastRatio(colour, panel)).toBeGreaterThanOrEqual(4.5);
  });
}

// Until the Chatbot's script has loaded, a message typed into the server-rendered box would be wiped when the
// script takes over, and Send would reload the page. So the box and Send take nothing until the Chatbot is ready.
test('the Chatbot takes no message until it is ready, then sends one', async ({ page }) => {
  let release!: () => void;
  const scriptHeld = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/_astro/ChatBot.*.js', async (route) => {
    await scriptHeld;
    await route.continue();
  });
  await page.route('https://my-website-spotify-api.vercel.app/api/chatbot', (route) => {
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
    };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ botOutput: 'ready now' }) });
  });
  await page.goto('/chatbot', { waitUntil: 'domcontentloaded' });

  const message = page.getByRole('textbox', { name: 'Message' });
  await expect(message).toBeVisible();
  await expect(message).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Send message' })).toBeDisabled();

  release();
  await message.fill('hi gui');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('ready now')).toBeVisible();
  await expect(page.getByText('hi gui')).toBeVisible();
});

// Each poster's rank badge sits over its top-left corner. The rows scroll sideways, which clips anything outside
// them, so every badge has to sit inside its row: none cut off at the top, and the first one not cut off at the left.
for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`no Top 5 rank badge is cut off (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/top-5');
    for (const list of ['movies', 'anime', 'video-games']) {
      const row = page.locator(`#${list} > div`).nth(1);
      const rowBox = (await row.boundingBox())!;
      const badges = row.locator('span.rounded-full');
      await expect(badges).toHaveCount(5);
      for (const [index, badge] of (await badges.all()).entries()) {
        const box = (await badge.boundingBox())!;
        expect(box.y, `${list} #${index + 1} top`).toBeGreaterThanOrEqual(rowBox.y);
        if (index === 0) expect(box.x, `${list} #1 left`).toBeGreaterThanOrEqual(rowBox.x);
      }
    }
  });
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`the Chatbot message box and Send are at least 44px tall (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/chatbot');
    for (const control of [page.getByRole('textbox', { name: 'Message' }), page.getByRole('button', { name: 'Send message' })]) {
      const box = (await control.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
}
