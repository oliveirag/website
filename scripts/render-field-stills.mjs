// Renders the still pictures of the grass the Field shows where the Grass scene can't run (no WebGL2).
// Each still is the real scene, drawn by the built site in Night and in Day, cut to the Field band and
// saved as WebP in public/images/field/. Run it again whenever the scene palette or the Grass settings change:
//
//   npm run build && node scripts/render-field-stills.mjs
//
// It serves the build with `astro preview`, opens each theme in headless Chromium (which draws WebGL in
// software, so a frame takes a few seconds at this size), waits for the scene to draw a few frames with the
// pointer away from the grass, and screenshots the band. The stills are renders of the Designely scene, so
// like src/designely/ they are excluded from the MIT licence.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const PORT = 4331;
const ORIGIN = `http://127.0.0.1:${PORT}`;
// A wide 16:9 screen: the band comes out 2400x405, wider than most screens it will cover, and the CSS crops
// its sides on narrower ones.
const VIEWPORT = { width: 2400, height: 1350 };
const OUT = new URL('../public/images/field/', import.meta.url);
const QUALITY = 72;

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

const server = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', String(PORT)], { stdio: 'ignore' });
try {
  await waitForServer();
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const theme of ['night', 'day']) {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.addInitScript((chosen) => {
      // A returning visitor in the chosen theme, so there is no Intro over the Field.
      localStorage.setItem('notgui:theme', JSON.stringify(chosen));
      sessionStorage.setItem('notgui:intro-seen', 'true');
      // Count the scene's draws, to know when it has drawn a few frames.
      const counted = window;
      counted.draws = 0;
      const proto = WebGL2RenderingContext.prototype;
      const draw = proto.drawArrays;
      proto.drawArrays = function (...args) {
        counted.draws++;
        return draw.apply(this, args);
      };
    }, theme);
    await page.goto(`${ORIGIN}/videos`);
    await page.waitForFunction(() => window.draws >= 12, null, { timeout: 120_000, polling: 250 });
    const band = await page.locator('#field').boundingBox();
    const png = await page.screenshot({ clip: band });
    const webp = await sharp(png).webp({ quality: QUALITY, effort: 6 }).toBuffer();
    const file = new URL(`grass-${theme}.webp`, OUT);
    await writeFile(file, webp);
    console.log(`${file.pathname}: ${Math.round(band.width)}x${Math.round(band.height)}, ${Math.round(webp.length / 1024)} kB`);
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
}
