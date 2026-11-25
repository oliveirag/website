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

// The Chatbot's proxy, answering its CORS preflight and replying with `botOutput`.
export async function stubChatbot(page: Page, botOutput: string) {
  const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
  };
  await page.route(`${PROXY}/api/chatbot`, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers })
      : route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ botOutput }) }),
  );
}

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

// YouTube, which the Videos page reaches for thumbnails and, once play is pressed, the player.
export const THUMBNAIL_HOST = 'https://i.ytimg.com';
export const PLAYER_HOST = 'https://www.youtube-nocookie.com';
// A 1x1 grey PNG, so a stubbed thumbnail loads as a real image.
const THUMBNAIL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNoAAAAggCBd81ytgAAAABJRU5ErkJggg==', 'base64');

export async function stubApis(page: Page, { nowPlaying, commits: commitsHandler }: { nowPlaying?: Handler; commits?: Handler }) {
  if (nowPlaying) await page.route(NOW_PLAYING_URL, nowPlaying);
  if (commitsHandler) await page.route(COMMITS_URL, commitsHandler);
}

// Every test starts with both APIs answering successfully and no third-party traffic.
// Routes registered later in a test take precedence over these defaults.
// The Grass scene only runs in tests that ask for it with `test.use({ scene: true })`. Elsewhere WebGL2 is
// unavailable, as in browsers without it: headless Chromium draws WebGL in software, and a full-screen scene
// in every parallel test starves the machine. No test depends on what the scene draws.
// The Intro only shows in tests that ask for it with `test.use({ intro: true })`. Elsewhere the visitor has
// already seen it this session, so Home opens straight onto the page. This is the one place a test knows the
// Preferences storage key, and only to set up a visitor, never to check a result.
export const test = base.extend<{ scene: boolean; intro: boolean }>({
  scene: [false, { option: true }],
  intro: [false, { option: true }],
  page: async ({ page, scene, intro }, use) => {
    if (!intro) {
      await page.addInitScript(() => {
        try {
          sessionStorage.setItem('notgui:intro-seen', 'true');
        } catch {
          // Storage is blocked in this test: the page falls back to its defaults either way.
        }
      });
    }
    if (!scene) {
      await page.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
          return type === 'webgl2' ? null : getContext.call(this, type, ...(rest as []));
        } as typeof getContext;
      });
    }
    await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.route('https://www.googletagmanager.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
    );
    await page.route('**/_vercel/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await page.route(`${PROXY}/**`, (route) => route.abort('blockedbyclient'));
    await page.route(`${THUMBNAIL_HOST}/**`, (route) => route.fulfill({ status: 200, contentType: 'image/png', body: THUMBNAIL }));
    await page.route(`${PLAYER_HOST}/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title><p>player</p>' }),
    );
    await page.route(/^https:\/\/([a-z0-9-]+\.)*(youtube\.com|googlevideo\.com|ggpht\.com)\//, (route) => route.abort('blockedbyclient'));
    await page.route(NOW_PLAYING_URL, reply.json(track));
    await page.route(COMMITS_URL, reply.json(commits));
    await use(page);
  },
});

// Colours ease when the theme changes, and Home's entrance fades run on load. This waits until every animation
// that will end has ended, so a test reads the colours and opacity the page settles on.
export async function motionSettled(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
}

export { expect } from '@playwright/test';
export type { Page, Locator } from '@playwright/test';

// The Projects cards on Home, in order.
export const PROJECT_TITLES = ['zaklang', 'teraphobia', 'ollie', 'aperture', 'onetap', 'lobo'];

// A project's card link. Its name starts with the title, like the separate "<title> source on github" link some
// cards have beside them, so that one is left out.
export const projectCard = (page: Page, title: string) =>
  page.getByRole('link', { name: new RegExp(`^${title}(?! source on github)`) });
