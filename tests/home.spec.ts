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

test('About keeps the bio, contact, tech stack, photo, resume and Now Playing', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('computer science @ ucf.')).toBeVisible();
  await expect(page.getByText('currently building something cool')).toBeVisible();
  await expect(page.getByText('goliveiracoll@gmail.com')).toBeVisible();
  const social = {
    github: 'https://github.com/oliveirag',
    linkedin: 'https://www.linkedin.com/in/notgui/',
    twitter: 'https://x.com/guiwastaken',
    instagram: 'https://www.instagram.com/notgui/',
  };
  for (const [name, href] of Object.entries(social)) {
    await expect(page.locator('#contact').getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
  await expect(page.locator('#tech-stack')).toHaveText(/python, javascript\/typescript, swift, java, and c\/c\+\+/);
  await expect(page.getByRole('img', { name: 'Guilherme Oliveira' })).toBeVisible();
  const resume = page.getByRole('link', { name: 'Download resume' });
  await expect(resume).toHaveAttribute('href', '/GuilhermeResume.pdf');
  await expect(resume).toHaveAttribute('download', /\.pdf$/);
  await expect(page.getByRole('region', { name: 'Now Playing' })).toContainText('Pink + White');
});

test('"about this site" says what the site is built with and no longer links to the source code', async ({ page }) => {
  await page.goto('/');

  const aboutSite = page.locator('#about-site');
  await expect(aboutSite).toContainText('about this site');
  const words = await aboutSite.evaluate((node) => (node as HTMLElement).innerText.replace(/\s+/g, ' ').trim());
  expect(words).toBe('about this site built with astro, react, and tailwind.');
  await expect(aboutSite.getByRole('link')).toHaveCount(0);
  await expect(page.locator('a[href*="github.com/oliveirag/Website" i]')).toHaveCount(0);
  await expect(page.getByText(/source code/)).toHaveCount(0);
});
