import { test, expect, motionSettled, type Page } from './fixtures';
import { textBelowAA } from './sky-text';

// The Section pill on a Thoughts post. These run against the build with the fixture posts in tests/fixtures/thoughts
// (the "fixtures" project in playwright.config.ts). The newest fixture post has two sections, "A subheading" (with
// an h3 inside it, which is not a section), then two short ones at the very end, "Nearly done" and "Last words",
// which the Sky can't scroll to the top. The other two posts have none.

const withSections = 'on-the-ridge';
const withoutSections = ['first-light', 'a-short-one'];
const SECTIONS = ['Introduction', 'A subheading', 'Nearly done', 'Last words'];

const pill = (page: Page) => page.locator('#section-pill');
const pillButton = (page: Page) => page.getByRole('button', { name: /^Show post sections\. Current section: / });
const list = (page: Page) => page.getByRole('menu', { name: 'Post sections' });
const item = (page: Page, name: string) => list(page).getByRole('menuitem', { name, exact: true });
const sky = (page: Page) => page.locator('#sky');
const label = (page: Page) => pill(page).locator('[data-section-label]');

async function expectCurrent(page: Page, name: string) {
  await expect(label(page)).toHaveText(name);
  await expect(pillButton(page)).toHaveAccessibleName(`Show post sections. Current section: ${name}`);
}

// Scrolls the Sky at once so the top of `selector` sits `offset` pixels below the Sky's top edge.
async function scrollHeadingTo(page: Page, selector: string, offset: number) {
  await page.evaluate(
    ([sel, by]) => {
      const sky = document.getElementById('sky')!;
      const top = document.querySelector(sel as string)!.getBoundingClientRect().top - sky.getBoundingClientRect().top;
      sky.scrollTo({ top: sky.scrollTop + top - (by as number), behavior: 'instant' });
    },
    [selector, offset],
  );
}

const scrollSkyTo = (page: Page, top: number | 'end') =>
  sky(page).evaluate((el, to) => el.scrollTo({ top: to === 'end' ? el.scrollHeight : to, behavior: 'instant' }), top);

// Where a heading sits under the Sky's top edge.
const headingOffset = (page: Page, name: string) =>
  page.evaluate((text) => {
    const heading = [...document.querySelectorAll('[data-post-body] h2')].find((h) => h.textContent === text)!;
    return heading.getBoundingClientRect().top - document.getElementById('sky')!.getBoundingClientRect().top;
  }, name);

