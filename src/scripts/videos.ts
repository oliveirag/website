import { getCollection, type CollectionEntry } from 'astro:content';

export type Video = CollectionEntry<'videos'>;

// Every video, newest first. Videos from the same day keep the order of their YouTube IDs.
export async function videosNewestFirst(): Promise<Video[]> {
  const videos = await getCollection('videos');
  return videos.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

// YouTube's own still for the video. hqdefault exists for every video; the bigger sizes don't always.
export const thumbnailFor = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
