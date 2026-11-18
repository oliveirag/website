import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';

import tailwind from '@astrojs/tailwind';

import react from '@astrojs/react';

import mdx from '@astrojs/mdx';

// The Designely runtime's licence says its copyright notice must stay, but the minifier drops plain comments.
// This puts the notice, read from the runtime's own header, back on the bundled chunk that holds the runtime.
const designelyRuntime = 'src/designely/designely-runtime.js';
const designelyNotice = readFileSync(new URL(designelyRuntime, import.meta.url), 'utf8')
  .split('\n')
  .find((line) => line.includes('Copyright (c)'))
  ?.replace(/^\/\/\s*/, '');
if (!designelyNotice) throw new Error(`No copyright notice found in ${designelyRuntime}`);

function keepDesignelyNotice() {
  return {
    name: 'keep-designely-notice',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        const holdsRuntime = chunk.type === 'chunk' && chunk.moduleIds.some((id) => id.replaceAll('\\', '/').endsWith(designelyRuntime));
        if (holdsRuntime) chunk.code = `/*! designely-runtime.js: ${designelyNotice} */\n${chunk.code}`;
      }
    },
  };
}

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), react(), mdx()],
  site: 'https://notgui.com',
  // Code in Thoughts posts is body text, which stays achromatic (ADR-0001), so it gets no syntax colours. It
  // takes the post's token colours instead and follows Night and Day with the rest of the page.
  markdown: {
    syntaxHighlight: false,
  },
  vite: {
    plugins: [keepDesignelyNotice()],
  },
});
