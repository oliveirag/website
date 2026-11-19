import { test, expect, type Page } from './fixtures';

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

const LINKS = ['home', 'thoughts', 'videos', 'chatbot', 'top 5'];

// Each page and the link marked on it.
const PAGES = [
  { route: '/', marked: 'home' },
  { route: '/thoughts', marked: 'thoughts' },
  { route: '/videos', marked: 'videos' },
  { route: '/chatbot', marked: 'chatbot' },
  { route: '/top-5', marked: 'top 5' },
];

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' });
const navLink = (page: Page, name: string) => nav(page).getByRole('link', { name, exact: true });
const menuButton = (page: Page) => page.getByRole('button', { name: 'menu' });
const themeToggle = (page: Page) => page.getByRole('button', { name: /^theme:/ });
const sky = (page: Page) => page.getByRole('main');

// The navigation's visible controls as a visitor sees them, left to right.
async function controlsLeftToRight(page: Page) {
  const controls = await page
    .locator('header')
    .locator('a:visible, button:visible')
    .evaluateAll((elements) =>
      elements.map((el) => ({
        x: el.getBoundingClientRect().left,
        name: el.id === 'theme-toggle' ? 'theme toggle' : (el as HTMLElement).innerText.trim(),
      })),
    );
  return controls.sort((a, b) => a.x - b.x).map((control) => control.name);
}

