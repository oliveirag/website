// Each post's Markdown copy at /thoughts/<id>.md, built with the site: the title, the day and the post's text,
// with no MDX code (see scripts/markdown-copy.ts). The Post menu copies it, opens it and points at it.
import type { APIRoute } from 'astro';
import { thoughtsNewestFirst, type Thought } from '../../scripts/thoughts';
import { dayOf } from '../../scripts/dated';
import { markdownCopy } from '../../scripts/markdown-copy';

export async function getStaticPaths() {
  const posts = await thoughtsNewestFirst();
  return posts.map((post) => ({ params: { id: post.id }, props: { post } }));
}

export const GET: APIRoute = ({ props }) => {
  const { post } = props as { post: Thought };
  const text = markdownCopy({ title: post.data.title, day: dayOf(post.data.date), body: post.body ?? '' });
  // The file is served as it is built, and a static host may send it as text/markdown with no charset, which a
  // browser reads as Latin-1. A byte order mark first tells it the file is UTF-8, whatever the header says, and
  // fetch's text() drops it again, so Copy Page copies the Markdown alone.
  return new Response(`\uFEFF${text}`, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
