import { test, expect, PROJECT_TITLES, projectCard, stubApis, reply } from './fixtures';

test('Home shows my name, About, the project cards and Commits', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'guilherme oliveira' })).toBeVisible();
  await expect(page.getByText('about me')).toBeVisible();
  await expect(page.getByText('contact me')).toBeVisible();
  await expect(page.getByText('tech stack')).toBeVisible();
  for (const project of PROJECT_TITLES) {
    await expect(projectCard(page, project)).toBeVisible();
  }
  await expect(page.getByText('412 commits in 2026')).toBeVisible();
});

test('About keeps the bio, contact, tech stack, photo, resume and Now Playing', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('computer science @ ucf')).toBeVisible();
  await expect(page.getByText('currently building something cool')).toBeVisible();
  await expect(page.getByText('goliveiracoll@gmail.com')).toBeVisible();
  const social = {
    github: 'https://github.com/oliveirag',
    linkedin: 'https://www.linkedin.com/in/notgui/',
    twitter: 'https://x.com/guiwastaken',
    instagram: 'https://www.instagram.com/notgui/',
  };
  for (const [name, href] of Object.entries(social)) {
    await expect(page.locator('#contact').getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
  await expect(page.locator('#tech-stack')).toHaveText(/^\s*tech stack\s*python, javascript\/typescript, and swift\s*$/);
  await expect(page.getByRole('img', { name: 'Guilherme Oliveira' })).toBeVisible();
  const resume = page.getByRole('link', { name: 'Download resume' });
  await expect(resume).toHaveAttribute('href', '/resume.pdf');
  await expect(resume).toHaveAttribute('download', /\.pdf$/);
  await expect(page.getByRole('region', { name: 'Now Playing' })).toContainText('Pink + White');
});

test('"about this site" says what the site is built with, ends with the Classic site link and no longer links to the source code', async ({ page }) => {
  await page.goto('/');

  const aboutSite = page.locator('#about-site');
  await expect(aboutSite).toContainText('about this site');
  const words = await aboutSite.evaluate((node) => (node as HTMLElement).innerText.replace(/\s+/g, ' ').trim());
  expect(words).toBe('about this site built with astro, react, and tailwind click here for old site');

  const classic = aboutSite.getByRole('link');
  await expect(classic).toHaveCount(1);
  await expect(classic).toHaveAccessibleName('click here for old site');
  await expect(classic).toHaveAttribute('href', 'https://classic.notgui.com');
  await expect(aboutSite.locator(':scope > :last-child')).toHaveText('click here for old site');

  await expect(page.locator('a[href*="github.com/oliveirag/Website" i]')).toHaveCount(0);
  await expect(page.getByText(/source code/)).toHaveCount(0);
});

// Each card goes to the project's site, or to its source when there is no site. A project with both also has its
// own GitHub link beside the card.
const projects = [
  {
    title: 'zaklang',
    card: 'https://github.com/sducf/zaklang',
    logo: '/images/projects/zaklang.png',
    description: 'Token-efficient programming language and benchmark for LLM code generation',
  },
  {
    title: 'teraphobia',
    card: 'https://teraphobia.com/',
    source: 'https://github.com/ucfdevs/teraphobia',
    logo: '/images/projects/teraphobia.png',
    description: 'Horror social deduction party game similar to Jackbox',
  },
  {
    title: 'ollie',
    card: 'https://github.com/oliveirag/ollie',
    logo: '/images/projects/ollie.svg',
    description: 'Robinhood AI trading iOS app with human approval before every order',
  },
  {
    title: 'aperture',
    card: 'https://lookthrough-rosy.vercel.app/',
    source: 'https://github.com/oliveirag/aperture',
    logo: '/images/projects/aperture.svg',
    description: 'AI investment research platform to help understand your stock portfolio',
  },
  {
    title: 'onetap',
    card: 'https://github.com/oliveirag/onetap',
    logo: '/images/projects/onetap.svg',
    description: 'Mobile app that routes purchases to your best credit card',
  },
  {
    title: 'guibot',
    card: 'https://github.com/oliveirag/guiBot',
    logo: '/images/projects/guibot.png',
    description: 'Discord bot for moderation and project management',
  },
];

