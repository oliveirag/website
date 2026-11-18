// Thoughts and Videos are both dated lists, shown newest first with their day.
import type { CollectionEntry } from 'astro:content';

type Dated = CollectionEntry<'thoughts' | 'videos'>;

// Newest first. Entries from the same day keep a stable order by their id.
export const newestFirst = (a: Dated, b: Dated) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id);

// The day as written in the post or list, 2026-11-18. A written day is midnight UTC, so it is read in UTC: a
// local time zone behind UTC would show the day before.
export const dayOf = (date: Date) => date.toISOString().slice(0, 10);
