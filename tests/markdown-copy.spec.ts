import { test, expect } from '@playwright/test';
import { plainMarkdown, markdownCopy } from '../src/scripts/markdown-copy';
import { quoteLink } from '../src/scripts/text-fragment';

// The pieces behind the Post menu that need no page: what a post's Markdown copy keeps of its MDX, and the link
// Share Quote builds. post-menu.spec.ts covers both in the built site.

test('the Markdown copy leaves out MDX code and keeps the words inside components', () => {
  const mdx = [
    "import Aside from '../components/Aside.astro';",
    "export const mood = 'quiet';",
    '',
    'A post with **bold**, *emphasis*, a_word_with_underscores and an \\* escaped star.',
    '',
    '<Aside>',
    'An aside with a [link](/somewhere) inside.',
    '</Aside>',
    '',
    'An inline <Badge kind="new">badge</Badge> stays as its word.',
    '',
    '{/* A comment. */}',
    '',
    '<Video id="abc" />',
    '',
    '```js',
    "import { trail } from './trail';",
    '<Aside>not a component in a code block</Aside>',
    '```',
    '',
    '- a list item',
  ].join('\n');
  expect(plainMarkdown(mdx)).toBe(
    [
      'A post with **bold**, *emphasis*, a_word_with_underscores and an \\* escaped star.',
      '',
      'An aside with a [link](/somewhere) inside.',
      '',
      'An inline badge stays as its word.',
      '',
      '```js',
      "import { trail } from './trail';",
      '<Aside>not a component in a code block</Aside>',
      '```',
      '',
      '- a list item',
    ].join('\n'),
  );
});

test('the Markdown copy starts with the title as a heading and the day under it', () => {
  expect(markdownCopy({ title: 'A title', day: '2026-11-18', body: '\nThe text.\n' })).toBe('# A title\n\n2026-11-18\n\nThe text.\n');
  expect(markdownCopy({ title: 'Only code', day: '2026-11-18', body: "import X from './x';\n" })).toBe('# Only code\n\n2026-11-18\n');
});

test('Share Quote writes a short quote out whole, with "-" escaped and the address\'s own fragment dropped', () => {
  expect(quoteLink('https://notgui.com/thoughts/a/#top', '  a well-made,  short\tquote & more ')).toBe(
    'https://notgui.com/thoughts/a/#:~:text=a%20well%2Dmade%2C%20short%20quote%20%26%20more',
  );
  expect(quoteLink('https://notgui.com/thoughts/a/', '   ')).toBeNull();
});

test('Share Quote names a long quote, or one over two paragraphs, by its first and last five words', () => {
  const words = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ');
  expect(quoteLink('https://notgui.com/t/', words)).toBe(
    'https://notgui.com/t/#:~:text=word0%20word1%20word2%20word3%20word4,word75%20word76%20word77%20word78%20word79',
  );
  expect(quoteLink('https://notgui.com/t/', 'One short paragraph.\n\nAnd the next one here.')).toBe(
    'https://notgui.com/t/#:~:text=One%20short%20paragraph.,And%20the%20next%20one%20here.',
  );
});
