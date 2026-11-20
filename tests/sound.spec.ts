import { test, expect, stubChatbot, type Page } from './fixtures';

// The sound engine reports its state on the document: locked, playing or muted. These tests read only that
// state and what the sound control shows, never audio output.
const soundState = (page: Page) => page.locator('html');

test('sound is locked until the first gesture', async ({ page }) => {
  await page.goto('/');
  await expect(soundState(page)).toHaveAttribute('data-sound', 'locked');
});

test('the first click starts the Ambience', async ({ page }) => {
  await page.goto('/');
  await page.mouse.click(10, 300);
  await expect(soundState(page)).toHaveAttribute('data-sound', 'playing');
});

test('the first key press starts the Ambience', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('a');
  await expect(soundState(page)).toHaveAttribute('data-sound', 'playing');
});

const soundControl = (page: Page) => page.getByRole('button', { name: /^sound:/ });
// The word the control shows a visitor.
const shownWord = (page: Page) => soundControl(page).locator('span[aria-hidden]:visible');

test('the control mutes sound and says so, and unmuting plays again', async ({ page }) => {
  await page.goto('/');
  await expect(soundControl(page)).toHaveAccessibleName('sound: on');
  await expect(shownWord(page)).toHaveText('on');

  await soundControl(page).click();
  await expect(soundState(page)).toHaveAttribute('data-sound', 'muted');
  await expect(soundControl(page)).toHaveAccessibleName('sound: off');
  await expect(shownWord(page)).toHaveText('off');

  await soundControl(page).click();
  await expect(soundState(page)).toHaveAttribute('data-sound', 'playing');
  await expect(soundControl(page)).toHaveAccessibleName('sound: on');
});

test('the control works from the keyboard and announces the switch', async ({ page }) => {
  await page.goto('/');
  await soundControl(page).focus();
  await page.keyboard.press('Enter');
  await expect(soundState(page)).toHaveAttribute('data-sound', 'muted');
  await expect(page.locator('#sound-announcement')).toHaveText('sound off');

  await page.keyboard.press('Space');
  await expect(soundState(page)).toHaveAttribute('data-sound', 'playing');
  await expect(page.locator('#sound-announcement')).toHaveText('sound on');
});

test('mute is remembered across visits, before and after a gesture', async ({ page }) => {
  await page.goto('/');
  await soundControl(page).click();
  await expect(soundState(page)).toHaveAttribute('data-sound', 'muted');

  await page.reload();
  await expect(soundState(page)).toHaveAttribute('data-sound', 'muted');
  await expect(soundControl(page)).toHaveAccessibleName('sound: off');

  await page.mouse.click(10, 300);
  await expect(soundState(page)).toHaveAttribute('data-sound', 'muted');

  await page.goto('/top-5');
  await expect(soundState(page)).toHaveAttribute('data-sound', 'muted');
});

test('a muted visitor sees the control off from the first paint, before any page script runs', async ({ page }) => {
  await page.goto('/');
  await soundControl(page).click();
  await expect(soundState(page)).toHaveAttribute('data-sound', 'muted');

  // Hold back every bundled page script, so whatever shows now comes from the HTML, CSS and head scripts.
  let releaseScripts!: () => void;
  const scriptsHeld = new Promise<void>((resolve) => (releaseScripts = resolve));
  await page.route('**/_astro/*.js', async (route) => {
    await scriptsHeld;
    await route.continue();
  });

  await page.reload({ waitUntil: 'commit' });
  await expect(soundControl(page)).toHaveAccessibleName('sound: off');
  await expect(shownWord(page)).toHaveText('off');
  releaseScripts();
});

test('the state carries over a client-side page change', async ({ page }) => {
  await page.goto('/');
  await page.mouse.click(10, 300);
  await expect(soundState(page)).toHaveAttribute('data-sound', 'playing');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'top 5' }).click();
  await expect(page).toHaveURL(/\/top-5$/);
  await expect(soundState(page)).toHaveAttribute('data-sound', 'playing');

  await soundControl(page).click();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'chatbot' }).click();
  await expect(page).toHaveURL(/\/chatbot$/);
  await expect(soundState(page)).toHaveAttribute('data-sound', 'muted');
  await expect(soundControl(page)).toHaveAccessibleName('sound: off');
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`the control sits in the bottom left, just above the grass and never on it (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const route of ['/', '/thoughts', '/videos', '/chatbot', '/top-5']) {
      await page.goto(route);
      const control = (await soundControl(page).boundingBox())!;
      const field = (await page.locator('#field').boundingBox())!;
      expect(control.x).toBeLessThan(viewport.width / 4);
      expect(control.y + control.height).toBeLessThanOrEqual(field.y);
      expect(field.y - (control.y + control.height)).toBeLessThanOrEqual(24);
      expect(control.width).toBeGreaterThanOrEqual(44);
      expect(control.height).toBeGreaterThanOrEqual(44);
    }
  });
}

test('the control is reachable by keyboard and shows a focus ring', async ({ page }) => {
  await page.goto('/videos');
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    if (await soundControl(page).evaluate((el) => el === document.activeElement)) break;
  }
  await expect(soundControl(page)).toBeFocused();
  await expect(soundControl(page)).toHaveCSS('outline-style', 'solid');
});

test('no audio is requested before the first gesture', async ({ page }) => {
  const audioRequests: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'media' || request.url().includes('/sounds/')) audioRequests.push(request.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(audioRequests).toEqual([]);
});

test('gestures, links, the theme toggle and a Chatbot send run the sound engine with no errors', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('requestfailed', (request) => problems.push(`${request.url()} ${request.failure()?.errorText}`));
  page.on('response', (response) => response.status() >= 400 && problems.push(`${response.status()} ${response.url()}`));
  await stubChatbot(page, 'hi');

  await page.goto('/');
  await page.mouse.click(10, 300);
  await page.getByRole('button', { name: /^theme:/ }).click();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'chatbot' }).click();
  await expect(page).toHaveURL(/\/chatbot$/);
  await page.getByRole('textbox', { name: 'Message' }).fill('hello');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('hi', { exact: true })).toBeVisible();
  await soundControl(page).click();
  await soundControl(page).click();

  await expect(soundState(page)).toHaveAttribute('data-sound', 'playing');
  expect(problems).toEqual([]);
});
