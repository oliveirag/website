import { test, expect, motionSettled, type Page } from './fixtures';
import { textBelowAA } from './sky-text';
import { contrastRatio, rgbaFromCss, type Rgba } from './contrast';

// The Post menu on a Thoughts post and the Markdown copies it points at. These run against the build with the
// fixture posts in tests/fixtures/thoughts (the "fixtures" project in playwright.config.ts). The middle fixture post
// holds an MDX import, an export, a component, a comment and a code block with an import line in it, so its
// Markdown copy has code to leave out and code to keep.

const posts = {
  newest: { id: 'on-the-ridge', title: 'Fixture post on the ridge', day: '2026-09-14' },
  middle: { id: 'a-short-one', title: 'Fixture post without a summary', day: '2026-06-20' },
  oldest: { id: 'first-light', title: 'Fixture post at first light', day: '2026-03-02' },
};
const address = (id: string) => `https://notgui.com/thoughts/${id}/`;

const ITEMS = [
  { name: 'Copy Link', description: 'Copy URL to clipboard' },
  { name: 'Copy Page', description: 'Copy page as Markdown for LLMs' },
  { name: 'View as Markdown', description: 'View this page as plain text', newTab: true },
  { name: 'Open in ChatGPT', description: 'Ask ChatGPT about this page', newTab: true },
  { name: 'Open in Claude', description: 'Ask Claude about this page', newTab: true },
  { name: 'Share Quote', description: 'Copy a URL that highlights the selected quote' },
];
// The menu's groups, split by dividers.
const GROUPS = [['Copy Link', 'Copy Page'], ['View as Markdown'], ['Open in ChatGPT', 'Open in Claude'], ['Share Quote']];

const menuButton = (page: Page) => page.getByRole('button', { name: 'Post menu' });
const menu = (page: Page) => page.getByRole('menu', { name: 'Post menu' });
const item = (page: Page, name: string) => menu(page).getByRole('menuitem', { name, exact: true });
const descriptionOf = (page: Page, name: string) => item(page, name).locator('[data-description]');
const sky = (page: Page) => page.locator('#sky');

