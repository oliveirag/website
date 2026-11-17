import { test as base, type Page, type Route } from '@playwright/test';

const PROXY = 'https://my-website-spotify-api.vercel.app';
export const NOW_PLAYING_URL = `${PROXY}/api/spotify`;
export const COMMITS_URL = `${PROXY}/api/github-contributions`;

const CORS = { 'access-control-allow-origin': '*' };

// Responses shaped like the real proxy: 200 with JSON, 204 with no body, 500 with a JSON error.
export const reply = {
  json: (body: unknown) => (route: Route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) }),
  noContent: () => (route: Route) => route.fulfill({ status: 204, headers: CORS, body: '' }),
  serverError: () => (route: Route) =>
    route.fulfill({
      status: 500,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Failed to fetch data' }),
    }),
  networkError: () => (route: Route) => route.abort('failed'),
};

export const track = { title: 'Pink + White', artist: 'Frank Ocean', isPlaying: true, albumImageUrl: '' };

export const commits = {
  year: 2026,
  totalCommits: 412,
  repositories: [
    { name: 'zaklang', language: 'Python', commits: 200 },
    { name: 'ollie', language: 'Swift', commits: 150 },
    { name: 'onetap', language: 'TypeScript', commits: 50 },
    { name: 'website', language: 'Astro', commits: 12 },
  ],
};

type Handler = (route: Route) => Promise<void> | void;

export async function stubApis(page: Page, { nowPlaying, commits: commitsHandler }: { nowPlaying?: Handler; commits?: Handler }) {
  if (nowPlaying) await page.route(NOW_PLAYING_URL, nowPlaying);
  if (commitsHandler) await page.route(COMMITS_URL, commitsHandler);
}

// Every test starts with both APIs answering successfully and no third-party traffic.
// Routes registered later in a test take precedence over these defaults.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.route('https://www.googletagmanager.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
    );
    await page.route('**/_vercel/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await page.route(`${PROXY}/**`, (route) => route.abort('blockedbyclient'));
    await page.route(NOW_PLAYING_URL, reply.json(track));
    await page.route(COMMITS_URL, reply.json(commits));
    await use(page);
  },
});

export { expect } from '@playwright/test';
export type { Page, Locator } from '@playwright/test';
