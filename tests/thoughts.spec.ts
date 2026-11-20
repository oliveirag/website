import { test, expect, motionSettled, type Page, type Locator } from './fixtures';
import { contentOverField } from './field';
import { textBelowAA } from './sky-text';
import { cssFromHex } from './contrast';

// These run against the build with the fixture posts in tests/fixtures/thoughts (the "fixtures" project in
// playwright.config.ts). empty-states.spec.ts covers the page with no posts, and pages.spec.ts checks these never
// reach the live build.

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
  expect(reading.font).toMatch(SOURCE_SERIF);
  expect(reading.size).toBeGreaterThanOrEqual(16);
  expect(reading.leading).toBeGreaterThanOrEqual(1.5);
  expect(reading.charsPerLine).toBeLessThanOrEqual(75);
});

const SOURCE_SERIF = /^"?Source Serif 4"?,/;
const INSTRUMENT_SERIF = /^"?Instrument Serif"?,/;
const JETBRAINS_MONO = /^"?JetBrains Mono"?,/;
const fontOf = (locator: Locator) => locator.first().evaluate((el) => getComputedStyle(el).fontFamily);

test('a post reads in Source Serif 4 from the site\'s own files, with its title in Instrument Serif and code in JetBrains Mono', async ({ page }) => {
  const fontFiles: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/fonts/')) fontFiles.push(path);
  });
  await page.goto(newestFirst[0].href);
  const main = page.getByRole('main');

  expect(await fontOf(main.getByRole('heading', { level: 1 }))).toMatch(INSTRUMENT_SERIF);
  expect(await fontOf(main.locator('time'))).toMatch(SOURCE_SERIF);
  for (const text of [main.locator('p').filter({ hasText: 'Lorem ipsum' }), main.getByRole('heading', { level: 2 }), main.locator('em'), main.locator('blockquote')]) {
    expect(await fontOf(text)).toMatch(SOURCE_SERIF);
  }
  expect(await fontOf(main.locator('pre code'))).toMatch(JETBRAINS_MONO);
  expect(await fontOf(main.locator('p code'))).toMatch(JETBRAINS_MONO);

  // The regular and italic faces load from the site itself, and text shows in a fallback while they do.
  const faces = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((face) => face.family.replace(/"/g, '') === 'Source Serif 4' && face.status === 'loaded')
      .map((face) => ({ style: face.style, weight: face.weight, display: face.display }));
  });
  expect(faces).toEqual(expect.arrayContaining([
    { style: 'normal', weight: '400', display: 'swap' },
    { style: 'italic', weight: '400', display: 'swap' },
  ]));
  expect(fontFiles).toEqual(expect.arrayContaining(['/fonts/source-serif-4-latin-400-normal.woff2', '/fonts/source-serif-4-latin-400-italic.woff2']));
});

// Measured from antwi.dev's posts at 1200px wide, the layout the post follows.
test('a post sits in a centred 592px column with book-like spacing, grey text and darker headings', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(newestFirst[0].href);
  const layout = await page.evaluate(() => {
    const sky = document.getElementById('sky')!;
    const box = (el: Element) => el.getBoundingClientRect();
    const prose = sky.querySelector('.prose')!;
    const paragraphs = [...prose.querySelectorAll(':scope > p')];
    const lorem = paragraphs.find((p) => p.textContent!.startsWith('Lorem ipsum'))!;
    const h2 = prose.querySelector('h2')!;
    const root = getComputedStyle(document.documentElement);
    const style = (el: Element) => getComputedStyle(el);
    return {
      sky: { left: box(sky).left, right: box(sky).right },
      column: { left: box(prose).left, right: box(prose).right, width: box(prose).width },
      titleLeft: box(sky.querySelector('h1')!).left,
      dateToText: box(prose.firstElementChild!).top - box(sky.querySelector('time')!).bottom,
      betweenParagraphs: box(lorem.nextElementSibling!).top - box(lorem).bottom,
      aboveHeading: box(h2).top - box(h2.previousElementSibling!).bottom,
      belowHeading: box(h2.nextElementSibling!).top - box(h2).bottom,
      size: style(lorem).fontSize,
      lineHeight: style(lorem).lineHeight,
      text: style(lorem).color,
      heading: style(h2).color,
      secondary: root.getPropertyValue('--text-secondary').trim(),
      primary: root.getPropertyValue('--text-primary').trim(),
    };
  });
  expect(layout.column.width).toBe(592);
  expect(Math.abs((layout.column.left - layout.sky.left) - (layout.sky.right - layout.column.right))).toBeLessThanOrEqual(1);
  expect(layout.titleLeft).toBe(layout.column.left);
  expect(layout.dateToText).toBe(24);
  expect(layout.betweenParagraphs).toBe(16);
  expect(layout.aboveHeading).toBe(32);
  expect(layout.belowHeading).toBe(16);
  expect(layout.size).toBe('17px');
  expect(layout.lineHeight).toBe('28px');
  expect(layout.text).toBe(cssFromHex(layout.secondary));
  expect(layout.heading).toBe(cssFromHex(layout.primary));
});

