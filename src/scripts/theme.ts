import { read, subscribe, themeColors, type Theme } from './preferences';

// Shows a theme: the data-theme attribute on <html> drives tokens.css and Tailwind's dark: classes.
export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme]);
}

// Keeps the page in step with the theme preference. The head script has already applied the stored one.
export function followTheme() {
  applyTheme(read('theme'));
  return subscribe('theme', applyTheme);
}
