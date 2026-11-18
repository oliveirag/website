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
  // Code in Thoughts posts carries both a light and a dark colour per token, and the post page picks one from
  // the theme, so code follows Night and Day like everything else.
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light-default', dark: 'github-dark-default' },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [keepDesignelyNotice()],
  },
});