// Under a divider at the end of a post: "Previous" on the left goes to the newer post, "Next" on the right to the
// older one. content-build.spec.ts covers a post with neither.
const neighbours = (page: Page) => page.getByRole('navigation', { name: 'more thoughts' });

test('the newest post links only to the next, older post, under a divider', async ({ page }) => {
  await page.goto(newestFirst[0].href);
  const more = neighbours(page);
  await expect(more).toHaveCSS('border-top-style', 'solid');
  await expect(more.getByRole('link')).toHaveCount(1);
  const next = more.getByRole('link', { name: `Next ${newestFirst[1].title}` });
  await expect(next).toHaveAttribute('href', newestFirst[1].href);
  await next.click();
  await expect(page).toHaveURL(newestFirst[1].href);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(newestFirst[1].title);
});

test('the oldest post links only to the previous, newer post', async ({ page }) => {
  await page.goto(newestFirst[2].href);
  const more = neighbours(page);
  await expect(more).toHaveCSS('border-top-style', 'solid');
  await expect(more.getByRole('link')).toHaveCount(1);
  await expect(more.getByRole('link', { name: `Previous ${newestFirst[1].title}` })).toHaveAttribute('href', newestFirst[1].href);
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`a post in the middle has Previous on the left and Next on the right, each a 44px target (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(newestFirst[1].href);
    const more = neighbours(page);
    const previous = more.getByRole('link', { name: `Previous ${newestFirst[0].title}` });
    const next = more.getByRole('link', { name: `Next ${newestFirst[2].title}` });
    await expect(previous).toHaveAttribute('href', newestFirst[0].href);
    await expect(next).toHaveAttribute('href', newestFirst[2].href);
    await more.scrollIntoViewIfNeeded();
    await expect(previous).toBeVisible();
    await expect(next).toBeVisible();
    const [p, n, column] = [(await previous.boundingBox())!, (await next.boundingBox())!, (await page.locator('#sky .prose').boundingBox())!];
    expect(Math.round(p.x)).toBe(Math.round(column.x));
    expect(Math.round(n.x + n.width)).toBe(Math.round(column.x + column.width));
    expect(p.x + p.width).toBeLessThanOrEqual(n.x);
    for (const box of [p, n]) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });
}

test('on Thoughts, each post\'s title, date and summary are in Source Serif 4 and the page title stays in Instrument Serif', async ({ page }) => {
  await page.goto('/thoughts');
  expect(await fontOf(page.getByRole('heading', { level: 1, name: 'thoughts' }))).toMatch(INSTRUMENT_SERIF);
  const first = page.getByRole('list', { name: 'posts' }).getByRole('listitem').first();
  for (const text of [first.getByRole('link'), first.locator('time'), first.getByText(newestFirst[0].summary!)]) {
    expect(await fontOf(text)).toMatch(SOURCE_SERIF);
  }
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

// Each post title and the feed link stand alone, so each is a control with a 44px target.
for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`the post titles and the rss link on Thoughts are at least 44px to click or tap (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/thoughts');
    const links = [...(await page.getByRole('list', { name: 'posts' }).getByRole('link').all()), page.getByRole('link', { name: 'rss' })];
    expect(links.length).toBe(4);
    for (const link of links) {
      const box = (await link.boundingBox())!;
      expect(box.height, await link.textContent() ?? '').toBeGreaterThanOrEqual(44);
      expect(box.width, await link.textContent() ?? '').toBeGreaterThanOrEqual(44);
    }
  });
}

test('the list and every post fit a 390px phone with no sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/thoughts', ...newestFirst.map((post) => post.href)]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => {
      const sky = document.getElementById('sky')!;
      return { page: document.documentElement.scrollWidth - window.innerWidth, sky: sky.scrollWidth - sky.clientWidth };
    });
    expect(overflow, path).toEqual({ page: 0, sky: 0 });
  }
});

// The Sky fades its content out at the top. On a post the text runs up under the navigation and fades over a
// longer stretch, as on antwi.dev, while the list keeps the short fade every other page has.
test('a post\'s text fades out under the navigation over a longer stretch than on the list', async ({ page }) => {
  const topFade = () =>
    page.evaluate(() => {
      const sky = document.getElementById('sky')!;
      const style = getComputedStyle(sky);
      const opaqueFrom = Number(style.maskImage.match(/rgb\(0, 0, 0\) ([\d.]+)px/)![1]);
      const navBottom = document.querySelector('.site-header-row')!.getBoundingClientRect().bottom;
      return { opaqueFrom, top: sky.getBoundingClientRect().top, navBottom };
    });
  await page.goto('/thoughts');
  const list = await topFade();
  expect(list.opaqueFrom).toBe(16);
  expect(list.top).toBe(list.navBottom);

  await page.getByRole('link', { name: newestFirst[0].title }).click();
  await expect(page).toHaveURL(newestFirst[0].href);
  const post = await topFade();
  expect(post.opaqueFrom).toBeGreaterThanOrEqual(40);
  expect(post.top).toBeLessThan(post.navBottom);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'thoughts' }).click();
  await expect(page).toHaveURL(/\/thoughts\/?$/);
  expect(await topFade()).toEqual(list);
});
