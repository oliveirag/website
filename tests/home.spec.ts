import { test, expect } from './fixtures';

test('Home shows my name, About, the project cards and Commits', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'guilherme oliveira' })).toBeVisible();
  await expect(page.getByText('about me')).toBeVisible();
  await expect(page.getByText('contact me')).toBeVisible();
  await expect(page.getByText('tech stack')).toBeVisible();
  for (const project of ['Zaklang', 'Ollie', 'OneTap', 'Aperture']) {
    await expect(page.getByRole('link', { name: new RegExp(project) })).toBeVisible();
  }
  await expect(page.getByText('412 commits in 2026')).toBeVisible();
});
