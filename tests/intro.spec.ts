import { test, expect, type Page } from './fixtures';

// The Intro: on the first visit to Home in a browser session, the name grows flowers full screen until the
// visitor clicks, taps or presses a key. Each test starts a new browser session.
test.use({ intro: true });

const intro = (page: Page) => page.getByRole('dialog', { name: 'intro' });
const homeHeading = (page: Page) => page.getByRole('heading', { level: 1, name: 'guilherme oliveira' });

test('the first visit to Home shows the Intro with the name, a hint and a skip control', async ({ page }) => {
  await page.goto('/');

  await expect(intro(page)).toBeVisible();
  await expect(intro(page).getByRole('img', { name: /^guilherme oliveira/ })).toBeVisible();
  await expect(intro(page).getByText('click, tap or press any key to continue')).toBeVisible();
  await expect(intro(page).getByRole('button', { name: 'skip intro' })).toBeVisible();
  // The real heading is in the document the whole time, not only drawn on the canvas.
  await expect(homeHeading(page)).toBeAttached();
  // Focus moves into the Intro, so a screen reader announces it.
  await expect(intro(page)).toBeFocused();
});

// The middle of a Home link that sits under the Intro, so a press that leaked through would follow it.
async function overHomeLink(page: Page) {
  const box = await page.getByRole('link', { name: 'thoughts' }).boundingBox();
  if (!box) throw new Error('The thoughts link has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function expectHomeShown(page: Page) {
  await expect(intro(page)).toBeHidden();
  await expect(homeHeading(page)).toBeFocused();
  await expect(page).toHaveURL('/');
  expect(page.context().pages()).toHaveLength(1);
}

test('a click ends the Intro, shows Home with focus on its heading, and follows nothing under it', async ({ page }) => {
  await page.goto('/');
  await expect(intro(page)).toBeVisible();

  const { x, y } = await overHomeLink(page);
  await page.mouse.click(x, y);

  await expectHomeShown(page);
});

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true });

  test('a tap ends the Intro, shows Home with focus on its heading, and follows nothing under it', async ({ page }) => {
    await page.goto('/');
    await expect(intro(page)).toBeVisible();

    const { x, y } = await overHomeLink(page);
    await page.touchscreen.tap(x, y);

    await expectHomeShown(page);
  });
});

for (const key of ['Enter', 'Space', 'Tab', 'Escape', 'g']) {
  test(`pressing ${key} ends the Intro and leaves focus on Home's heading`, async ({ page }) => {
    await page.goto('/');
    await expect(intro(page)).toBeVisible();

    await page.keyboard.press(key);

    await expectHomeShown(page);
    // The key only ended the Intro: it didn't scroll the Sky as well.
    expect(await page.locator('#sky').evaluate((sky) => sky.scrollTop)).toBe(0);
  });
}

test('a character typed with AltGr (Ctrl and Alt on Windows) ends the Intro', async ({ page }) => {
  await page.goto('/');
  await expect(intro(page)).toBeFocused();
  await page.keyboard.press('Control+Alt+KeyE');
  await expectHomeShown(page);
});

test('a browser shortcut is left to the browser and does not end the Intro', async ({ page }) => {
  await page.goto('/');
  await expect(intro(page)).toBeFocused();
  await page.keyboard.press('Control+KeyA');
  await page.keyboard.press('Meta+KeyA');
  await expect(intro(page)).toBeVisible();
});

test('a click on the skip control ends the Intro', async ({ page }) => {
  await page.goto('/');
  const skip = intro(page).getByRole('button', { name: 'skip intro' });
  await skip.click();
  await expectHomeShown(page);
});

test('a screen reader can end the Intro with the skip control alone', async ({ page }) => {
  await page.goto('/');
  // Assistive tech activates a button with a click event and no pointer or key press before it.
  await intro(page).getByRole('button', { name: 'skip intro' }).dispatchEvent('click');
  await expectHomeShown(page);
});

test('the Intro shows once per session: not after a reload, nor on coming back to Home', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expectHomeShown(page);

  await page.reload();
  await expect(homeHeading(page)).toBeVisible();
  await expect(intro(page)).toBeHidden();

  await page.getByRole('link', { name: 'top 5' }).click();
  await expect(page).toHaveURL('/top-5');
  await page.goBack();
  await expect(page).toHaveURL('/');
  await expect(homeHeading(page)).toBeVisible();
  await expect(intro(page)).toBeHidden();
});

