// The visitor's preferences. This is the only module that touches browser storage.
// Theme and muted last across visits; intro seen lasts for the browser session.

const themes = ['night', 'day'] as const;
export type Theme = (typeof themes)[number];

export interface Preferences {
  theme: Theme;
  muted: boolean;
  introSeen: boolean;
}

type PreferenceName = keyof Preferences;
type Listener<N extends PreferenceName> = (value: Preferences[N]) => void;

interface Definition<N extends PreferenceName> {
  key: string;
  storage: 'local' | 'session';
  fallback: Preferences[N];
  isValid: (value: unknown) => value is Preferences[N];
}

const isTheme = (value: unknown): value is Theme => themes.includes(value as Theme);
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const definitions: { [N in PreferenceName]: Definition<N> } = {
  theme: { key: 'notgui:theme', storage: 'local', fallback: 'night', isValid: isTheme },
  muted: { key: 'notgui:muted', storage: 'local', fallback: false, isValid: isBoolean },
  introSeen: { key: 'notgui:intro-seen', storage: 'session', fallback: false, isValid: isBoolean },
};

// The browser's toolbar colour for each theme: the page surface from tokens.css.
// It has to be a literal because the head script sets it before the stylesheet loads.
export const themeColors: Record<Theme, string> = { night: '#171717', day: '#FFFFFF' };

// Values read or written in this page. Storage can be blocked or full, so this keeps the page consistent anyway.
const cached: Partial<Preferences> = {};
const listeners: { [N in PreferenceName]: Set<Listener<N>> } = { theme: new Set(), muted: new Set(), introSeen: new Set() };

function storageFor(name: PreferenceName): Storage {
  return definitions[name].storage === 'local' ? window.localStorage : window.sessionStorage;
}

export function read<N extends PreferenceName>(name: N): Preferences[N] {
  if (name in cached) return cached[name] as Preferences[N];
  const definition = definitions[name];
  let value = definition.fallback;
  try {
    const stored = storageFor(name).getItem(definition.key);
    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);
      if (definition.isValid(parsed)) value = parsed;
    }
  } catch {
    // Storage is unavailable or holds something unreadable: use the default.
  }
  cached[name] = value;
  return value;
}

export function write<N extends PreferenceName>(name: N, value: Preferences[N]) {
  if (read(name) === value) return;
  cached[name] = value;
  try {
    storageFor(name).setItem(definitions[name].key, JSON.stringify(value));
  } catch {
    // Not saved, but this page still uses the new value.
  }
  for (const listener of listeners[name]) listener(value);
}

// Calls back on every later change in this page. Returns a function that stops it.
export function subscribe<N extends PreferenceName>(name: N, listener: Listener<N>): () => void {
  listeners[name].add(listener);
  return () => listeners[name].delete(listener);
}

// Inline script for <head>: sets the stored theme on <html> and the toolbar colour before first paint.
// It lives here, built from the definitions above, so the storage key and format stay in this one module.
export const themeBeforePaintScript = `(function () {
  var themes = ${JSON.stringify(themes)};
  var theme = ${JSON.stringify(definitions.theme.fallback)};
  try {
    var stored = JSON.parse(localStorage.getItem(${JSON.stringify(definitions.theme.key)}));
    if (themes.indexOf(stored) !== -1) theme = stored;
  } catch (error) {}
  document.documentElement.setAttribute('data-theme', theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', ${JSON.stringify(themeColors)}[theme]);
})();`;

// Inline script for <head>: marks a muted visitor's sound as muted before first paint, so the sound control
// shows off from the start. The states are the sound engine's (see sound.ts); the page ships with "locked".
export const mutedBeforePaintScript = `(function () {
  try {
    if (JSON.parse(localStorage.getItem(${JSON.stringify(definitions.muted.key)})) === true) {
      document.documentElement.setAttribute('data-sound', 'muted');
    }
  } catch (error) {}
})();`;

// Inline script for <head>: on a full load of Home, for a visitor who hasn't seen the Intro this session, marks
// <html> with data-intro="showing" before first paint, so the Intro covers the page from the start and Home
// never flashes. A link to a spot on Home (/#contact) gets that spot, not the Intro.
export const introBeforePaintScript = `(function () {
  if (location.pathname !== '/' || location.hash) return;
  try {
    if (JSON.parse(sessionStorage.getItem(${JSON.stringify(definitions.introSeen.key)})) === true) return;
  } catch (error) {}
  document.documentElement.setAttribute('data-intro', 'showing');
})();`;
