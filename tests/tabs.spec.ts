import { test, expect, type Page } from './fixtures';

const panels = (page: Page) => ({
  projects: page.getByRole('link', { name: /Zaklang/ }),
  chatbot: page.getByRole('textbox', { name: 'Message' }),
  top5: page.getByText('my favorite media'),
});

async function expectOnly(page: Page, shown: 'projects' | 'chatbot' | 'top5') {
  const tabNames = { projects: 'Projects', chatbot: 'Chatbot', top5: 'Top 5' } as const;
  const all = panels(page);
  for (const key of Object.keys(tabNames) as (keyof typeof tabNames)[]) {
    const tab = page.getByRole('tab', { name: tabNames[key] });
    if (key === shown) {
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(all[key]).toBeVisible();
    } else {
      await expect(tab).toHaveAttribute('aria-selected', 'false');
      await expect(all[key]).toBeHidden();
    }
  }
}

test.describe('Tab switcher', () => {
  test('opens on Projects', async ({ page }) => {
    await page.goto('/');
    await expectOnly(page, 'projects');
  });

  test('switches between Projects, Chatbot and Top 5', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('tab', { name: 'Chatbot' }).click();
    await expectOnly(page, 'chatbot');

    await page.getByRole('tab', { name: 'Top 5' }).click();
    await expectOnly(page, 'top5');

    await page.getByRole('tab', { name: 'Projects' }).click();
    await expectOnly(page, 'projects');
  });

  test('opens Chatbot from #chatbot', async ({ page }) => {
    await page.goto('/#chatbot');
    await expectOnly(page, 'chatbot');
  });

  for (const hash of ['#bookshelf', '#other']) {
    test(`opens Top 5 from ${hash}`, async ({ page }) => {
      await page.goto(`/${hash}`);
      await expectOnly(page, 'top5');
    });
  }

  test('opens Top 5 at the list named in the hash', async ({ page }) => {
    await page.goto('/#video-games');
    await expectOnly(page, 'top5');
    await expect(page.getByText('video games', { exact: true })).toBeInViewport();
  });

  test('follows hash changes after load', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => (window.location.hash = '#chatbot'));
    await expectOnly(page, 'chatbot');
  });

  test('ignores a hash that is not a valid selector', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#1%20bad[');
    await expectOnly(page, 'projects');
    await expect(page.getByText('412 commits in 2026')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
