import type { Theme } from './preferences';

// Every scene colour for one theme. The Field reads `field`; the Intro reads `intro`.
// Starting values are the prototype's from the spec. Tune them here and nowhere else.
export interface ScenePalette {
  field: {
    grassBase: string;
    grassTip: string;
    dry: string;
    flower: string;
    /** How many blades carry a flower, from 0 to 1. */
    flowers: number;
    skyTop: string;
    horizonColour: string;
  };
  intro: {
    /**
     * How the drawing sits on the Field's sky. Bloom Type paints an opaque background, so it is painted
     * black and screened onto a dark sky, or white and multiplied onto a light one: the background drops
     * out and only the name and flowers show over the real sky.
     */
    blend: 'screen' | 'multiply';
    name: string;
    blooms: string;
    stems: string;
    leaves: string;
  };
}

// The Grass export's own dry and flower colours, shared by both themes for now.
const exportedDry = '#c9b35a';
const exportedFlower = '#f6f2e6';

export const scenePalettes: Record<Theme, ScenePalette> = {
  night: {
    field: {
      grassBase: '#030b08',
      grassTip: '#3d6a55',
      dry: exportedDry,
      flower: exportedFlower,
      flowers: 0.25,
      skyTop: '#050a1c',
      // Darker than the prototype's #1b2a4a, so tertiary text and the coloured words in About still reach
      // 4.5:1 just above the horizon (tests/sky-contrast.spec.ts).
      horizonColour: '#111a2e',
    },
    intro: { blend: 'screen', name: '#f4f1e8', blooms: '#f2c879', stems: '#5f8f68', leaves: '#5f8f68' },
  },
  day: {
    field: {
      grassBase: '#0c260e',
      grassTip: '#8dbb4c',
      dry: exportedDry,
      flower: exportedFlower,
      flowers: 0.35,
      skyTop: '#c4dbf3',
      horizonColour: '#dfe9e8',
    },
    intro: { blend: 'multiply', name: '#14301a', blooms: '#e8663d', stems: '#2f6b35', leaves: '#3f7f3a' },
  },
};

// One CSS rule per theme, keyed on <html data-theme>, with Night as the default.
function perTheme(declarations: (palette: ScenePalette) => string) {
  return (Object.keys(scenePalettes) as Theme[])
    .map((theme) => {
      const selector = theme === 'night' ? ':root' : `:root[data-theme="${theme}"]`;
      return `${selector} { ${declarations(scenePalettes[theme])} }`;
    })
    .join('\n');
}

// The sky as CSS custom properties per theme, so the page can paint it before (or without) the scene.
export const skyCustomProperties = perTheme(({ field }) => `--sky-top: ${field.skyTop}; --sky-horizon: ${field.horizonColour};`);

// The Intro's text colour and blend per theme, so its hint, skip control and drawing are right from first paint.
export const introCustomProperties = perTheme(({ intro }) => `--intro-ink: ${intro.name}; --intro-blend: ${intro.blend};`);
