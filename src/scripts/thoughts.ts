import { getCollection, type CollectionEntry } from 'astro:content';

export type Thought = CollectionEntry<'thoughts'>;

// Every post, newest first. Posts from the same day keep a stable order by their file name.
export async function thoughtsNewestFirst(): Promise<Thought[]> {
  const posts = await getCollection('thoughts');
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

export const thoughtPath = (post: Thought) => `/thoughts/${post.id}/`;

// The day as written in the post, 2026-11-18. A YAML date is midnight UTC, so it is read in UTC: a local
// time zone behind UTC would show the day before.
export const thoughtDay = (date: Date) => date.toISOString().slice(0, 10);
