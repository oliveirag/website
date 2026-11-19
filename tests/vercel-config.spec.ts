import { existsSync, readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// Vercel reads vercel.json when it serves notgui.com, but `astro preview` ignores it, so this checks the file itself.
// It holds the old resume address's redirect and nothing else: a vercel.json with headers once sent noindex and
// took notgui.com out of search results.
test('vercel.json only redirects the old resume address to the new one', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  expect(config).toEqual({
    redirects: [{ source: '/GuilhermeResume.pdf', destination: '/resume.pdf', permanent: true }],
  });
  expect(JSON.stringify(config)).not.toMatch(/robots|noindex|headers/i);
  expect(existsSync(new URL('../public/resume.pdf', import.meta.url))).toBe(true);
});
