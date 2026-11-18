import { defineCollection, z } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Thoughts: one MDX file per post in src/content/thoughts. A post with no title or no date fails the build.
// The browser tests build the site a second time with THOUGHTS_DIR pointing at their fixture posts. Nothing
// else sets it, so the live site only ever has the real posts.
const postFiles = glob({ pattern: '**/*.mdx', base: process.env.THOUGHTS_DIR ?? './src/content/thoughts' });

// Astro keeps loaded posts in a cache between builds. When the folder has no posts at all, its glob loader
// stops before it drops the cached ones, so a deleted last post (or a fixture post from the test build) would
// still be built. Starting from an empty collection each time makes the folder the only source.
const thoughtsLoader: Loader = {
  name: 'thoughts-loader',
  load: async (context) => {
    context.store.clear();
    await postFiles.load(context);
  },
};

const thoughts = defineCollection({
  loader: thoughtsLoader,
  schema: z.object({
    title: z.string().trim().min(1),
    // A plain YAML date (2026-11-18) arrives as a Date; a quoted one ("2026-11-18") as a string, read as that
    // day. Nothing is coerced, so an empty `date:` fails instead of becoming 1970.
    date: z.union([z.date(), z.string().date().transform((day) => new Date(day))]),
    summary: z.string().trim().min(1).optional(),
  }),
});

// Videos: one entry per video in src/data/videos.json, a list of { youtubeId, title, date }. Empty at launch.
// The browser tests build the site a second time with VIDEOS_FILE pointing at their fixture list. Nothing else
// sets it, so the live site only ever has the real list.
// Astro's own file loader only logs a list it can't read and skips an entry with no id, which would ship the
// empty page from a green build. This one fails the build instead, and starts from an empty collection each
// time, like Thoughts, so the list is the only source.
const videosLoader: Loader = {
  name: 'videos-loader',
  load: async ({ store, parseData, config, watcher }) => {
    const file = resolve(fileURLToPath(config.root), process.env.VIDEOS_FILE ?? 'src/data/videos.json');
    const sync = async () => {
      store.clear();
      let list: unknown;
      try {
        list = JSON.parse(await readFile(file, 'utf8'));
      } catch (error) {
        throw new Error(`The videos list ${file} is not valid JSON: ${(error as Error).message}`);
      }
      if (!Array.isArray(list)) throw new Error(`The videos list ${file} must be a list: [ ... ].`);
      for (const [index, entry] of list.entries()) {
        // The YouTube ID names the entry. Without one, the schema below says what is missing.
        const youtubeId = (entry as { youtubeId?: unknown } | null)?.youtubeId;
        const id = typeof youtubeId === 'string' ? youtubeId : `entry ${index + 1}`;
        if (store.has(id)) throw new Error(`The video ${id} is in the list twice.`);
        store.set({ id, data: await parseData({ id, data: entry as Record<string, unknown> }) });
      }
    };
    await sync();
    // In `npm run dev`, an edited list shows without restarting.
    watcher?.add(file);
    watcher?.on('change', (changed) => {
      if (changed === file) sync().catch((error) => console.error(error));
    });
  },
};

const videos = defineCollection({
  loader: videosLoader,
  schema: z.object({
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'a YouTube ID is the 11 characters after "v=" in the video\'s link'),
    title: z.string().trim().min(1),
    // The day it went up, quoted: "2026-11-18".
    date: z.string().date().transform((day) => new Date(day)),
  }),
});

export const collections = { thoughts, videos };
