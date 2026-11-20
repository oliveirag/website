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
  return new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
