import { defineConfig, devices } from '@playwright/test';

const PORT = 4329;
// A second build with the fixture Thoughts posts in tests/fixtures/thoughts and the fixture Videos list in
// tests/fixtures/videos.json, served on its own port. The live site never sees them: only this config sets
// THOUGHTS_DIR and VIDEOS_FILE, and that build goes to its own folder.
const FIXTURES_PORT = 4330;
// The specs that run against the fixture build.
const FIXTURE_SPECS = /(thoughts|videos)\.spec\.ts/;
const preview = (port: number, outDir = 'dist') => `npm run preview -- --host 127.0.0.1 --port ${port} --outDir ${outDir}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', testIgnore: FIXTURE_SPECS, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'fixtures',
      testMatch: FIXTURE_SPECS,
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${FIXTURES_PORT}` },
    },
  ],
  // Playwright starts these one after the other, each once the one before answers. Both builds share Astro's
  // content cache, so they must never run at the same time, and the real build runs last.
  webServer: [
    {
      command: `THOUGHTS_DIR=tests/fixtures/thoughts VIDEOS_FILE=tests/fixtures/videos.json npm run build -- --outDir dist-fixtures && ${preview(FIXTURES_PORT, 'dist-fixtures')}`,
      url: `http://127.0.0.1:${FIXTURES_PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `npm run build && ${preview(PORT)}`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
