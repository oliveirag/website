import { getCollection, type CollectionEntry } from 'astro:content';
import { newestFirst } from './dated';

export type Thought = CollectionEntry<'thoughts'>;

// Every post, newest first.
export async function thoughtsNewestFirst(): Promise<Thought[]> {
  return (await getCollection('thoughts')).sort(newestFirst);
}

export const thoughtPath = (post: Thought) => `/thoughts/${post.id}/`;

// The post's Markdown copy, beside its page: /thoughts/first-light.md for /thoughts/first-light/.
export const markdownPath = (post: Thought) => `/thoughts/${post.id}.md`;
