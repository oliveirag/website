# website

github repository for my personal website

## tests

`npm test` builds the site, serves the build locally and runs the Playwright browser tests against it.

The first run needs the browser: `npx playwright install chromium`.

## licence

my code is MIT, see `LICENSE`. the `src/designely/` folder is excluded from MIT: it holds Designely Studio exports (the Grass scene and its runtime, and Bloom Type for the Intro), Copyright (c) 2026 DESIGNELY LTD, licensed only to play the export (app.designely.studio/licence). their notices stay in place and `designely-runtime.js` is never edited. the build keeps the runtime's copyright notice in the bundled script. the Instrument Serif font in `public/fonts/` is under the SIL Open Font License 1.1 (`src/designely/FONT_LICENSE.txt`).