test.describe('the Section pill', () => {
  test('sits at the bottom centre, outside the Sky and on top of it, naming "Introduction" at the top, in place of the scroll hint', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/thoughts/${withSections}/`);
    await expect(pillButton(page)).toBeVisible();
    await expectCurrent(page, 'Introduction');
    await expect(pillButton(page)).toHaveAttribute('aria-expanded', 'false');
    const placement = await page.evaluate(() => {
      const pill = document.getElementById('section-pill')!;
      const box = pill.getBoundingClientRect();
      const skyBox = document.getElementById('sky')!.getBoundingClientRect();
      return {
        outsideSky: !document.getElementById('sky')!.contains(pill),
        centre: box.left + box.width / 2,
        height: box.height,
        onTop: pill.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)),
        // Its 44px target reaches down to the Sky's bottom edge and no further, so it never touches the grass.
        targetBottom: box.bottom + (44 - box.height) / 2,
        skyBottom: skyBox.bottom,
      };
    });
    expect(placement.outsideSky).toBe(true);
    expect(Math.abs(placement.centre - 640)).toBeLessThanOrEqual(1);
    expect(placement.height).toBe(32);
    expect(placement.onTop).toBe(true);
    expect(placement.targetBottom).toBeLessThanOrEqual(placement.skyBottom + 0.5);
    await expect(page.getByText('scroll', { exact: true })).toBeHidden();
  });

  test('names the section being read as the Sky scrolls, and its ring fills with how far the post is read', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/thoughts/${withSections}/`);
    const ring = () => pill(page).locator('.section-pill-progress').getAttribute('stroke-dashoffset');
    await expectCurrent(page, 'Introduction');
    expect(await ring()).toBe('100');

    // Its heading reaches the top part of the Sky: that section starts.
    await scrollHeadingTo(page, '[data-post-body] h2:nth-of-type(1)', 60);
    await expectCurrent(page, 'A subheading');
    // An h3 is part of the section it sits in.
    await scrollHeadingTo(page, '[data-post-body] h3', 60);
    await expectCurrent(page, 'A subheading');

    // Back above the first heading.
    await scrollSkyTo(page, 0);
    await expectCurrent(page, 'Introduction');

    // At the very end, the short last section counts even though its heading never reaches the line that starts the
    // others.
    await scrollSkyTo(page, 'end');
    const lastHeading = await headingOffset(page, 'Last words');
    const skyHeight = await sky(page).evaluate((el) => el.getBoundingClientRect().height);
    expect(lastHeading).toBeGreaterThan(skyHeight / 3);
    await expectCurrent(page, 'Last words');
    await expect.poll(ring).toBe('0');
  });

  test('opens a list of the sections with the current one marked; choosing one scrolls there, closes the list and moves focus to it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/thoughts/${withSections}/`);
    await pillButton(page).click();
    await expect(list(page)).toBeVisible();
    await expect(pillButton(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(list(page).getByRole('menuitem')).toHaveText(SECTIONS);
    await expect(item(page, 'Introduction')).toHaveAttribute('aria-current', 'location');
    await expect(list(page).locator('[aria-current]')).toHaveCount(1);
    // It opens above the pill.
    const gap = await page.evaluate(
      () => document.getElementById('section-pill')!.getBoundingClientRect().top - document.getElementById('section-list')!.getBoundingClientRect().bottom,
    );
    expect(Math.round(gap)).toBe(8);

    await item(page, 'A subheading').click();
    await expect(list(page)).toBeHidden();
    await expect(pillButton(page)).toHaveAttribute('aria-expanded', 'false');
    // The heading lands just under the Sky's top fade, where an anchor link puts it.
    await expect.poll(() => headingOffset(page, 'A subheading').then(Math.round)).toBe(48);
    await expectCurrent(page, 'A subheading');
    await expect(page.getByRole('heading', { level: 2, name: 'A subheading' })).toBeFocused();

    await pillButton(page).click();
    await expect(item(page, 'A subheading')).toHaveAttribute('aria-current', 'location');
    await expect(item(page, 'A subheading')).toBeFocused();
    await item(page, 'Introduction').click();
    await expect.poll(() => sky(page).evaluate((el) => el.scrollTop)).toBe(0);
    await expectCurrent(page, 'Introduction');

    // A section near the end that can't scroll to the top is still the one named once it's reached, even with
    // another short one after it.
    await pillButton(page).click();
    await item(page, 'Nearly done').click();
    await expect.poll(() => sky(page).evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2)).toBe(true);
    await expectCurrent(page, 'Nearly done');
    await pillButton(page).click();
    await item(page, 'Last words').click();
    await expectCurrent(page, 'Last words');
    await pillButton(page).click();
    await item(page, 'Nearly done').click();
    await expectCurrent(page, 'Nearly done');
    // Once the reader scrolls by themselves, the end of the post names its last section again.
    const skyBox = (await sky(page).boundingBox())!;
    await page.mouse.move(skyBox.x + skyBox.width / 2, skyBox.y + skyBox.height / 2);
    await page.mouse.wheel(0, 200);
    await expectCurrent(page, 'Last words');
  });

  test('jumps without animating with reduced motion on, and animates without it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Clicks an item and reads where the Sky is in the same moment, before a smooth scroll could have moved it far.
    const jump = () =>
      page.evaluate(() => {
        const sky = document.getElementById('sky')!;
        const heading = document.querySelector('[data-post-body] h2')!;
        const target = sky.scrollTop + heading.getBoundingClientRect().top - sky.getBoundingClientRect().top - 48;
        document.getElementById('section-pill')!.click();
        document.querySelector<HTMLElement>('#section-list [data-section="a-subheading"]')!.click();
        return { right: sky.scrollTop, target };
      });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/thoughts/${withSections}/`);
    const reduced = await jump();
    expect(Math.abs(reduced.right - reduced.target)).toBeLessThanOrEqual(1);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/thoughts/${withSections}/`);
    const smooth = await jump();
    expect(smooth.target - smooth.right).toBeGreaterThan(50);
    await expect.poll(() => headingOffset(page, 'A subheading').then(Math.round)).toBe(48);
  });

  test('works by keyboard: Enter opens it on the current section, the arrows move, Escape and Tab close it', async ({ page }) => {
    // With reduced motion, any scroll a key caused would show at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/thoughts/${withSections}/`);
    const focused = () => page.evaluate(() => document.activeElement?.querySelector('.section-list-name')?.textContent ?? document.activeElement?.id);
    const scrolled = () => sky(page).evaluate((el) => el.scrollTop);

    await pillButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(list(page)).toBeVisible();
    expect(await focused()).toBe('Introduction');
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('A subheading');
    await page.keyboard.press('End');
    expect(await focused()).toBe('Last words');
    expect(await scrolled()).toBe(0);
    // Past either end, it wraps round.
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('Introduction');
    await page.keyboard.press('ArrowUp');
    expect(await focused()).toBe('Last words');
    await page.keyboard.press('Home');
    expect(await focused()).toBe('Introduction');
    // None of these keys scroll the post behind the list.
    expect(await scrolled()).toBe(0);

    await page.keyboard.press('Escape');
    await expect(list(page)).toBeHidden();
    await expect(pillButton(page)).toBeFocused();
    await expect(pillButton(page)).toHaveAttribute('aria-expanded', 'false');

    // Up opens it on its last item, Down on its first.
    await page.keyboard.press('ArrowUp');
    expect(await focused()).toBe('Last words');
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('Introduction');

    // Tab closes it and carries on from the pill.
    await page.keyboard.press('Tab');
    await expect(list(page)).toBeHidden();
    expect(await focused()).not.toBe('section-pill');
    expect(await scrolled()).toBe(0);

    // Enter on an item jumps there.
    await pillButton(page).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(list(page)).toBeHidden();
    await expect(page.getByRole('heading', { level: 2, name: 'A subheading' })).toBeFocused();
    await expectCurrent(page, 'A subheading');
  });

  test('a click outside closes it and puts focus back on the pill, and it never shows with the Post menu', async ({ page }) => {
    await page.goto(`/thoughts/${withSections}/`);
    await pillButton(page).click();
    await page.locator('#sky time').click();
    await expect(list(page)).toBeHidden();
    await expect(pillButton(page)).toBeFocused();
    // A second press on the pill closes it too.
    await pillButton(page).click();
    await pillButton(page).click();
    await expect(list(page)).toBeHidden();

    const postMenu = page.getByRole('menu', { name: 'Post menu' });
    await pillButton(page).click();
    await page.getByRole('button', { name: 'Post menu' }).click();
    await expect(postMenu).toBeVisible();
    await expect(list(page)).toBeHidden();
    await pillButton(page).click();
    await expect(list(page)).toBeVisible();
    await expect(postMenu).toBeHidden();
  });

  test('has a 44px target', async ({ page }) => {
    await page.goto(`/thoughts/${withSections}/`);
    const hits = await page.evaluate(() => {
      const pill = document.getElementById('section-pill')!;
      const box = pill.getBoundingClientRect();
      const x = box.left + box.width / 2;
      return [box.top - 5, box.bottom + 5].map((y) => pill.contains(document.elementFromPoint(x, y)));
    });
    expect(hits).toEqual([true, true]);
  });

  for (const size of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    test(`at ${size.width}x${size.height} it never covers the end of the post: the last paragraph and Next stay readable and tappable`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(`/thoughts/${withSections}/`);
      await scrollSkyTo(page, 'end');
      const end = await page.evaluate(() => {
        const pill = document.getElementById('section-pill')!.getBoundingClientRect();
        const targetTop = pill.top - (44 - pill.height) / 2;
        const paragraphs = document.querySelectorAll('[data-post-body] p');
        const ends = [paragraphs[paragraphs.length - 1], ...document.querySelectorAll('nav[aria-label="more thoughts"] a')];
        return ends.map((el) => {
          const box = el.getBoundingClientRect();
          return {
            text: el.textContent!.trim(),
            clear: box.bottom <= targetTop,
            onTop: el.contains(document.elementFromPoint(box.left + 4, box.bottom - 4)),
          };
        });
      });
      expect(end.map((e) => e.text)).toEqual(['The last paragraph of the fixture post.', expect.stringMatching(/^Next/)]);
      for (const e of end) {
        expect(e.clear, e.text).toBe(true);
        expect(e.onTop, e.text).toBe(true);
      }
    });
  }

  test('fits a 390px phone: clear of the sound control, and the list inside the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/thoughts/${withSections}/`);
    await pillButton(page).click();
    await motionSettled(page);
    const fit = await page.evaluate(() => {
      const pill = document.getElementById('section-pill')!.getBoundingClientRect();
      const sound = document.querySelector('.sound-control')!.getBoundingClientRect();
      const list = document.getElementById('section-list')!.getBoundingClientRect();
      const skyBox = document.getElementById('sky')!.getBoundingClientRect();
      return {
        gapToSound: pill.left - sound.right,
        pillRight: pill.right,
        listLeft: list.left,
        listRight: list.right,
        listTop: list.top,
        skyTop: skyBox.top,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(fit.gapToSound).toBeGreaterThanOrEqual(8);
    expect(fit.pillRight).toBeLessThanOrEqual(390 - 16);
    expect(fit.listLeft).toBeGreaterThanOrEqual(16);
    expect(fit.listRight).toBeLessThanOrEqual(390 - 16);
    expect(fit.listTop).toBeGreaterThanOrEqual(fit.skyTop);
    expect(fit.scrollWidth).toBe(390);
    // "Introduction" shows in full.
    expect(await label(page).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

    // A long heading is cut short with an ellipsis, still clear of the sound control.
    const long = await label(page).evaluate((el) => {
      el.textContent = 'A much longer section heading that could never fit on a phone';
      const pill = document.getElementById('section-pill')!.getBoundingClientRect();
      const sound = document.querySelector('.sound-control')!.getBoundingClientRect();
      return { cut: el.scrollWidth > el.clientWidth, gapToSound: pill.left - sound.right, pillRight: pill.right };
    });
    expect(long.cut).toBe(true);
    expect(long.gapToSound).toBeGreaterThanOrEqual(8);
    expect(long.pillRight).toBeLessThanOrEqual(390 - 16);
  });

  test('on a short phone it stays under the navigation\'s menu, and its list stops at the Sky\'s top', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 420 });
    await page.goto(`/thoughts/${withSections}/`);
    await page.getByRole('button', { name: 'menu', exact: true }).click();
    const links = page.locator('#site-nav-links a');
    await expect(links.first()).toBeVisible();
    // On a screen this short the menu reaches down past the pill's top.
    const overlap = await page.evaluate(
      () => document.getElementById('site-nav-links')!.getBoundingClientRect().bottom - document.getElementById('section-pill')!.getBoundingClientRect().top,
    );
    expect(overlap).toBeGreaterThan(0);
    const onTop = await links.evaluateAll((all) =>
      all.map((a) => {
        const box = a.getBoundingClientRect();
        return a.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
      }),
    );
    expect(onTop.every(Boolean)).toBe(true);
    await page.keyboard.press('Escape');

    await pillButton(page).click();
    await motionSettled(page);
    const fit = await page.evaluate(() => {
      const list = document.getElementById('section-list')!;
      const button = document.querySelector<HTMLElement>('.nav-menu-button')!.getBoundingClientRect();
      return {
        top: list.getBoundingClientRect().top,
        skyTop: document.getElementById('sky')!.getBoundingClientRect().top,
        menuButtonOnTop: document.elementFromPoint(button.left + button.width / 2, button.top + button.height / 2)?.closest('.nav-menu-button') !== null,
      };
    });
    expect(fit.top).toBeGreaterThanOrEqual(fit.skyTop);
    expect(fit.menuButtonOnTop).toBe(true);
  });

  for (const theme of ['night', 'day'] as const) {
    test(`in ${theme}, the pill and every section in its list reach 4.5:1`, async ({ page }) => {
      await page.goto(`/thoughts/${withSections}/`);
      if (theme === 'day') await page.getByRole('button', { name: /^theme:/ }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await motionSettled(page);
      await pillButton(page).click();
      await motionSettled(page);
      await page.mouse.move(0, 0);
      const { failures, rows } = await textBelowAA(page);
      if (process.env.PRINT_CONTRAST) console.log(`\n${theme}, sections open\n${rows.join('\n')}`);
      for (const name of SECTIONS) expect(rows.filter((row) => row.startsWith(name)).length, name).toBeGreaterThan(0);
      expect(failures).toEqual([]);
    });
  }

  test('follows Night and Day', async ({ page }) => {
    await page.goto(`/thoughts/${withSections}/`);
    const colours = () => pill(page).evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color]);
    const night = await colours();
    await page.getByRole('button', { name: /^theme:/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');
    await motionSettled(page);
    const day = await colours();
    expect(day[0]).not.toBe(night[0]);
    expect(day[1]).not.toBe(night[1]);
  });

  for (const id of withoutSections) {
    test(`${id}, with no sections, has no pill and keeps its scroll hint`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 520 });
      await page.goto(`/thoughts/${id}/`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(pill(page)).toHaveCount(0);
      await expect(page.locator('#section-list')).toHaveCount(0);
      await expect(page.getByText('scroll', { exact: true })).toBeVisible();
    });
  }

  test('the Thoughts list has no pill', async ({ page }) => {
    await page.goto('/thoughts');
    await expect(page.getByRole('link', { name: /Fixture post on the ridge/ })).toBeVisible();
    await expect(pill(page)).toHaveCount(0);
  });

  test('works on a post reached through the navigation, and leaves with it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/thoughts');
    await page.getByRole('link', { name: /Fixture post on the ridge/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fixture post on the ridge');
    await expectCurrent(page, 'Introduction');
    await scrollHeadingTo(page, '[data-post-body] h2', 60);
    await expectCurrent(page, 'A subheading');
    await pillButton(page).click();
    await item(page, 'Introduction').click();
    await expect.poll(() => sky(page).evaluate((el) => el.scrollTop)).toBe(0);

    // The next post has no sections, so the pill goes.
    await page.getByRole('navigation', { name: 'more thoughts' }).getByRole('link', { name: /^Next/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fixture post without a summary');
    await expect(pill(page)).toHaveCount(0);
  });
});
