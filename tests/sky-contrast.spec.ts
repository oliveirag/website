import { test, expect, reply, type Page } from './fixtures';
import { rgbaFromHex } from './contrast';
import { findText, textBelowAA } from './sky-text';

// Every piece of text on Home that sits on the sky must reach 4.5:1 (WCAG AA) wherever it can be: content
// scrolls from the top of the sky down to just above the horizon, so it is checked against both ends.
// Text on a card, button or other surface is on that surface's colour instead. The maths is in sky-text.ts.

async function openHome(page: Page, theme: 'night' | 'day') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  if (theme === 'day') await page.getByRole('button', { name: /^theme:/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.getByRole('region', { name: 'Now Playing' })).not.toContainText('Loading');
  await expect(page.getByRole('region', { name: 'Commits' })).not.toContainText('Loading');
  // Let entrance fades finish, so text is checked at the opacity it settles at.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
}

const commitsStates = {
  loaded: undefined,
  failed: reply.serverError(),
  empty: reply.json({ year: 2026, totalCommits: 0 }),
};

for (const theme of ['night', 'day'] as const) {
  for (const [state, commits] of Object.entries(commitsStates)) {
    test(`in ${theme}, all text on Home reaches 4.5:1 from the top of the sky to the horizon (Commits ${state})`, async ({ page }) => {
      if (commits) await page.route('https://my-website-spotify-api.vercel.app/api/github-contributions', commits);
      await openHome(page, theme);
      const { found, failures, rows } = await textBelowAA(page);
      expect(found.length).toBeGreaterThan(20);
      if (process.env.PRINT_CONTRAST) console.log(`\n${theme} (Commits ${state})\n${rows.join('\n')}`);
      expect(failures).toEqual([]);
    });
  }
}

test('no tertiary text sits on the sky on Home, in either theme', async ({ page }) => {
  // Day's tertiary grey can't reach 4.5:1 on any blue sky, so Home keeps it on surfaces only.
  for (const theme of ['night', 'day'] as const) {
    await openHome(page, theme);
    const [tr, tg, tb] = rgbaFromHex(
      await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary')),
    );
    const found = await findText(page);
    const tertiaryOnSky = found.filter(({ colours, surface }) => !surface && colours.some(([r, g, b]) => r === tr && g === tg && b === tb));
    expect(tertiaryOnSky.map((f) => f.text), theme).toEqual([]);
  }
});