test('Projects shows my six projects in order with lowercase titles and their descriptions, each card linking to its site or its source', async ({ page }) => {
  await page.goto('/');

  const titles = await page.locator('#projects .project').evaluateAll((cards) =>
    cards.map((card) => card.querySelector('.font-bold')?.textContent?.trim()),
  );
  expect(titles).toEqual(PROJECT_TITLES);
  expect(projects.map(({ title }) => title)).toEqual(PROJECT_TITLES);

  for (const { title, card, source, logo, description } of projects) {
    const link = projectCard(page, title);
    await expect(link, title).toHaveAttribute('href', card);
    await expect(link.locator('p'), title).toHaveText(description);
    await expect(link.locator('img'), title).toHaveAttribute('src', logo);
    const sourceLink = page.getByRole('link', { name: `${title} source on github` });
    if (source) {
      await expect(sourceLink).toHaveAttribute('href', source);
      await expect(sourceLink).toHaveAttribute('target', '_blank');
      await sourceLink.click({ trial: true });
    } else {
      await expect(sourceLink, title).toHaveCount(0);
    }
  }
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`every project description shows in full, with nothing cut off (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    for (const { title } of projects) {
      const card = projectCard(page, title);
      const description = card.locator('p');
      const [text, cardBox] = await Promise.all([description.boundingBox(), card.boundingBox()]);
      expect(await description.evaluate((p) => p.scrollHeight <= p.clientHeight + 1), title).toBe(true);
      expect(text!.y + text!.height, title).toBeLessThanOrEqual(cardBox!.y + cardBox!.height);
    }
  });
}

test('"Download resume" is a text link styled like the Classic site link, and serves my resume', async ({ page }) => {
  await page.goto('/');

  const resume = page.getByRole('link', { name: 'Download resume' });
  const classic = page.getByRole('link', { name: 'click here for old site' });
  for (const property of ['color', 'text-decoration-line', 'background-color', 'font-size', 'font-weight']) {
    const expected = await classic.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property);
    await expect(resume, property).toHaveCSS(property, expected);
  }

  const response = await page.request.get('/resume.pdf');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`About and the Projects cards have clear space between them (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const bottom = async (selector: string) => {
      const box = (await page.locator(selector).boundingBox())!;
      return box.y + box.height;
    };
    const aboutBottom = Math.max(await bottom('#about-site'), await bottom('a[href="/resume.pdf"]'));
    const projectsTop = (await page.locator('#projects').boundingBox())!.y;
    expect(projectsTop - aboutBottom).toBeGreaterThanOrEqual(32);
  });
}

// The photo, the newer project logos and the newer poster, each no bigger than about twice to three times the most it is ever shown
// at, and each with alt text: empty where the image only repeats the name written beside it.
const webSizedImages = [
  { page: '/', src: '/images/guilherme.jpg', alt: 'Guilherme Oliveira', maxWidth: 600 },
  { page: '/', src: '/images/projects/zaklang.png', alt: '', maxWidth: 168 },
  { page: '/', src: '/images/projects/teraphobia.png', alt: '', maxWidth: 168 },
  { page: '/', src: '/images/projects/guibot.png', alt: '', maxWidth: 168 },
  { page: '/top-5', src: '/images/acblackflagresynced.jpg', alt: 'AC Black Flag Resynced', maxWidth: 300 },
  { page: '/chatbot', src: '/images/projects/guibot.png', alt: '', maxWidth: 168 },
];

test('the photo, the newer logos and the newer poster are sized for the web and have alt text', async ({ page }) => {
  for (const { page: path, src, alt, maxWidth } of webSizedImages) {
    await page.goto(path);
    const image = page.locator(`img[src="${src}"]`).first();
    await expect(image, src).toHaveAttribute('alt', alt);
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth), { message: src }).toBeGreaterThan(0);
    const width = await image.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(width, src).toBeLessThanOrEqual(maxWidth);
    expect(width, src).toBeGreaterThanOrEqual((await image.boundingBox())!.width * 2);
    const bytes = (await (await page.request.get(src)).body()).length;
    expect(bytes, src).toBeLessThan(150_000);
  }
});

// Home's sentences end without a full stop, in every state Commits can be in. An ellipsis is not a full stop.
const commitsStates = {
  loaded: undefined,
  empty: reply.json({ year: 2026, totalCommits: 0, repositories: [] }),
  failed: reply.serverError(),
};
for (const [state, commitsReply] of Object.entries(commitsStates)) {
  test(`no sentence on Home ends in a full stop (Commits ${state})`, async ({ page }) => {
    if (commitsReply) await stubApis(page, { commits: commitsReply });
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Commits' })).not.toContainText('Loading');

    const lines = await page.locator('body').evaluate((body) =>
      (body as HTMLElement).innerText.split('\n').map((line) => line.trim()).filter(Boolean),
    );
    // Guards against reading Home before it rendered.
    expect(lines.length).toBeGreaterThan(20);
    expect(lines.filter((line) => /(?<!\.)\.$/.test(line))).toEqual([]);
  });
}

// Links that stand alone on a line, rather than sitting in a sentence, are controls and get a 44px target.
for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`the Classic site link and the resume link on Home are at least 44px tall (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    for (const name of ['click here for old site', 'Download resume']) {
      const box = (await page.getByRole('link', { name }).boundingBox())!;
      expect(box.height, name).toBeGreaterThanOrEqual(44);
    }
  });
}
