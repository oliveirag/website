// The Markdown copy of a Thoughts post, served at /thoughts/<id>.md: its title, its day and its text, as plain
// Markdown anyone (or any LLM) can read without the site around it.
//
// A post is MDX, so its text can hold imports, exports, {expressions} and components. The copy leaves out the
// code and keeps the words: imports, exports and expressions go, and a component gives way to the text inside it.
// The rest of the post is copied character for character, so its Markdown reads exactly as it was written. The
// MDX parser finds what to leave out, which keeps code blocks whole even when they hold an `import` line.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';

type Node = {
  type: string;
  children?: Node[];
  position?: { start: { offset?: number }; end: { offset?: number } };
};

const CODE = new Set(['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression']);
const COMPONENT = new Set(['mdxJsxFlowElement', 'mdxJsxTextElement']);

const start = (node: Node) => node.position!.start.offset!;
const end = (node: Node) => node.position!.end.offset!;

// The stretches of the source to leave out, as [from, to) offsets.
function codeIn(node: Node, cuts: [number, number][]) {
  for (const child of node.children ?? []) {
    if (CODE.has(child.type)) {
      cuts.push([start(child), end(child)]);
    } else if (COMPONENT.has(child.type)) {
      const inside = child.children ?? [];
      if (inside.length === 0) {
        cuts.push([start(child), end(child)]);
      } else {
        // The opening and closing tags go; what sits between them stays.
        cuts.push([start(child), start(inside[0])], [end(inside[inside.length - 1]), end(child)]);
        codeIn(child, cuts);
      }
    } else {
      codeIn(child, cuts);
    }
  }
}

/** The post's MDX body as plain Markdown, with no imports, exports, expressions or component tags. */
export function plainMarkdown(mdx: string): string {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(mdx) as Node;
  const cuts: [number, number][] = [];
  codeIn(tree, cuts);
  let text = mdx;
  for (const [from, to] of cuts.sort((a, b) => b[0] - a[0])) text = text.slice(0, from) + text.slice(to);
  return (
    text
      // What was left out can leave lines with only spaces, and runs of blank lines.
      .replace(/^[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/** The whole Markdown copy: the title as a heading, the day under it, then the post. */
export function markdownCopy({ title, day, body }: { title: string; day: string; body: string }): string {
  const text = plainMarkdown(body);
  return `# ${title}\n\n${day}\n${text ? `\n${text}\n` : ''}`;
}
