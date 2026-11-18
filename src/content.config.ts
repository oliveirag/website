import { defineCollection, z } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';

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

export const collections = { thoughts };
