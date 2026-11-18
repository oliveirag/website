import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// A Thoughts post with no title or no date must fail the build, so a broken post never ships. Each case builds
// the site from a folder holding just that post, into a folder of its own. The builds share Astro's content
// cache, so they run one at a time.
test.describe.configure({ mode: 'serial' });

const broken = {
  'no title': { frontmatter: 'date: 2026-11-18', field: 'title' },
  'an empty title': { frontmatter: 'title: ""\ndate: 2026-11-18', field: 'title' },
  'no date': { frontmatter: 'title: A post', field: 'date' },
  'an empty date': { frontmatter: 'title: A post\ndate:', field: 'date' },
};

for (const [name, { frontmatter, field }] of Object.entries(broken)) {
  test(`a post with ${name} fails the build`, async ({}, testInfo) => {
    const posts = testInfo.outputPath('posts');
    mkdirSync(posts, { recursive: true });
    writeFileSync(`${posts}/broken.mdx`, `---\n${frontmatter}\n---\n\nThe post itself.\n`);

    const build = spawnSync('npx', ['astro', 'build', '--outDir', testInfo.outputPath('dist')], {
      // Plain output, so the message can be matched: Playwright turns colour on for its workers.
      env: { ...process.env, THOUGHTS_DIR: posts, FORCE_COLOR: '0', NO_COLOR: '1' },
      encoding: 'utf8',
      timeout: 120_000,
    });
    const output = `${build.stdout}\n${build.stderr}`;
    expect(build.status, output).not.toBe(0);
    expect(output).toContain('broken data does not match collection schema');
    expect(output).toMatch(new RegExp(`^${field}: `, 'm'));
  });
}
