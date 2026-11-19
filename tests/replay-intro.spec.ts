import { test, expect, type Page } from './fixtures';

// Replay Intro: a text control at the bottom right of Home, just above the grass, mirroring the sound control
// at the bottom left. It plays the Intro again from the start and lands back on Home the way a first visit
// does. These tests start as a visitor who has already seen the Intro this session.

const SIZES = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
  'narrow phone': { width: 320, height: 640 },
  'phone on its side': { width: 667, height: 375 },
};

const replay = (page: Page) => page.getByRole('button', { name: 'replay intro' });
const sound = (page: Page) => page.getByRole('button', { name: /^sound:/ });

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const [size, viewport] of Object.entries(SIZES)) {
  test(`on a ${size}, replay intro sits at the bottom right of Home just above the grass, clear of the other controls`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(replay(page)).toBeVisible();

    const band = (await page.locator('#field').boundingBox())!;
    const box = (await replay(page).boundingBox())!;
    const soundBox = (await sound(page).boundingBox())!;

    // Just above the grass, never on it, on the same line as the sound control.
    expect(box.y + box.height).toBeLessThanOrEqual(band.y);
    expect(band.y - (box.y + box.height)).toBeLessThan(24);
    expect(box.y + box.height).toBeCloseTo(soundBox.y + soundBox.height, 0);
    // In the bottom right corner, as far from the right edge as the sound control is from the left.
    expect(viewport.width - (box.x + box.width)).toBeCloseTo(soundBox.x, 0);
    // A target of at least 44px.
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    // Clear of the sound control and the scroll hint (Home always has more below, so the hint shows).
    expect(overlaps(box, soundBox)).toBe(false);
    const hint = page.getByText('scroll', { exact: true });
    await expect(hint).toBeVisible();
    expect(overlaps(box, (await hint.boundingBox())!)).toBe(false);
  });
}

const intro = (page: Page) => page.getByRole('dialog', { name: 'intro' });
const homeHeading = (page: Page) => page.getByRole('heading', { level: 1, name: 'guilherme oliveira' });

// Home the way a first visit lands on it: the Intro gone, focus on the heading, the grass back in place.
async function expectHomeShown(page: Page) {
  await expect(intro(page)).toBeHidden();
  await expect(page.locator('html')).not.toHaveAttribute('data-intro');
  await expect(homeHeading(page)).toBeFocused();
  await expect(page).toHaveURL('/');
  const band = (await page.locator('#field').boundingBox())!;
  expect(band.y + band.height).toBeCloseTo(page.viewportSize()!.height, 0);
}

test('replay intro plays the Intro from the start, with the name drawing again, and ends on Home', async ({ page }) => {
  await page.goto('/');
  // Down the page first: a first visit starts at the top of Home.
  await page.getByRole('main').evaluate((sky) => sky.scrollTo({ top: sky.scrollHeight, behavior: 'instant' }));

  await replay(page).click();

  await expect(intro(page)).toBeVisible();
  await expect(intro(page)).toBeFocused();
  await expect(intro(page).getByRole('img', { name: /^guilherme oliveira/ })).toBeVisible();
  await expect(intro(page).getByText('tap or press any key to continue', { exact: true })).toBeVisible();
  // The grass waits below the screen to rise again, as on a first visit.
  const band = (await page.locator('#field').boundingBox())!;
  expect(band.y).toBeGreaterThanOrEqual(page.viewportSize()!.height - 1);
  expect(await page.getByRole('main').evaluate((sky) => sky.scrollTop)).toBe(0);

  await page.keyboard.press('Escape');
  await expectHomeShown(page);
});

