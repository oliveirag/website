// Renders the still pictures of the grass the Field shows where the Grass scene can't run (no WebGL2).
// Each still is the real scene, drawn by the built site in Night and in Day, cut to the Field band and
// saved as WebP next to the scene in src/designely/ (like the rest of that folder, they are excluded from the
// MIT licence). Run it again whenever the scene palette or the Grass settings change:
//
//   npm run build && node scripts/render-field-stills.mjs
//
// It serves the build with `astro preview` and opens the Videos page in headless Chromium, which never shows
// the Intro and draws WebGL in software (a frame takes a few seconds at this size). For each theme it waits for
// the scene to draw a few frames with the pointer away from the grass, then screenshots the band.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const PORT = 4331;
const ORIGIN = `http://127.0.0.1:${PORT}`;
// A wide 16:9 screen: the band comes out 2400x405, wider than most screens it will cover, and the CSS crops
// its sides on narrower ones.
const VIEWPORT = { width: 2400, height: 1350 };
const OUT = new URL('../src/designely/', import.meta.url);
const QUALITY = 72;
// The site opens in Night; the theme toggle switches to Day.
const THEMES = ['night', 'day'];

async function waitForServer() {
  for (let tries = 0; tries < 100; tries++) {
    try {
      if ((await fetch(ORIGIN)).ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`astro preview did not start on ${ORIGIN}`);
}

// Waits until the scene has drawn this many more frames' worth of draw calls.
async function waitForDraws(page, more) {
  const start = await page.evaluate(() => window.draws);
  await page.waitForFunction((target) => window.draws >= target, start + more, { timeout: 120_000, polling: 250 });
}

const server = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', String(PORT)], { stdio: 'ignore' });
try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  // Count the scene's draws, to know when it has drawn a few frames.
  await page.addInitScript(() => {
    window.draws = 0;
    const proto = WebGL2RenderingContext.prototype;
    const draw = proto.drawArrays;
    proto.drawArrays = function (...args) {
      window.draws++;
      return draw.apply(this, args);
    };
  });
  await page.goto(`${ORIGIN}/videos`);
  for (const theme of THEMES) {
    if (theme !== THEMES[0]) await page.getByRole('button', { name: /^theme:/ }).click();
    await page.locator(`html[data-theme="${theme}"]`).waitFor({ state: 'attached' });
    // Move the pointer off the page so it doesn't part the grass.
    await page.mouse.move(0, 0);
    await waitForDraws(page, 12);
    const band = await page.locator('#field').boundingBox();
    const png = await page.screenshot({ clip: band });
    const webp = await sharp(png).webp({ quality: QUALITY, effort: 6 }).toBuffer();
    const file = new URL(`grass-${theme}.webp`, OUT);
    await writeFile(file, webp);
    console.log(`${file.pathname}: ${Math.round(band.width)}x${Math.round(band.height)}, ${Math.round(webp.length / 1024)} kB`);
  }
  await browser.close();
} finally {
  server.kill();
}
