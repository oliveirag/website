import { test, expect, type Page } from './fixtures';

// The coloured words in About as they were before Day was darkened: [Day, Night], from Tailwind's palette.
const BEFORE: Record<string, [day: string, night: string]> = {
  ucf: ['#ca8a04', '#facc15'],
  github: ['#4b5563', '#9ca3af'],
  linkedin: ['#2563eb', '#3b82f6'],
  twitter: ['#0284c7', '#93c5fd'],
  instagram: ['#ea580c', '#f97316'],
  python: ['#2563eb', '#60a5fa'],
  javascript: ['#ca8a04', '#fde047'],
  typescript: ['#3b82f6', '#93c5fd'],
  swift: ['#ea580c', '#fb923c'],
  java: ['#dc2626', '#ef4444'],
  'c/c++': ['#f97316', '#fdba74'],
  astro: ['#dc2626', '#f87171'],
  react: ['#0284c7', '#dbeafe'],
  tailwind: ['#0891b2', '#93c5fd'],
};

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
};

function luminance(color: string) {
  const [r, g, b] = color.match(/\d+/g)!.slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const word = (page: Page, text: string) => page.locator('#about, #contact, #tech-stack, #about-site').getByText(text, { exact: true });

async function useTheme(page: Page, theme: 'night' | 'day') {
  if (theme === 'day') await page.getByRole('button', { name: /^theme:/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

test('in Night the coloured words in About keep the colours they had', async ({ page }) => {
  await page.goto('/');
  await useTheme(page, 'night');
  for (const [text, [, night]] of Object.entries(BEFORE)) {
    await expect(word(page, text), text).toHaveCSS('color', rgb(night));
  }
});

test('in Day every coloured word in About is darker than it was, and still coloured', async ({ page }) => {
  await page.goto('/');
  await useTheme(page, 'day');
  for (const [text, [day]] of Object.entries(BEFORE)) {
    const now = await word(page, text).evaluate((node) => getComputedStyle(node).color);
    expect(luminance(now), `${text} is ${now}`).toBeLessThan(luminance(rgb(day)));
    const [r, g, b] = now.match(/\d+/g)!.map(Number);
    expect(Math.max(r, g, b) - Math.min(r, g, b), `${text} is still coloured`).toBeGreaterThan(20);
  }
});