for (const route of ['/top-5', '/chatbot', '/thoughts', '/videos']) {
  test(`a direct link to ${route} shows no Intro`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

test('"projects" from another page goes straight to Projects, with no Intro', async ({ page }) => {
  await page.goto('/top-5');
  await page.getByRole('link', { name: 'projects' }).click();
  await expect(page).toHaveURL(/\/#projects$/);
  await expect(page.locator('#projects')).toBeInViewport();
  await expect(intro(page)).toBeHidden();
});

test('a direct link to Projects on Home shows no Intro', async ({ page }) => {
  await page.goto('/#projects');
  await expect(page.locator('#projects')).toBeInViewport();
  await expect(intro(page)).toBeHidden();
});

test('ending the Intro starts the sound', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-sound', 'locked');

  await page.keyboard.press('Escape');

  await expectHomeShown(page);
  await expect(page.locator('html')).toHaveAttribute('data-sound', 'playing');
});

// How long the Intro's fade out lasts, read from its styles at the moment the fade starts.
async function recordFadeOut(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener('transitionrun', (event) => {
      const target = event.target as HTMLElement;
      if (target.id === 'intro' && event.propertyName === 'opacity') {
        document.documentElement.dataset.testIntroFade = getComputedStyle(target).transitionDuration;
      }
    });
  });
  return () => page.locator('html').getAttribute('data-test-intro-fade');
}

test('the Intro crossfades into Home', async ({ page }) => {
  const fadeOut = await recordFadeOut(page);
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expectHomeShown(page);
  expect(await fadeOut()).toBe('0.4s');
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the Intro still shows, then leaves with a 150ms crossfade', async ({ page }) => {
    const fadeOut = await recordFadeOut(page);
    await page.goto('/');
    await expect(intro(page)).toBeVisible();
    // Bloom Type draws its fully grown still frame by itself under reduced motion.
    await expect(intro(page).getByRole('img', { name: /^guilherme oliveira/ })).toBeVisible();

    await page.keyboard.press('Enter');

    await expectHomeShown(page);
    expect(await fadeOut()).toBe('0.15s');
  });
});

test('the drawing is under the pointer across the screen, so the flowers can lean toward it', async ({ page }) => {
  await page.goto('/');
  const drawing = intro(page).getByRole('img', { name: /^guilherme oliveira/ });
  await expect(drawing).toBeVisible();
  const viewport = page.viewportSize()!;
  for (const [fx, fy] of [[0.5, 0.5], [0.2, 0.3], [0.8, 0.7], [0.5, 0.95]]) {
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.getAttribute('role'),
      [viewport.width * fx, viewport.height * fy],
    );
    expect(hit, `at ${fx}, ${fy}`).toBe('img');
  }
});

// The sky the Field paints behind the grass, which the Intro has to show unchanged.
const fieldSky = (page: Page) => page.locator('.field-sky').evaluate((sky) => getComputedStyle(sky).backgroundImage);

test('in Night the Intro is drawn in the Night palette on the Field\'s own sky', async ({ page }) => {
  await page.goto('/');
  await expect(intro(page)).toHaveCSS('background-image', await fieldSky(page));
  await expect(intro(page)).toHaveCSS('background-image', /rgb\(5, 10, 28\)/);
  await expect(intro(page).locator('[data-palette]')).toHaveAttribute('data-palette', 'night');
});

test('in Day the Intro is drawn in the Day palette on the Field\'s own sky', async ({ page }) => {
  await page.goto('/top-5');
  await page.getByRole('button', { name: /^theme:/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');

  await page.goto('/');
  await expect(intro(page)).toHaveCSS('background-image', await fieldSky(page));
  await expect(intro(page)).toHaveCSS('background-image', /rgb\(196, 219, 243\)/);
  await expect(intro(page).locator('[data-palette]')).toHaveAttribute('data-palette', 'day');
});

test('the Intro covers Home from the first paint, before any page script runs', async ({ page }) => {
  // Hold back every bundled script, so whatever shows comes from the HTML, the CSS and the head scripts.
  let releaseScripts!: () => void;
  const scriptsHeld = new Promise<void>((resolve) => (releaseScripts = resolve));
  await page.route('**/_astro/*.js', async (route) => {
    await scriptsHeld;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(intro(page)).toBeVisible();
  await expect(intro(page).getByText('click, tap or press any key to continue')).toBeVisible();
  const box = await intro(page).boundingBox();
  expect(box).toEqual({ x: 0, y: 0, ...page.viewportSize()! });

  releaseScripts();
  await expect(intro(page).getByRole('img', { name: /^guilherme oliveira/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expectHomeShown(page);
});

test('the Intro ends even before Bloom Type has loaded', async ({ page }) => {
  // Hold back the drawing's script for the whole test.
  await page.route('**/_astro/IntroBloom*.js', () => {});
  await page.goto('/');
  await expect(intro(page)).toBeVisible();
  await expect(intro(page).getByText('click, tap or press any key to continue')).toBeVisible();

  await page.keyboard.press('Enter');
  await expectHomeShown(page);
});

test('a visitor who has seen the Intro never downloads Bloom Type', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expectHomeShown(page);

  const bloomRequests: string[] = [];
  page.on('request', (request) => {
    if (/IntroBloom/.test(request.url())) bloomRequests.push(request.url());
  });
  await page.reload();
  await expect(homeHeading(page)).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(bloomRequests).toEqual([]);
});
