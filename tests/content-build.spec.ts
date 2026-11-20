import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test, expect, type TestInfo } from '@playwright/test';

// A broken Thoughts post or a broken Videos entry must fail the build, so it never ships. Each case builds the
// site from just that post or list, into a folder of its own. The builds share Astro's content cache, so they
// run one at a time, all in this one file.
test.describe.configure({ mode: 'serial' });

function build(testInfo: TestInfo, env: Record<string, string>) {
  const result = spawnSync('npx', ['astro', 'build', '--outDir', testInfo.outputPath('dist')], {
    // Plain output, so the message can be matched: Playwright turns colour on for its workers.
    env: { ...process.env, ...env, FORCE_COLOR: '0', NO_COLOR: '1' },
    encoding: 'utf8',
    timeout: 120_000,
  });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

const brokenPosts = {
  'no title': { frontmatter: 'date: 2026-11-18', field: 'title' },
  'an empty title': { frontmatter: 'title: ""\ndate: 2026-11-18', field: 'title' },
  'no date': { frontmatter: 'title: A post', field: 'date' },
  'an empty date': { frontmatter: 'title: A post\ndate:', field: 'date' },
};

for (const [name, { frontmatter, field }] of Object.entries(brokenPosts)) {
  test(`a post with ${name} fails the build`, async ({}, testInfo) => {
    const posts = testInfo.outputPath('posts');
    mkdirSync(posts, { recursive: true });
    writeFileSync(`${posts}/broken.mdx`, `---\n${frontmatter}\n---\n\nThe post itself.\n`);

    const { status, output } = build(testInfo, { THOUGHTS_DIR: posts });
    expect(status, output).not.toBe(0);
    expect(output).toContain('broken data does not match collection schema');
    expect(output).toMatch(new RegExp(`^${field}: `, 'm'));
  });
}

// The fixture build has three posts, so this is where a post with no neighbours is built: its page ends with the
// post itself, with no divider and no Previous or Next.
test('the only post has no divider, Previous or Next', async ({}, testInfo) => {
  const posts = testInfo.outputPath('posts');
  mkdirSync(posts, { recursive: true });
  writeFileSync(`${posts}/only.mdx`, '---\ntitle: The only post\ndate: 2026-11-18\n---\n\nThe post itself.\n');

  const { status, output } = build(testInfo, { THOUGHTS_DIR: posts });
  expect(status, output).toBe(0);
  const html = readFileSync(testInfo.outputPath('dist/thoughts/only/index.html'), 'utf8');
  expect(html).toContain('The post itself.');
  expect(html).not.toContain('more thoughts');
  expect(html).not.toMatch(/>\s*(Previous|Next)\s*</);
});

const good = { youtubeId: 'aBcDeFgHi_1', title: 'A video', date: '2026-11-18' };

// Each case is the whole list file and what the build output must say about it.
const brokenLists: Record<string, { list: string; says: RegExp }> = {
  'an entry with no YouTube ID': { list: JSON.stringify([{ title: 'A video', date: '2026-11-18' }]), says: /^youtubeId: Required/m },
  'a whole link where the YouTube ID goes': {
    list: JSON.stringify([{ ...good, youtubeId: 'https://www.youtube.com/watch?v=aBcDeFgHi_1' }]),
    says: /a YouTube ID is the 11 characters after "v="/,
  },
  'an entry with no title': { list: JSON.stringify([{ youtubeId: good.youtubeId, date: good.date }]), says: /^title: Required/m },
  'an entry with an empty title': { list: JSON.stringify([{ ...good, title: ' ' }]), says: /^title: /m },
  'an entry with no date': { list: JSON.stringify([{ youtubeId: good.youtubeId, title: good.title }]), says: /^date: Required/m },
  'an entry with a date that is not a day': { list: JSON.stringify([{ ...good, date: 'next week' }]), says: /^date: /m },
  'the same video twice': { list: JSON.stringify([good, { ...good, title: 'Again' }]), says: /aBcDeFgHi_1 is in the list twice/ },
  'a typo in the file': { list: `[${JSON.stringify(good)},]`, says: /videos list .* is not valid JSON/ },
  'a list that is not a list': { list: JSON.stringify(good), says: /videos list .* must be a list/ },
};

for (const [name, { list, says }] of Object.entries(brokenLists)) {
  test(`a Videos list with ${name} fails the build`, async ({}, testInfo) => {
    const file = testInfo.outputPath('videos.json');
    mkdirSync(testInfo.outputPath(), { recursive: true });
    writeFileSync(file, list);

    const { status, output } = build(testInfo, { VIDEOS_FILE: file });
    expect(status, output).not.toBe(0);
    expect(output).toMatch(says);
  });
}

test('a Videos list with good entries builds', async ({}, testInfo) => {
  const file = testInfo.outputPath('videos.json');
  mkdirSync(testInfo.outputPath(), { recursive: true });
  writeFileSync(file, JSON.stringify([good]));

  const { status, output } = build(testInfo, { VIDEOS_FILE: file });
  expect(status, output).toBe(0);
});