async function readClipboard(page: Page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

// Selects the whole text of the first element matching `selector` in the post, or from the start of one to the
// end of another.
async function select(page: Page, from: string, to = from) {
  await page.evaluate(
    ([a, b]) => {
      const range = document.createRange();
      range.setStart(document.querySelector(a)!.firstChild!, 0);
      const end = document.querySelector(b)!.lastChild!;
      range.setEnd(end, end.textContent!.length);
      document.getSelection()!.removeAllRanges();
      document.getSelection()!.addRange(range);
    },
    [from, to],
  );
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test.describe('the Markdown copy', () => {
  for (const post of Object.values(posts)) {
    test(`${post.id} has one at its address plus .md, starting with its title and day`, async ({ request }) => {
      const response = await request.get(`/thoughts/${post.id}.md`);
      expect(response.status()).toBe(200);
      expect(await response.text()).toMatch(new RegExp(`^# ${post.title}\\n\\n${post.day}\\n\\n\\S`));
    });
  }

  test('holds the post\'s words but none of its MDX code, and keeps code blocks whole', async ({ request }) => {
    const text = await (await request.get(`/thoughts/${posts.middle.id}.md`)).text();
    expect(text).toBe(
      [
        `# ${posts.middle.title}`,
        '',
        posts.middle.day,
        '',
        'A short fixture post with no summary.',
        '',
        'An aside from a component, kept as words in the Markdown copy.',
        '',
        '```js',
        "import { trail } from './trail';",
        '```',
        '',
      ].join('\n'),
    );
  });

  test('keeps the post\'s Markdown exactly as written', async ({ request }) => {
    const text = await (await request.get(`/thoughts/${posts.newest.id}.md`)).text();
    for (const written of [
      'a [link to the Thoughts page](/thoughts), some `inline code`',
      '## A subheading',
      '> A quote that sits in the post',
      '- The first thing in a list',
      "```ts\n// a comment in the code\nconst trail = ['start', 'ridge', 'summit'];",
      '**Bold text** and *emphasis*',
    ]) {
      expect(text).toContain(written);
    }
    expect(text.trimEnd().endsWith('The last paragraph of the fixture post.')).toBe(true);
  });
});

test.describe('the Post menu', () => {
  test('opens from a 44px "..." button beside the title, with six items in four groups, each with a description', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/thoughts/${posts.newest.id}/`);
    const button = menuButton(page);
    await expect(button).toHaveAttribute('aria-haspopup', 'menu');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(menu(page)).toBeHidden();

    // Beside the title, at the column's right edge, and 44px to click: every point of a 44px square around its centre
    // lands on it.
    const [box, title, column] = [(await button.boundingBox())!, (await page.locator('#sky h1').boundingBox())!, (await page.locator('#sky .prose').boundingBox())!];
    expect(Math.round(box.x + box.width)).toBe(Math.round(column.x + column.width));
    expect(box.x).toBeGreaterThan(title.x + title.width);
    const target = await button.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2];
      const corners = [[-21.5, -21.5], [21.5, -21.5], [-21.5, 21.5], [21.5, 21.5]];
      return corners.every(([dx, dy]) => el.contains(document.elementFromPoint(cx + dx, cy + dy)));
    });
    expect(target).toBe(true);

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(menu(page)).toBeVisible();
    const items = menu(page).getByRole('menuitem');
    await expect(items).toHaveCount(ITEMS.length);
    for (const [i, { name, description, newTab }] of ITEMS.entries()) {
      await expect(items.nth(i)).toHaveAccessibleName(newTab ? `${name} (opens in a new tab)` : name);
      if (name !== 'Share Quote') await expect(items.nth(i)).toHaveAccessibleDescription(description);
      // The description sits under the name.
      const [nameBox, descriptionBox] = [
        (await items.nth(i).locator('.post-menu-name').boundingBox())!,
        (await items.nth(i).locator('[data-description]').boundingBox())!,
      ];
      expect(descriptionBox.y).toBeGreaterThanOrEqual(nameBox.y + nameBox.height);
      // Items that open a new tab show an arrow; the others don't.
      await expect(items.nth(i).locator('svg.post-menu-arrow')).toHaveCount(newTab ? 1 : 0);
      if (newTab) await expect(items.nth(i).locator('svg.post-menu-arrow')).toBeVisible();
    }
    const groups = await menu(page).evaluate((el) =>
      [...el.children].map((child) =>
        child.getAttribute('role') === 'separator'
          ? 'divider'
          : [...child.querySelectorAll('[role="menuitem"] .post-menu-name')].map((n) => n.firstChild!.textContent!.trim()),
      ),
    );
    expect(groups).toEqual([GROUPS[0], 'divider', GROUPS[1], 'divider', GROUPS[2], 'divider', GROUPS[3]]);
  });

  test('sits above the Sky, so neither of its fades thins it out', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/thoughts/${posts.newest.id}/`);
    await menuButton(page).click();
    // It eases in from a few pixels higher, so it is measured where it settles.
    await motionSettled(page);
    const placement = await page.evaluate(() => {
      const menu = document.getElementById('post-menu')!;
      const box = menu.getBoundingClientRect();
      const button = document.getElementById('post-menu-button')!.getBoundingClientRect();
      const skyBox = document.getElementById('sky')!.getBoundingClientRect();
      const corners = [
        [box.left + 4, box.top + 4],
        [box.right - 4, box.top + 4],
        [box.left + 4, box.bottom - 4],
        [box.right - 4, box.bottom - 4],
      ];
      return {
        outsideSky: !document.getElementById('sky')!.contains(menu),
        onTop: corners.every(([x, y]) => menu.contains(document.elementFromPoint(x, y))),
        belowButton: box.top - button.bottom,
        rightEdges: [Math.round(box.right), Math.round(button.right)],
        aboveSkyBottom: box.bottom <= skyBox.bottom,
      };
    });
    expect(placement.outsideSky).toBe(true);
    expect(placement.onTop).toBe(true);
    expect(placement.belowButton).toBe(8);
    expect(placement.rightEdges[0]).toBe(placement.rightEdges[1]);
    expect(placement.aboveSkyBottom).toBe(true);
  });

  test('Copy Link copies the post\'s address on notgui.com and says so for a moment', async ({ page }) => {
    await page.goto(`/thoughts/${posts.newest.id}/?from=somewhere#a-subheading`);
    await menuButton(page).click();
    await item(page, 'Copy Link').click();
    expect(await readClipboard(page)).toBe(address(posts.newest.id));
    await expect(descriptionOf(page, 'Copy Link')).toHaveText('Copied');
    await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toHaveCount(1);
    // The menu stays open, and the description comes back.
    await expect(menu(page)).toBeVisible();
    await expect(descriptionOf(page, 'Copy Link')).toHaveText('Copy URL to clipboard', { timeout: 3000 });
  });

  test('Copy Page copies the post\'s Markdown copy', async ({ page, request }) => {
    const markdown = await (await request.get(`/thoughts/${posts.middle.id}.md`)).text();
    await page.goto(`/thoughts/${posts.middle.id}/`);
    await menuButton(page).click();
    await item(page, 'Copy Page').click();
    await expect(descriptionOf(page, 'Copy Page')).toHaveText('Copied');
    expect(await readClipboard(page)).toBe(markdown);
  });

  test('View as Markdown opens the Markdown copy in a new tab', async ({ page, context }) => {
    await page.goto(`/thoughts/${posts.middle.id}/`);
    await menuButton(page).click();
    const view = item(page, 'View as Markdown (opens in a new tab)');
    await expect(view).toHaveAttribute('href', `/thoughts/${posts.middle.id}.md`);
    await expect(view).toHaveAttribute('target', '_blank');
    await expect(view).toHaveAttribute('rel', 'noopener');
    const [tab] = await Promise.all([context.waitForEvent('page'), view.click()]);
    await tab.waitForLoadState();
    expect(tab.url()).toMatch(new RegExp(`/thoughts/${posts.middle.id}\\.md$`));
    expect(await tab.locator('body').innerText()).toContain(`# ${posts.middle.title}`);
    // The menu closes behind it.
    await expect(menu(page)).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/thoughts/${posts.middle.id}/$`));
  });

  test('Open in ChatGPT and Open in Claude start a new chat about the post\'s address, in a new tab', async ({ page }) => {
    await page.goto(`/thoughts/${posts.oldest.id}/`);
    await menuButton(page).click();
    const prompt = encodeURIComponent(`Read and summarize: ${address(posts.oldest.id)}`);
    const chats = {
      'Open in ChatGPT': `https://chatgpt.com/?q=${prompt}`,
      'Open in Claude': `https://claude.ai/new?q=${prompt}`,
    };
    for (const [name, href] of Object.entries(chats)) {
      const link = item(page, `${name} (opens in a new tab)`);
      await expect(link).toHaveAttribute('href', href);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener');
    }
  });

  test('Share Quote is greyed out until text in the post is selected, and copies nothing then', async ({ page }) => {
    await page.goto(`/thoughts/${posts.newest.id}/`);
    await page.evaluate(() => navigator.clipboard.writeText('untouched'));
    await menuButton(page).click();
    const share = item(page, 'Share Quote');
    await expect(share).toHaveAttribute('aria-disabled', 'true');
    await expect(share).toHaveAccessibleDescription('Select text in the post first');
    const [shareColour, enabledColour] = [
      await share.locator('.post-menu-name').evaluate((el) => getComputedStyle(el).color),
      await item(page, 'Copy Link').locator('.post-menu-name').evaluate((el) => getComputedStyle(el).color),
    ];
    expect(shareColour).not.toBe(enabledColour);
    // Playwright won't press what is marked disabled, so this one is forced, as a visitor's click would be.
    await share.click({ force: true });
    expect(await readClipboard(page)).toBe('untouched');
    await expect(menu(page)).toBeVisible();

    // Text selected outside the post, in its title, doesn't count.
    await page.keyboard.press('Escape');
    await select(page, '#sky h1');
    await menuButton(page).click();
    await expect(share).toHaveAttribute('aria-disabled', 'true');
  });

  test('Share Quote copies a link that highlights the text selected in the post', async ({ page }) => {
    await page.goto(`/thoughts/${posts.newest.id}/`);
    await select(page, '#sky .prose blockquote p');
    await menuButton(page).click();
    const share = item(page, 'Share Quote');
    await expect(share).toHaveAttribute('aria-disabled', 'false');
    await expect(share).toHaveAccessibleDescription('Copy a URL that highlights the selected quote');
    await share.click();
    await expect(descriptionOf(page, 'Share Quote')).toHaveText('Copied');
    const quote = 'A quote that sits in the post, set apart from the paragraphs around it.';
    expect(await readClipboard(page)).toBe(`${address(posts.newest.id)}#:~:text=${encodeURIComponent(quote)}`);
  });

  test('Share Quote names a quote over more than one paragraph by its first and last words', async ({ page }) => {
    await page.goto(`/thoughts/${posts.newest.id}/`);
    await select(page, '#sky .prose > p:first-child', '#sky .prose blockquote p');
    await menuButton(page).click();
    await item(page, 'Share Quote').click();
    const start = encodeURIComponent('This is a fixture post');
    const end = encodeURIComponent('from the paragraphs around it.');
    expect(await readClipboard(page)).toBe(`${address(posts.newest.id)}#:~:text=${start},${end}`);
  });

  test('works by keyboard: Enter, Space and the arrows open it, the arrows move, Escape and Tab close it', async ({ page }) => {
    await page.goto(`/thoughts/${posts.newest.id}/`);
    const button = menuButton(page);
    const focused = () => page.evaluate(() => document.activeElement?.querySelector('.post-menu-name')?.firstChild?.textContent?.trim() ?? document.activeElement?.getAttribute('aria-label'));
    const scrolled = () => sky(page).evaluate((el) => el.scrollTop);

    await button.focus();
    await page.keyboard.press('Enter');
    await expect(menu(page)).toBeVisible();
    expect(await focused()).toBe('Copy Link');
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('Copy Page');
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('View as Markdown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    expect(await focused()).toBe('Copy Link');
    // Past either end, it wraps round.
    await page.keyboard.press('ArrowUp');
    expect(await focused()).toBe('Share Quote');
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('Copy Link');
    await page.keyboard.press('End');
    expect(await focused()).toBe('Share Quote');
    await page.keyboard.press('Home');
    expect(await focused()).toBe('Copy Link');
    // None of these keys scroll the post behind the menu.
    expect(await scrolled()).toBe(0);

    await page.keyboard.press('Escape');
    await expect(menu(page)).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');

    await page.keyboard.press(' ');
    await expect(menu(page)).toBeVisible();
    expect(await focused()).toBe('Copy Link');
    await page.keyboard.press('Escape');

    // Up opens it on its last item, Down on its first.
    await page.keyboard.press('ArrowUp');
    expect(await focused()).toBe('Share Quote');
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('Copy Link');

    // Enter on an item does what a click does.
    await page.keyboard.press('Enter');
    expect(await readClipboard(page)).toBe(address(posts.newest.id));

    // Tab closes it and carries on from the button.
    await page.keyboard.press('Tab');
    await expect(menu(page)).toBeHidden();
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('post-menu-button');
    expect(await scrolled()).toBe(0);
  });

  test('a click outside closes it and puts focus back on the button', async ({ page }) => {
    await page.goto(`/thoughts/${posts.newest.id}/`);
    await menuButton(page).click();
    await expect(menu(page)).toBeVisible();
    await page.locator('#sky time').click();
    await expect(menu(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
    // A second press on the button closes it too.
    await menuButton(page).click();
    await menuButton(page).click();
    await expect(menu(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
  });

  test('works on a post reached through the navigation', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation').getByRole('link', { name: 'thoughts' }).click();
    await page.getByRole('link', { name: posts.middle.title }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(posts.middle.title);
    await menuButton(page).click();
    await item(page, 'Copy Link').click();
    expect(await readClipboard(page)).toBe(address(posts.middle.id));
    // And again on the next post, with its own address.
    await page.keyboard.press('Escape');
    await page.getByRole('navigation', { name: 'more thoughts' }).getByRole('link', { name: /^Next/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(posts.oldest.title);
    await menuButton(page).click();
    await item(page, 'Copy Link').click();
    expect(await readClipboard(page)).toBe(address(posts.oldest.id));
  });

  test('fits a 390px phone, inside the screen and above the grass', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/thoughts/${posts.middle.id}/`);
    await menuButton(page).click();
    const fit = await page.evaluate(() => {
      const box = document.getElementById('post-menu')!.getBoundingClientRect();
      const skyBox = document.getElementById('sky')!.getBoundingClientRect();
      return { left: box.left, right: box.right, bottom: box.bottom, skyBottom: skyBox.bottom, scrollWidth: document.documentElement.scrollWidth };
    });
    expect(fit.left).toBeGreaterThanOrEqual(16);
    expect(fit.right).toBeLessThanOrEqual(390 - 16);
    expect(fit.bottom).toBeLessThanOrEqual(fit.skyBottom);
    expect(fit.scrollWidth).toBe(390);
  });

  test('on a short screen it stops at the Sky\'s bottom edge and scrolls inside', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 520 });
    await page.goto(`/thoughts/${posts.middle.id}/`);
    await menuButton(page).click();
    const fit = await page.evaluate(() => {
      const menu = document.getElementById('post-menu')!;
      return { bottom: menu.getBoundingClientRect().bottom, skyBottom: document.getElementById('sky')!.getBoundingClientRect().bottom, scrolls: menu.scrollHeight > menu.clientHeight };
    });
    expect(fit.bottom).toBeLessThanOrEqual(fit.skyBottom);
    expect(fit.scrolls).toBe(true);
    await page.keyboard.press('End');
    await expect(item(page, 'Share Quote')).toBeInViewport();
  });

  for (const theme of ['night', 'day'] as const) {
    test(`in ${theme}, every word in the menu reaches 4.5:1, on the item the arrow keys are on too`, async ({ page }) => {
      await page.goto(`/thoughts/${posts.newest.id}/`);
      if (theme === 'day') await page.getByRole('button', { name: /^theme:/ }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await motionSettled(page);
      await menuButton(page).click();
      await motionSettled(page);
      // With the pointer away from it, no item is tinted: every word against the menu's own surface, and the rest of
      // the page against the Sky.
      await page.mouse.move(0, 0);
      const { failures, rows } = await textBelowAA(page);
      if (process.env.PRINT_CONTRAST) console.log(`\n${theme}, menu open\n${rows.join('\n')}`);
      expect(rows.filter((row) => row.startsWith('Share Quote')).length).toBeGreaterThan(0);
      expect(failures).toEqual([]);

      // The tint on the item under the pointer or the arrow keys.
      await page.keyboard.press('ArrowDown');
      const tinted = await menu(page).evaluate(() => {
        const at = document.activeElement!;
        const colour = (el: Element, key: 'color' | 'backgroundColor') => getComputedStyle(el)[key];
        return {
          background: colour(at, 'backgroundColor'),
          surface: colour(document.getElementById('post-menu')!, 'backgroundColor'),
          words: [...at.querySelectorAll('.post-menu-name, [data-description]')].map((el) => colour(el, 'color')),
        };
      });
      const background = cssColour(tinted.background);
      expect(background).not.toEqual(rgbaFromCss(tinted.surface));
      for (const word of tinted.words) expect(contrastRatio(rgbaFromCss(word), background)).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('the "..." button follows Night and Day and stands out on the Sky', async ({ page }) => {
    await page.goto(`/thoughts/${posts.newest.id}/`);
    // The dots and the post's text.
    const colours = () =>
      menuButton(page).evaluate((el) => [getComputedStyle(el).color, getComputedStyle(document.querySelector('#sky .prose p')!).color]);
    const night = await colours();
    await page.getByRole('button', { name: /^theme:/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');
    await motionSettled(page);
    const day = await colours();
    expect(day[0]).not.toBe(night[0]);
    // The dots are the secondary grey of the post's text, which the Thoughts tests hold to 4.5:1 on the Sky in both
    // themes.
    for (const [dots, text] of [night, day]) expect(dots).toBe(text);
  });
});

// A computed colour, including the color(srgb r g b) form color-mix() gives, as 0 to 255 channels.
function cssColour(colour: string): Rgba {
  const srgb = colour.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);
  if (!srgb) return rgbaFromCss(colour);
  return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] ? Number(srgb[4]) : 1];
}