for (const route of ['/thoughts', '/videos', '/chatbot', '/top-5']) {
  test(`replay intro is on Home only, not on ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(sound(page)).toBeVisible();
    await expect(replay(page)).toHaveCount(0);
  });
}

test('replay intro leaves with Home when moving to another page, and comes back with it', async ({ page }) => {
  await page.goto('/');
  await expect(replay(page)).toBeVisible();
  await page.getByRole('link', { name: 'thoughts' }).click();
  await expect(page).toHaveURL(/\/thoughts$/);
  await expect(replay(page)).toHaveCount(0);
  await page.getByRole('link', { name: 'home', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(replay(page)).toBeVisible();
});

test('replay intro is the last stop when tabbing through Home, shows a focus ring and starts with Enter', async ({ page }) => {
  await page.goto('/');
  await sound(page).focus();
  await page.keyboard.press('Tab');
  await expect(replay(page)).toBeFocused();
  await expect(replay(page)).toHaveCSS('outline-style', 'solid');

  // Held down, Enter repeats; the repeats don't end the Intro it just started.
  await page.keyboard.down('Enter');
  await expect(intro(page)).toBeVisible();
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await page.waitForTimeout(300);
  await expect(page.locator('html')).toHaveAttribute('data-intro', 'showing');

  // The next press ends it as usual.
  await page.keyboard.press('Enter');
  await expectHomeShown(page);
});

test('replay intro starts with Space, and the Intro stays until the next key', async ({ page }) => {
  await page.goto('/');
  await replay(page).focus();
  await page.keyboard.press('Space');
  await expect(intro(page)).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.locator('html')).toHaveAttribute('data-intro', 'showing');

  await page.keyboard.press('Space');
  await expectHomeShown(page);
});

test('the replayed Intro plays with sound, and ends with it still playing', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-sound', 'locked');

  await replay(page).click();
  await expect(intro(page)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-sound', 'playing');

  await page.keyboard.press('Escape');
  await expectHomeShown(page);
  await expect(page.locator('html')).toHaveAttribute('data-sound', 'playing');
});

test('muted, the replayed Intro stays silent', async ({ page }) => {
  await page.goto('/');
  await sound(page).click();
  await expect(page.locator('html')).toHaveAttribute('data-sound', 'muted');

  await replay(page).click();
  await expect(intro(page)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-sound', 'muted');

  await page.keyboard.press('Escape');
  await expectHomeShown(page);
  await expect(page.locator('html')).toHaveAttribute('data-sound', 'muted');
});

test('the Intro can be replayed again and again', async ({ page }) => {
  await page.goto('/');
  for (let round = 0; round < 2; round++) {
    await replay(page).click();
    await expect(intro(page)).toBeVisible();
    await expect(intro(page).getByRole('img', { name: /^guilherme oliveira/ })).toHaveAttribute('data-ready', '1');
    await page.keyboard.press('Escape');
    await expectHomeShown(page);
  }
});

test('a press on replay intro while the Intro is leaving does not bring it back', async ({ page }) => {
  await page.goto('/');
  await replay(page).click();
  await expect(intro(page).getByRole('img', { name: /^guilherme oliveira/ })).toHaveAttribute('data-ready', '1');

  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-intro', 'leaving');
  await replay(page).click();

  // The click takes focus to the button, as any click does; the Intro just finishes leaving.
  await expect(intro(page)).toBeHidden();
  await expect(page.locator('html')).not.toHaveAttribute('data-intro');
  await page.waitForTimeout(300);
  await expect(page.locator('html')).not.toHaveAttribute('data-intro');
});

test('replay intro works after leaving Home and coming back to it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'thoughts' }).click();
  await expect(page).toHaveURL(/\/thoughts$/);
  await page.getByRole('link', { name: 'home', exact: true }).click();
  await expect(page).toHaveURL('/');

  await replay(page).click();
  await expect(intro(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(intro(page)).toBeHidden();
  await expect(homeHeading(page)).toBeFocused();
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the replayed Intro follows the Intro\'s reduced motion: nothing travels and it leaves with a 150ms crossfade', async ({ page }) => {
    await page.goto('/');
    await replay(page).click();
    await expect(intro(page)).toBeVisible();
    const band = (await page.locator('#field').boundingBox())!;
    expect(band.y + band.height).toBe(page.viewportSize()!.height);

    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveAttribute('data-intro', 'leaving');
    await expect(intro(page)).toHaveCSS('transition-duration', '0.15s');
    await expectHomeShown(page);
  });
});

test('on a phone on its side, the open menu sits over replay intro, so its last link can still be tapped', async ({ page }) => {
  await page.setViewportSize(SIZES['phone on its side']);
  await page.goto('/');
  await page.getByRole('button', { name: 'menu' }).click();
  const last = page.getByRole('link', { name: 'top 5', exact: true });
  await expect(last).toBeVisible();

  await last.scrollIntoViewIfNeeded();

  // The menu reaches down into replay intro's corner. Where the two meet, a tap reaches the link.
  const linkBox = (await last.boundingBox())!;
  const controlBox = (await replay(page).boundingBox())!;
  expect(overlaps(linkBox, controlBox)).toBe(true);
  const x = (Math.max(linkBox.x, controlBox.x) + Math.min(linkBox.x + linkBox.width, controlBox.x + controlBox.width)) / 2;
  const y = (Math.max(linkBox.y, controlBox.y) + Math.min(linkBox.y + linkBox.height, controlBox.y + controlBox.height)) / 2;
  const reached = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('a')?.textContent?.trim() ?? null, [x, y]);
  expect(reached).toBe('top 5');

  await last.click();
  await expect(page).toHaveURL(/\/top-5$/);
  await expect(intro(page)).toBeHidden();
});

test('a click ends the replayed Intro, and its own click does not start it again', async ({ page }) => {
  await page.goto('/');
  await replay(page).click();
  await expect(intro(page).getByRole('img', { name: /^guilherme oliveira/ })).toHaveAttribute('data-ready', '1');

  // Pressed right where replay intro sits under the cover.
  const box = (await replay(page).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expectHomeShown(page);
  await page.waitForTimeout(300);
  await expect(page.locator('html')).not.toHaveAttribute('data-intro');
});
