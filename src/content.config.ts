import { defineCollection, z } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';

// Thoughts: one MDX file per post in src/content/thoughts. A post with no title or no date fails the build.
// The browser tests build the site a second time with THOUGHTS_DIR pointing at their fixture posts. Nothing
// else sets it, so the live site only ever has the real posts.
const posts = glob({ pattern: '**/*.mdx', base: process.env.THOUGHTS_DIR ?? './src/content/thoughts' });

// Astro keeps loaded posts in a cache between builds. When the folder has no posts at all, its glob loader
// stops before it drops the cached ones, so a deleted last post (or a fixture post from the test build) would
// still be built. Starting from an empty collection each time makes the folder the only source.
const thoughtsLoader: Loader = {
  name: 'thoughts-loader',
  load: async (context) => {
    context.store.clear();
    await posts.load(context);
  },
};

const thoughts = defineCollection({
  loader: thoughtsLoader,
  schema: z.object({
    title: z.string().trim().min(1),
    // A YAML date (2026-11-18) arrives as a Date. No coercion, so an empty `date:` fails instead of becoming 1970.
    date: z.date(),
    summary: z.string().trim().min(1).optional(),
  }),
});

export const collections = { thoughts };
