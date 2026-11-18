import { test, expect, motionSettled, type Page } from './fixtures';
import { contentOverField } from './field';
import { textBelowAA } from './sky-text';

// These run against the build with the fixture posts in tests/fixtures/thoughts (the "thoughts" project in
// playwright.config.ts). The live build has no posts, and pages.spec.ts checks its empty state.

const newestFirst = [
  { title: 'Fixture post on the ridge', date: '2026-09-14', summary: 'The newest fixture post, long enough to scroll, with every kind of text a post can hold.', href: '/thoughts/on-the-ridge/' },
  { title: 'Fixture post without a summary', date: '2026-06-20', summary: null, href: '/thoughts/a-short-one/' },
  { title: 'Fixture post at first light', date: '2026-03-02', summary: 'The oldest fixture post.', href: '/thoughts/first-light/' },
];

test('Thoughts lists the posts newest first with their title, date and summary', async ({ page }) => {
  await page.goto('/thoughts');
  await expect(page.getByRole('heading', { name: 'thoughts', level: 1 })).toBeVisible();
  await expect(page.getByText('nothing written yet. check back soon.')).toHaveCount(0);

  const posts = page.getByRole('main').getByRole('list', { name: 'posts' }).getByRole('listitem');
  await expect(posts).toHaveCount(newestFirst.length);
  for (const [i, post] of newestFirst.entries()) {
    const item = posts.nth(i);
    await expect(item.getByRole('link', { name: post.title })).toHaveAttribute('href', post.href);
    await expect(item.locator('time')).toHaveText(post.date);
    await expect(item.locator('time')).toHaveAttribute('datetime', post.date);
    if (post.summary) await expect(item.getByText(post.summary)).toBeVisible();
    else await expect(item.locator('p')).toHaveCount(0);
  }
});

test('a post opens from the list on its own page with a serif title and comfortable reading text', async ({ page }) => {
  const post = newestFirst[0];
  await page.goto('/thoughts');
  await page.getByRole('link', { name: post.title }).click();
  await expect(page).toHaveURL(post.href);
  await expect(page).toHaveTitle(`${post.title} | gui's website`);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', post.summary!);

  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText(post.title);
  await expect(heading).toHaveCSS('font-family', /^"?Instrument Serif"?,/);
  await expect(heading).toHaveCSS('font-weight', '400');
  await expect(page.getByRole('main').locator('time')).toHaveText(post.date);
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'thoughts' })).toHaveAttribute('aria-current', 'page');

  // The post's own MDX is on the page.
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 2, name: 'A subheading' })).toBeVisible();
  await expect(main.getByRole('link', { name: 'link to the Thoughts page' })).toHaveAttribute('href', '/thoughts');
  await expect(main.getByRole('listitem')).toHaveCount(3);
  await expect(main.locator('blockquote')).toContainText('A quote that sits in the post');
  await expect(main.locator('pre')).toContainText("const trail = ['start', 'ridge', 'summit'];");

  // Comfortable to read: body text at least 16px, lines at least 1.5 apart and no longer than 75 characters.
  const reading = await main.locator('p').filter({ hasText: 'Lorem ipsum' }).evaluate((p) => {
    const style = getComputedStyle(p);
    const ch = document.createElement('span');
    ch.style.cssText = 'display:inline-block;width:1ch';
    p.append(ch);
    const charWidth = ch.getBoundingClientRect().width;
    ch.remove();
    return {
      font: style.fontFamily,
      size: parseFloat(style.fontSize),
      leading: parseFloat(style.lineHeight) / parseFloat(style.fontSize),
      charsPerLine: p.getBoundingClientRect().width / charWidth,
    };
  });
  expect(reading.font).toMatch(/^"?JetBrains Mono"?,/);
  expect(reading.size).toBeGreaterThanOrEqual(16);
  expect(reading.leading).toBeGreaterThanOrEqual(1.5);
  expect(reading.charsPerLine).toBeLessThanOrEqual(75);
});

test('a post with no summary has its own page too, opened straight from its address', async ({ page }) => {
  const post = newestFirst[1];
  await page.goto(post.href);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(post.title);
  await expect(page.getByRole('main').locator('time')).toHaveText(post.date);
  await expect(page.getByRole('main')).toContainText('A short fixture post with no summary.');
});

