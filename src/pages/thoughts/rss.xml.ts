// The Thoughts RSS feed, built with the site. With no posts it is a valid feed with no items.
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { thoughtsNewestFirst, thoughtPath } from '../../scripts/thoughts';

export async function GET(context: APIContext) {
  const posts = await thoughtsNewestFirst();
  return rss({
    title: "thoughts | gui's website",
    description: 'posts guilherme oliveira writes in the moment, short or long.',
    site: new URL('/thoughts/', context.site),
    customData: '<language>en</language>',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary,
      link: thoughtPath(post),
    })),
  });
}