test.describe('on a desktop', () => {
  test.use({ viewport: DESKTOP });

  for (const { route } of PAGES) {
    test(`the links read home, thoughts, videos, chatbot, top 5, with the theme toggle at the far right (${route})`, async ({ page }) => {
      await page.goto(route);
      await expect(nav(page).getByRole('link')).toHaveText(LINKS);
      await expect(menuButton(page)).toBeHidden();
      expect(await controlsLeftToRight(page)).toEqual([...LINKS, 'theme toggle']);
    });
  }

  for (const { route, marked } of PAGES) {
    test(`${route} marks "${marked}" as the current page, and nothing else`, async ({ page }) => {
      await page.goto(route);
      await expect(nav(page).locator('[aria-current="page"]')).toHaveText([marked]);
    });
  }

  test('"home" goes to the top of Home from any page', async ({ page }) => {
    await page.goto('/top-5');
    await navLink(page, 'home').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'guilherme oliveira' })).toBeInViewport();
    expect(await sky(page).evaluate((el) => el.scrollTop)).toBe(0);
  });

  test('"home" on Home, scrolled down, goes back to the top', async ({ page }) => {
    await page.goto('/');
    await sky(page).evaluate((el) => el.scrollTo({ top: 400, behavior: 'instant' }));
    await expect.poll(() => sky(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await navLink(page, 'home').click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => sky(page).evaluate((el) => el.scrollTop)).toBe(0);
  });

  test('every control is reachable by keyboard in order and shows a focus ring', async ({ page }) => {
    await page.goto('/chatbot');
    const reached: string[] = [];
    for (let i = 0; i < LINKS.length + 1; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toHaveCSS('outline-style', 'solid');
      expect(parseFloat(await focused.evaluate((el) => getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
      reached.push(await focused.evaluate((el) => (el.id === 'theme-toggle' ? 'theme toggle' : (el as HTMLElement).innerText.trim())));
    }
    expect(reached).toEqual([...LINKS, 'theme toggle']);
  });
});

// A control's target is at least 44px when every point of a 44px square around its centre hits it.
async function hasTargetOf44px(page: Page, name: string, control: ReturnType<Page['locator']>) {
  const box = (await control.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const misses = await control.evaluate(
    (el, { cx, cy }) => {
      const out: string[] = [];
      for (const dx of [-21.5, 0, 21.5]) {
        for (const dy of [-21.5, 0, 21.5]) {
          const hit = document.elementFromPoint(cx + dx, cy + dy);
          if (!hit || !el.contains(hit)) out.push(`${dx},${dy}`);
        }
      }
      return out;
    },
    { cx, cy },
  );
  expect(misses, `${name} misses at`).toEqual([]);
}

test('every navigation control is at least 44px to click or tap (desktop)', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  for (const name of LINKS) await hasTargetOf44px(page, name, navLink(page, name));
  await hasTargetOf44px(page, 'theme toggle', themeToggle(page));
});

test.describe('on a phone', () => {
  test.use({ viewport: PHONE });

  test('the links fold into a menu, with the theme toggle still at the far right', async ({ page }) => {
    await page.goto('/');
    for (const name of LINKS) await expect(navLink(page, name)).toBeHidden();
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    expect(await controlsLeftToRight(page)).toEqual(['menu', 'theme toggle']);

    await menuButton(page).click();
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(nav(page).getByRole('link')).toHaveText(LINKS);
    for (const name of LINKS) await expect(navLink(page, name)).toBeVisible();
    // Top to bottom, in the same order.
    const tops = await nav(page).getByRole('link').evaluateAll((links) => links.map((link) => link.getBoundingClientRect().top));
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
  });

  test('the menu marks the current page', async ({ page }) => {
    await page.goto('/videos');
    await menuButton(page).click();
    await expect(nav(page).locator('[aria-current="page"]')).toHaveText(['videos']);
  });

  test('following a link from the menu goes there and leaves the menu closed', async ({ page }) => {
    await page.goto('/');
    await menuButton(page).click();
    await navLink(page, 'thoughts').click();
    await expect(page).toHaveURL(/\/thoughts$/);
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(navLink(page, 'top 5')).toBeHidden();

    // On Home, "home" stays on the page, so the menu has to close itself.
    await page.goto('/');
    await menuButton(page).click();
    await navLink(page, 'home').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(navLink(page, 'top 5')).toBeHidden();
  });

  test('Escape and a click outside close the menu, and Escape hands focus back to the menu button', async ({ page }) => {
    await page.goto('/');
    await menuButton(page).click();
    await page.keyboard.press('Tab');
    await expect(navLink(page, 'home')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(navLink(page, 'home')).toBeHidden();
    await expect(menuButton(page)).toBeFocused();

    await menuButton(page).click();
    await expect(navLink(page, 'home')).toBeVisible();
    await page.mouse.click(PHONE.width / 2, PHONE.height / 2);
    await expect(navLink(page, 'home')).toBeHidden();
  });

  test('the menu is reachable by keyboard and every control in it shows a focus ring', async ({ page }) => {
    await page.goto('/chatbot');
    await page.keyboard.press('Tab');
    await expect(menuButton(page)).toBeFocused();
    await page.keyboard.press('Enter');
    for (const name of LINKS) {
      await page.keyboard.press('Tab');
      await expect(navLink(page, name)).toBeFocused();
      await expect(navLink(page, name)).toHaveCSS('outline-style', 'solid');
    }
    await page.keyboard.press('Tab');
    await expect(themeToggle(page)).toBeFocused();
    await expect(themeToggle(page)).toHaveCSS('outline-style', 'solid');
    // Moving focus out of the menu closes it.
    await expect(navLink(page, 'home')).toBeHidden();
  });

  test('every control in the phone navigation is at least 44px to tap', async ({ page }) => {
    await page.goto('/');
    await hasTargetOf44px(page, 'menu', menuButton(page));
    await hasTargetOf44px(page, 'theme toggle', themeToggle(page));
    await menuButton(page).click();
    for (const name of LINKS) await hasTargetOf44px(page, name, navLink(page, name));
  });
});

test.describe('old links', () => {
  test('#chatbot opens the Chatbot page', async ({ page }) => {
    await page.goto('/#chatbot');
    await expect(page).toHaveURL(/\/chatbot$/);
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();
  });

  for (const hash of ['#bookshelf', '#other']) {
    test(`${hash} opens the Top 5 page`, async ({ page }) => {
      await page.goto(`/${hash}`);
      await expect(page).toHaveURL(/\/top-5$/);
      await expect(page.getByRole('heading', { name: 'top 5' })).toBeVisible();
    });
  }

  for (const [hash, list] of [['#movies', 'movies'], ['#anime', 'anime'], ['#video-games', 'video games']]) {
    test(`${hash} opens the Top 5 page at the ${list} list`, async ({ page }) => {
      await page.setViewportSize(PHONE);
      await page.goto(`/${hash}`);
      await expect(page).toHaveURL(new RegExp(`/top-5${hash}$`));
      await expect(page.getByText(list, { exact: true })).toBeInViewport();
    });
  }

  test('an old link opened while Home is showing moves on too', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => (window.location.hash = '#chatbot'));
    await expect(page).toHaveURL(/\/chatbot$/);
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();
  });

  test('an old link followed from another page moves on too', async ({ page }) => {
    await page.goto('/thoughts');
    await page.getByRole('main').evaluate((sky) => {
      const link = document.createElement('a');
      link.href = '/#chatbot';
      link.textContent = 'old #chatbot';
      sky.append(link);
    });
    await page.getByRole('link', { name: 'old #chatbot' }).click();
    await expect(page).toHaveURL(/\/chatbot$/);
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();

    await page.goto('/thoughts');
    await page.getByRole('main').evaluate((sky) => {
      const link = document.createElement('a');
      link.href = '/#video-games';
      link.textContent = 'old #video-games';
      sky.append(link);
    });
    await page.getByRole('link', { name: 'old #video-games' }).click();
    await expect(page).toHaveURL(/\/top-5#video-games$/);
    await expect(page.getByText('video games', { exact: true })).toBeInViewport();
  });

  test('a hash that is not an old link leaves Home as it is, without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#1%20bad[');
    await expect(page).toHaveURL(/\/#1%20bad\[$/);
    await expect(page.getByText('412 commits in 2026')).toBeVisible();
    await page.evaluate(() => (window.location.hash = '#tech-stack'));
    await expect(page).toHaveURL(/\/#tech-stack$/);
    await navLink(page, 'chatbot').click();
    await expect(page).toHaveURL(/\/chatbot$/);
    expect(errors).toEqual([]);
  });
});

test.describe('moving between pages', () => {
  test.use({ viewport: DESKTOP });

  test('happens without a full reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => ((window as unknown as { sameDocument: boolean }).sameDocument = true));
    for (const name of ['chatbot', 'top 5', 'thoughts', 'videos', 'home']) {
      await navLink(page, name).click();
      await expect(nav(page).locator('[aria-current="page"]')).toHaveText([name]);
    }
    expect(await page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument)).toBe(true);
  });

  test('Day holds, from the first frame of the new page, and the toggle keeps working', async ({ page }) => {
    await page.goto('/');
    await themeToggle(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');

    // Record the theme of every frame drawn while the page changes.
    await page.evaluate(() => {
      const seen = new Set<string>();
      (window as unknown as { themesSeen: Set<string> }).themesSeen = seen;
      const record = () => {
        seen.add(document.documentElement.dataset.theme ?? '');
        requestAnimationFrame(record);
      };
      record();
    });
    await navLink(page, 'chatbot').click();
    await expect(page).toHaveURL(/\/chatbot$/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#FFFFFF');
    await expect(themeToggle(page)).toHaveAccessibleName('theme: day');
    expect(await page.evaluate(() => [...(window as unknown as { themesSeen: Set<string> }).themesSeen])).toEqual(['day']);

    await themeToggle(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
    await expect(themeToggle(page)).toHaveAccessibleName('theme: night');
    await expect(page.getByRole('status')).toHaveText('night is on');
  });

  test('the Sky starts at the top of each new page', async ({ page }) => {
    await page.goto('/');
    await sky(page).evaluate((el) => el.scrollTo({ top: 400, behavior: 'instant' }));
    await expect.poll(() => sky(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await navLink(page, 'top 5').click();
    await expect(page).toHaveURL(/\/top-5$/);
    expect(await sky(page).evaluate((el) => el.scrollTop)).toBe(0);
  });

  test('the scroll hint follows the new page', async ({ page }) => {
    await page.goto('/chatbot');
    const hint = page.getByText('scroll', { exact: true });
    await expect(hint).toBeHidden();
    await navLink(page, 'top 5').click();
    await expect(page).toHaveURL(/\/top-5$/);
    await expect(hint).toBeVisible();
    const box = (await sky(page).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 300);
    await expect(hint).toBeHidden();
  });

  test('Home works after leaving it and coming back: Commits, Now Playing and keyboard scrolling', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('412 commits in 2026')).toBeVisible();
    await navLink(page, 'chatbot').click();
    await expect(page).toHaveURL(/\/chatbot$/);
    await navLink(page, 'home').click();
    await expect(page).toHaveURL(/\/$/);
    await expectHomeWorks(page);
  });

  test('Home works when the visit starts on another page', async ({ page }) => {
    await page.goto('/chatbot');
    await navLink(page, 'home').click();
    await expect(page).toHaveURL(/\/$/);
    await expectHomeWorks(page);
  });

  test('the Chatbot works when reached from another page', async ({ page }) => {
    await page.route('https://my-website-spotify-api.vercel.app/api/chatbot', (route) => {
      const headers = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
      };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ botOutput: 'hey, nice to meet you' }) });
    });
    await page.goto('/');
    await navLink(page, 'chatbot').click();
    const message = page.getByRole('textbox', { name: 'Message' });
    await message.fill('hi gui');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('hey, nice to meet you')).toBeVisible();
    await expect(message).toHaveValue('');
  });
});

async function expectHomeWorks(page: Page) {
  await expect(page.getByRole('region', { name: 'Commits' })).toContainText('412 commits in 2026');
  await expect(page.getByRole('region', { name: 'Now Playing' })).toContainText('Pink + White');

  // The keys scroll the new Sky, not the one from the first page.
  await sky(page).evaluate((el) => el.scrollTo({ top: 0, behavior: 'instant' }));
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('PageDown');
  await expect.poll(() => sky(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
}