// Reads an RSS document the way a feed reader would, in the browser's own XML parser.
async function readFeed(page: Page, xml: string) {
  return page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, 'application/xml');
    const text = (parent: Element | Document, tag: string) => parent.querySelector(tag)?.textContent ?? null;
    return {
      parseError: doc.querySelector('parsererror')?.textContent ?? null,
      title: text(doc.querySelector('channel')!, 'channel > title'),
      link: text(doc.querySelector('channel')!, 'channel > link'),
      items: [...doc.querySelectorAll('item')].map((item) => ({
        title: text(item, 'title'),
        link: text(item, 'link'),
        pubDate: text(item, 'pubDate'),
        description: text(item, 'description'),
      })),
    };
  }, xml);
}

test('the RSS feed lists the posts newest first, each linking to its page', async ({ page }) => {
  const response = await page.request.get('/thoughts/rss.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/xml/);
  const feed = await readFeed(page, await response.text());
  expect(feed.parseError).toBeNull();
  expect(feed.title).toMatch(/thoughts/);
  expect(feed.link).toBe('https://notgui.com/thoughts/');
  expect(feed.items).toEqual(
    newestFirst.map((post) => ({
      title: post.title,
      link: `https://notgui.com${post.href}`,
      pubDate: new Date(`${post.date}T00:00:00Z`).toUTCString(),
      description: post.summary,
    })),
  );
});

test('every page points feed readers at the feed, and Thoughts links to it', async ({ page }) => {
  for (const path of ['/', '/thoughts', newestFirst[0].href]) {
    await page.goto(path);
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', '/thoughts/rss.xml');
  }
  await page.goto('/thoughts');
  await expect(page.getByRole('main').getByRole('link', { name: 'rss' })).toHaveAttribute('href', '/thoughts/rss.xml');
});

const thoughtsPages = { list: '/thoughts', 'a long post': newestFirst[0].href };

for (const theme of ['night', 'day'] as const) {
  for (const [name, path] of Object.entries(thoughtsPages)) {
    test(`in ${theme}, all text on ${name} reaches 4.5:1 from the top of the sky to the horizon`, async ({ page }) => {
      await page.goto(path);
      if (theme === 'day') await page.getByRole('button', { name: /^theme:/ }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      // Colours ease to the new theme, so they are read once every transition has finished.
      await motionSettled(page);
      const { found, failures, rows } = await textBelowAA(page);
      expect(found.length).toBeGreaterThan(name === 'list' ? 6 : 15);
      if (process.env.PRINT_CONTRAST) console.log(`\n${theme}, ${name}\n${rows.join('\n')}`);
      expect(failures).toEqual([]);
    });
  }
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 667, height: 375 }]) {
  test(`the list and a long post scroll in the Sky and never touch the grass (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of Object.values(thoughtsPages)) {
      await page.goto(path);
      const sky = page.getByRole('main');
      if (path !== '/thoughts') expect(await sky.evaluate((el) => el.scrollHeight > el.clientHeight), 'the long post scrolls').toBe(true);
      for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        await sky.evaluate((el, f) => el.scrollTo({ top: (el.scrollHeight - el.clientHeight) * f, behavior: 'instant' }), fraction);
        expect(await contentOverField(page), `${path}, scrolled ${fraction * 100}%`).toEqual([]);
      }
    }
  });
}

// Body text stays achromatic (ADR-0001), and code is body text: it is grey on a surface, never syntax colours,
// and it follows Night and Day like the rest of the page.
test('code in a post is grey on its own surface and follows Night and Day', async ({ page }) => {
  await page.goto(newestFirst[0].href);
  const codeColours = () =>
    page.getByRole('main').locator('pre').evaluate((pre) => {
      const rgb = (el: Element, key: 'color' | 'backgroundColor') => getComputedStyle(el)[key].match(/\d+/g)!.slice(0, 3).map(Number);
      return {
        text: [pre, ...pre.querySelectorAll('*')].map((el) => rgb(el, 'color')),
        background: rgb(pre, 'backgroundColor'),
        page: rgb(document.getElementById('sky')!, 'color'),
      };
    });
  const grey = ([r, g, b]: number[]) => r === g && g === b;

  const night = await codeColours();
  await page.getByRole('button', { name: /^theme:/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');
  await motionSettled(page);
  const day = await codeColours();

  for (const [theme, colours] of Object.entries({ night, day })) {
    expect(colours.text.filter((c) => !grey(c)), `${theme}: coloured code`).toEqual([]);
    expect(grey(colours.background), `${theme}: code background`).toBe(true);
  }
  expect(day.background).not.toEqual(night.background);
  expect(day.text[0]).not.toEqual(night.text[0]);
});
