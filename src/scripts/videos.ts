import { getCollection, type CollectionEntry } from 'astro:content';
import { newestFirst } from './dated';

export type Video = CollectionEntry<'videos'>;

// Every video, newest first.
export async function videosNewestFirst(): Promise<Video[]> {
  return (await getCollection('videos')).sort(newestFirst);
}

// YouTube's own still for the video. hqdefault exists for every video; the bigger sizes don't always.
export const thumbnailFor = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
