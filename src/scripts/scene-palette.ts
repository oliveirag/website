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
    background: string;
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
      horizonColour: '#1b2a4a',
    },
    intro: { background: '#0b1220', name: '#f4f1e8', blooms: '#f2c879', stems: '#5f8f68', leaves: '#5f8f68' },
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
    intro: { background: '#dfe9e8', name: '#14301a', blooms: '#e8663d', stems: '#2f6b35', leaves: '#3f7f3a' },
  },
};

// The sky as CSS custom properties per theme, so the page can paint it before (or without) the scene.
export const skyCustomProperties = (Object.keys(scenePalettes) as Theme[])
  .map((theme) => {
    const { skyTop, horizonColour } = scenePalettes[theme].field;
    const selector = theme === 'night' ? ':root' : `:root[data-theme="${theme}"]`;
    return `${selector} { --sky-top: ${skyTop}; --sky-horizon: ${horizonColour}; }`;
  })
  .join('\n');

// The Intro's colours as CSS custom properties per theme, so its backdrop and hint are right from first paint,
// before Bloom Type draws.
export const introCustomProperties = (Object.keys(scenePalettes) as Theme[])
  .map((theme) => {
    const { background, name } = scenePalettes[theme].intro;
    const selector = theme === 'night' ? ':root' : `:root[data-theme="${theme}"]`;
    return `${selector} { --intro-background: ${background}; --intro-ink: ${name}; }`;
  })
  .join('\n');
