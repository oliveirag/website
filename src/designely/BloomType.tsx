'use client';
// Original Designely Studio procedural botanical component.
import { useEffect, useRef, type CSSProperties } from 'react';
/** Bloom Type's typefaces: every one is under the SIL Open Font License 1.1 and is a single static latin subset, loaded only when chosen. */
export type BloomFont = {
  name: string;
  /** Path of the woff2 under the site's `/fonts/`. */
  file: string;
  /** The copyright line the font's licence file starts with. */
  copyright: string;
  /** Slight vertical correction, in ems, for faces whose baseline sits high or low. */
  lift?: number;
};
const proj = (name: string, url: string, year: number) => `Copyright ${year} The ${name} Project Authors (${url})`;
export const FONTS: BloomFont[] = [{
  name: 'Instrument Serif',
  file: 'instrument-serif-latin.woff2',
  copyright: proj('Instrument Serif', 'https://github.com/Instrument/instrument-serif', 2017)
}, {
  name: 'Instrument Serif Italic',
  file: 'instrument-serif-latin-italic.woff2',
  copyright: proj('Instrument Serif', 'https://github.com/Instrument/instrument-serif', 2017)
}, {
  name: 'Playfair Display',
  file: 'bloom/playfair-display.woff2',
  copyright: proj('Playfair Display', 'https://github.com/clauseggers/Playfair-Display', 2017)
}, {
  name: 'Playfair Display Italic',
  file: 'bloom/playfair-display-italic.woff2',
  copyright: proj('Playfair Display', 'https://github.com/clauseggers/Playfair-Display', 2017)
}, {
  name: 'Cormorant Garamond',
  file: 'bloom/cormorant-garamond.woff2',
  copyright: proj('Cormorant', 'github.com/CatharsisFonts/Cormorant', 2015)
}, {
  name: 'DM Serif Display',
  file: 'bloom/dm-serif-display.woff2',
  copyright: 'Copyright 2014 - 2017 Adobe Systems Incorporated (http://www.adobe.com/). Copyright 2019 Google LLC.'
}, {
  name: 'Fraunces',
  file: 'bloom/fraunces.woff2',
  copyright: proj('Fraunces', 'github.com/undercasetype/Fraunces', 2020)
}, {
  name: 'Bodoni Moda',
  file: 'bloom/bodoni-moda.woff2',
  copyright: proj('Bodoni Moda', 'https://github.com/indestructible-type/Bodoni', 2020)
}, {
  name: 'Abril Fatface',
  file: 'bloom/abril-fatface.woff2',
  copyright: 'Copyright (c) 2011, TypeTogether (www.type-together.com info@type-together.com)'
}, {
  name: 'Young Serif',
  file: 'bloom/young-serif.woff2',
  copyright: proj('Young Serif', 'https://github.com/noirblancrouge/YoungSerif', 2023)
}, {
  name: 'Gloock',
  file: 'bloom/gloock.woff2',
  copyright: proj('Gloock', 'https://github.com/duartp/gloock', 2022)
}, {
  name: 'Italiana',
  file: 'bloom/italiana.woff2',
  copyright: 'Copyright (c) 2011 by Santiago Orozco (hi@typemade.mx)'
}, {
  name: 'Pinyon Script',
  file: 'bloom/pinyon-script.woff2',
  copyright: proj('PinyonScript', 'https://github.com/SorkinType/Pinyon', 2022)
}, {
  name: 'Great Vibes',
  file: 'bloom/great-vibes.woff2',
  copyright: proj('Great Vibes Pro', 'https://github.com/googlefonts/great-vibes', 2010)
}, {
  name: 'Dancing Script',
  file: 'bloom/dancing-script.woff2',
  copyright: proj('Dancing Script', 'https://github.com/googlefonts/DancingScript', 2016)
}, {
  name: 'Caveat',
  file: 'bloom/caveat.woff2',
  copyright: proj('Caveat', 'https://github.com/googlefonts/caveat', 2014)
}, {
  name: 'Syne',
  file: 'bloom/syne.woff2',
  copyright: proj('Syne', 'https://gitlab.com/bonjour-monde/fonderie/syne-typeface', 2019)
}, {
  name: 'Bricolage Grotesque',
  file: 'bloom/bricolage-grotesque.woff2',
  copyright: proj('Bricolage Grotesque', 'https://github.com/ateliertriay/bricolage', 2022)
}, {
  name: 'Unbounded',
  file: 'bloom/unbounded.woff2',
  copyright: proj('Unbounded', 'https://github.com/googlefonts/unbounded', 2022)
}];
export const FONT_NAMES = FONTS.map(f => f.name);
export const fontOf = (name: string) => FONTS.find(f => f.name === name) ?? FONTS[0]!;
/** The canvas/CSS family a font is registered under (one family per file, so a choice never changes another). */
export const familyOf = (font: BloomFont) => 'Bloom ' + font.name.replace(/ /g, '');

/** Bloom Type's looks: flower species, flower mixes, vine styles, presets and colour helpers. Pure data, no DOM. */
export type Shape = 'round' | 'ruffle' | 'strap' | 'crinkle' | 'point' | 'notch';
export type Centre = 'spiral' | 'dome' | 'disk' | 'stamens' | 'pod' | 'lily' | 'none';
export type SpeciesName = 'rose' | 'peony' | 'daisy' | 'poppy' | 'tulip' | 'lily' | 'cosmos' | 'blossom' | 'sunflower' | 'berry';
/** A ring of petals: count, length (of the flower's radius), width, cup (0 flat, 1 upright), tone (0 dark, 1 light). */
export type Ring = [n: number, len: number, wid: number, cup: number, tone: number];
export type SpeciesSpec = {
  rings: Ring[];
  shape: Shape;
  centre: Centre;
  /** Sepals under the flower. */
  calyx: number;
  /** Seen from the side: petals fan upward (tulip). */
  side?: boolean;
  /** Radius multiplier of the centre. */
  core?: number;
};
export const SPECIES: Record<SpeciesName, SpeciesSpec> = {
  rose: {
    rings: [[5, 1, .62, .3, .86], [5, .8, .56, .5, .72], [4, .6, .5, .7, .58], [3, .38, .44, .9, .44]],
    shape: 'round',
    centre: 'spiral',
    calyx: 5
  },
  peony: {
    rings: [[6, 1, .66, .15, .9], [9, .9, .58, .3, .82], [10, .76, .52, .5, .72], [9, .62, .47, .65, .62], [8, .47, .41, .8, .54], [6, .31, .35, .9, .46]],
    shape: 'ruffle',
    centre: 'none',
    calyx: 5
  },
  daisy: {
    rings: [[17, 1, .15, .1, .95], [15, .88, .14, .2, .85]],
    shape: 'strap',
    centre: 'dome',
    calyx: 0,
    core: .3
  },
  poppy: {
    rings: [[4, 1, .98, .45, .85], [4, .84, .9, .6, .72]],
    shape: 'crinkle',
    centre: 'pod',
    calyx: 2,
    core: .24
  },
  tulip: {
    rings: [[3, 1, .5, .9, .8], [3, .94, .48, .95, .7]],
    shape: 'point',
    centre: 'none',
    calyx: 0,
    side: true
  },
  lily: {
    rings: [[3, 1, .3, .35, .9], [3, .94, .3, .45, .8]],
    shape: 'point',
    centre: 'lily',
    calyx: 0
  },
  cosmos: {
    rings: [[8, 1, .44, .15, .9]],
    shape: 'notch',
    centre: 'dome',
    calyx: 0,
    core: .22
  },
  blossom: {
    rings: [[5, 1, .56, .25, .9]],
    shape: 'notch',
    centre: 'stamens',
    calyx: 5,
    core: .5
  },
  sunflower: {
    rings: [[22, 1, .17, .15, .88], [22, .86, .16, .3, .74]],
    shape: 'point',
    centre: 'disk',
    calyx: 0,
    core: .47
  },
  berry: {
    rings: [],
    shape: 'round',
    centre: 'none',
    calyx: 5
  }
};
export type Tint = 'main' | 'pale' | 'warm' | 'cool';
export type MixEntry = {
  sp: SpeciesName;
  tint: Tint;
};
export type Mix = {
  focal: MixEntry[];
  support: MixEntry[];
  filler: MixEntry[];
  /** Species a closed bud may be. */
  buds: MixEntry[];
};
const e = (sp: SpeciesName, tint: Tint = 'main'): MixEntry => ({
  sp,
  tint
});
export const MIXES: Record<string, Mix> = {
  Roses: {
    focal: [e('rose')],
    support: [e('rose'), e('rose', 'pale')],
    filler: [e('rose'), e('berry', 'warm')],
    buds: [e('rose')]
  },
  'Roses & peonies': {
    focal: [e('peony', 'pale'), e('rose')],
    support: [e('rose'), e('peony')],
    filler: [e('rose', 'pale'), e('berry', 'warm')],
    buds: [e('rose'), e('peony')]
  },
  Wildflowers: {
    focal: [e('cosmos'), e('cosmos', 'warm'), e('daisy', 'pale')],
    support: [e('daisy', 'pale'), e('cosmos', 'warm'), e('cosmos', 'pale')],
    filler: [e('blossom', 'pale'), e('daisy', 'pale'), e('berry', 'warm')],
    buds: [e('cosmos'), e('daisy', 'pale')]
  },
  'Poppies & lilies': {
    focal: [e('poppy'), e('lily', 'pale')],
    support: [e('poppy'), e('lily', 'pale')],
    filler: [e('poppy'), e('berry', 'warm')],
    buds: [e('poppy'), e('lily', 'pale')]
  },
  'Cherry blossom': {
    focal: [e('blossom')],
    support: [e('blossom'), e('blossom', 'pale')],
    filler: [e('blossom', 'pale')],
    buds: [e('blossom')]
  },
  Sunflowers: {
    focal: [e('sunflower', 'warm')],
    support: [e('sunflower', 'warm'), e('daisy', 'pale')],
    filler: [e('cosmos'), e('daisy', 'pale')],
    buds: [e('sunflower', 'warm')]
  },
  'Tulips & lilies': {
    focal: [e('tulip'), e('tulip', 'pale'), e('lily', 'pale')],
    support: [e('tulip', 'pale'), e('tulip'), e('lily'), e('daisy', 'pale')],
    filler: [e('daisy', 'pale'), e('berry', 'warm')],
    buds: [e('tulip')]
  },
  'Botanical garden': {
    focal: [e('peony'), e('rose')],
    support: [e('lily'), e('daisy'), e('rose')],
    filler: [e('berry'), e('daisy'), e('blossom')],
    buds: [e('rose'), e('lily')]
  }
};
export const MIX_NAMES = Object.keys(MIXES);
export type LeafKind = 'oval' | 'lance' | 'trifoil' | 'round' | 'pinnate';
export type VineSpec = {
  /** Stem width in px of the 1400 stage. */
  width: number;
  thorns: number;
  /** Chance of a tendril on a stem. */
  tendril: number;
  /** Chance of a vine that follows a letter's outline. */
  outline: number;
  leaf: LeafKind;
  leaves: number;
  /** Stem curviness. */
  bend: number;
  /** Chance of a short twig leaving a stem. */
  twigs: number;
};
export const VINES: Record<string, VineSpec> = {
  'Curling vines': {
    width: 4.2,
    thorns: 0,
    tendril: .8,
    outline: .62,
    leaf: 'oval',
    leaves: 3,
    bend: 1,
    twigs: .15
  },
  'Thorny canes': {
    width: 5.2,
    thorns: 1,
    tendril: .1,
    outline: .38,
    leaf: 'trifoil',
    leaves: 3,
    bend: .75,
    twigs: .1
  },
  'Wild tendrils': {
    width: 3.2,
    thorns: 0,
    tendril: 1,
    outline: .74,
    leaf: 'lance',
    leaves: 4,
    bend: 1.3,
    twigs: .5
  },
  'Blossom branch': {
    width: 5.8,
    thorns: 0,
    tendril: 0,
    outline: .3,
    leaf: 'round',
    leaves: 2,
    bend: .6,
    twigs: .95
  },
  'Fine line': {
    width: 2.6,
    thorns: 0,
    tendril: .5,
    outline: .55,
    leaf: 'pinnate',
    leaves: 4,
    bend: 1.1,
    twigs: .3
  }
};
export const VINE_NAMES = Object.keys(VINES);
export const STYLE_NAMES = ['Painted', 'Engraved'];
export type Look = {
  name: string;
  font: string;
  motion: string;
  flowerMix: string;
  vineStyle: string;
  illustration: string;
  flower: string;
  stem: string;
  leaf: string;
  text: string;
  background: string;
};
export const PRESETS: Look[] = [{
  name: 'Electric Garden',
  font: 'Instrument Serif',
  motion: 'Breathe',
  flowerMix: 'Roses',
  vineStyle: 'Curling vines',
  illustration: 'Painted',
  flower: '#D6FF48',
  stem: '#B69AFF',
  leaf: '#B69AFF',
  text: '#D7F3FF',
  background: '#17132B'
}, {
  name: 'Rose Garden',
  font: 'Playfair Display',
  motion: 'Breathe',
  flowerMix: 'Roses',
  vineStyle: 'Thorny canes',
  illustration: 'Painted',
  flower: '#C81E3F',
  stem: '#3F6B4A',
  leaf: '#4C8059',
  text: '#2A1F22',
  background: '#F6EBDD'
}, {
  name: 'Wildflower Meadow',
  font: 'Fraunces',
  motion: 'Gust',
  flowerMix: 'Wildflowers',
  vineStyle: 'Wild tendrils',
  illustration: 'Painted',
  flower: '#E8509B',
  stem: '#5E8A4B',
  leaf: '#78A25C',
  text: '#27351F',
  background: '#E6EBCB'
}, {
  name: 'Peony Blush',
  font: 'Cormorant Garamond',
  motion: 'Breathe',
  flowerMix: 'Roses & peonies',
  vineStyle: 'Fine line',
  illustration: 'Painted',
  flower: '#F08CA8',
  stem: '#7C9A82',
  leaf: '#8FAE92',
  text: '#5A2E3E',
  background: '#FBEFEA'
}, {
  name: 'Midnight Poppy',
  font: 'Bodoni Moda',
  motion: 'Breathe',
  flowerMix: 'Poppies & lilies',
  vineStyle: 'Curling vines',
  illustration: 'Painted',
  flower: '#FF4A2E',
  stem: '#5E7F6C',
  leaf: '#6E9380',
  text: '#F4ECE0',
  background: '#0E1220'
}, {
  name: 'Cherry Blossom',
  font: 'Playfair Display Italic',
  motion: 'Gust',
  flowerMix: 'Cherry blossom',
  vineStyle: 'Blossom branch',
  illustration: 'Painted',
  flower: '#F7A6C0',
  stem: '#5A3F3A',
  leaf: '#8FB28A',
  text: '#3B2A33',
  background: '#E9F0F7'
}, {
  name: 'Botanical',
  font: 'Italiana',
  motion: 'Breathe',
  flowerMix: 'Botanical garden',
  vineStyle: 'Fine line',
  illustration: 'Engraved',
  flower: '#4A3A24',
  stem: '#4A3A24',
  leaf: '#4A3A24',
  text: '#2C2216',
  background: '#EFE4C8'
}, {
  name: 'Sunflower Field',
  font: 'Young Serif',
  motion: 'Breathe',
  flowerMix: 'Sunflowers',
  vineStyle: 'Wild tendrils',
  illustration: 'Painted',
  flower: '#F4B41A',
  stem: '#4F7A34',
  leaf: '#5F9340',
  text: '#FFF6DA',
  background: '#2F5D78'
}, {
  name: 'Tulip Spring',
  font: 'DM Serif Display',
  motion: 'Grow & Wither',
  flowerMix: 'Tulips & lilies',
  vineStyle: 'Curling vines',
  illustration: 'Painted',
  flower: '#F2517A',
  stem: '#3F8F5A',
  leaf: '#4FA46B',
  text: '#143A2A',
  background: '#E4F3E3'
}, {
  name: 'Acid Bloom',
  font: 'Bricolage Grotesque',
  motion: 'Gust',
  flowerMix: 'Roses & peonies',
  vineStyle: 'Wild tendrils',
  illustration: 'Painted',
  flower: '#FF8057',
  stem: '#C8ED62',
  leaf: '#D7F58A',
  text: '#F3F0CF',
  background: '#22271A'
}];
export type HSL = [h: number, s: number, l: number];
export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export function toHsl(hex: string): HSL {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  const n = parseInt(m ? m[1]! : '808080', 16);
  const r = (n >> 16 & 255) / 255,
    g = (n >> 8 & 255) / 255,
    b = (n & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2,
    d = max - min;
  let h = 0,
    s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? (g - b) / d % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  }
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}
export const hsla = (h: number, s: number, l: number, a = 1) => `hsla(${Math.round((h % 360 + 360) % 360)},${Math.round(clamp(s, 0, 100))}%,${Math.round(clamp(l, 0, 100))}%,${a})`;
export const alphaOf = (colour: string) => /^#[0-9a-f]{8}$/i.test(colour) ? parseInt(colour.slice(-2), 16) / 255 : 1;
export const isDark = (hex: string) => toHsl(hex)[2] < 45;
export const mixOf = (name: string) => MIXES[name] ?? MIXES.Roses!;
export const vineOf = (name: string) => VINES[name] ?? VINES['Curling vines']!;

/** Original procedural botanical composition. This module has no clock, palette or motion state. */
export type Letter = {
  id: number;
  char: string;
};
export type Point = {
  x: number;
  y: number;
};
export type Curve = [Point, Point, Point, Point];
export type Flower = {
  species: SpeciesName;
  tint: Tint;
  /** Radius in stage px. */
  size: number;
  rot: number;
  aspect: number;
  hue: number;
  sat: number;
  lit: number;
  seed: number;
  /** How far it opens at most, 0 closed to 1 fully open. */
  open: number;
  bud: boolean;
  /** Per ring: the angle offset and the change in petal count. */
  rings: {
    off: number;
    dn: number;
  }[];
};
export type Leaf = {
  t: number;
  side: number;
  size: number;
  angle: number;
  phase: number;
};
export type Plant = {
  id: string;
  letter: number;
  index: number;
  role: number;
  curve: Curve;
  /** STEM_N samples of the stem: x, y, angle in radians. */
  pts: number[];
  flower: Flower;
  front: boolean;
  leaves: Leaf[];
  leaf: LeafKind;
  thorns: number[];
  width: number;
  /** Curls and short twigs: where each leaves the stem, and its points as flat x, y. */
  tendrils: {
    t: number;
    pts: number[];
  }[];
  delay: number;
  phase: number;
};
export type Vine = {
  id: string;
  letter: number;
  index: number;
  /** Flat x, y along the letter's outline. */
  pts: number[];
  /** 1 where the vine passes over the letter, 0 where it goes behind. */
  front: number[];
  leaves: {
    i: number;
    side: number;
    size: number;
    phase: number;
  }[];
  leaf: LeafKind;
  curl: number[];
  blooms: {
    i: number;
    flower: Flower;
    /** Angle of the stem it sits on. */
    ang: number;
  }[];
  width: number;
  delay: number;
};
export type Composition = {
  letters: (Letter & {
    x: number;
    width: number;
  })[];
  plants: Plant[];
  vines: Vine[];
  fontSize: number;
  start: number;
  width: number;
  baseline: number;
  fingerprint: string;
};
export type GenerateOptions = {
  mix?: string;
  vine?: string;
  size?: number;
  /** Ascender and x-height as shares of the font size. */
  asc?: number;
  xh?: number;
  /** A letter's outline in ems, clockwise, as flat x, y (y down from the baseline). */
  outline?: ((char: string) => number[] | undefined) | undefined;
};
export const STEM_N = 44;
export const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
/** Mulberry32; public-domain JS reference: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32 */
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let n = Math.imul(s ^ s >>> 15, s | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
export function point(c: Curve, t: number): Point {
  const s = 1 - t;
  return {
    x: s * s * s * c[0].x + 3 * s * s * t * c[1].x + 3 * s * t * t * c[2].x + t * t * t * c[3].x,
    y: s * s * s * c[0].y + 3 * s * s * t * c[1].y + 3 * s * t * t * c[2].y + t * t * t * c[3].y
  };
}
export function tangent(c: Curve, t: number) {
  const a = point(c, Math.max(0, t - .002)),
    b = point(c, Math.min(1, t + .002));
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}
export const path = (c: Curve) => `M${c[0].x},${c[0].y} C${c[1].x},${c[1].y} ${c[2].x},${c[2].y} ${c[3].x},${c[3].y}`;
/** A spiral that leaves (x, y) heading `ang` and curls to one side (dir 1 or -1). */
export function curlPoints(x: number, y: number, ang: number, dir: number, scale: number, steps = 26, curve = 1) {
  const out = [x, y];
  let h = ang;
  for (let k = 0; k < steps; k++) {
    h += dir * (.13 + .52 * k / steps) * curve;
    const step = 6.5 * scale * (1 - .78 * k / steps);
    x += Math.cos(h) * step;
    y += Math.sin(h) * step;
    out.push(x, y);
  }
  return out;
}
function sampleStem(c: Curve) {
  const out: number[] = [];
  for (let i = 0; i < STEM_N; i++) {
    const t = i / (STEM_N - 1),
      p = point(c, t);
    out.push(p.x, p.y, tangent(c, t) * Math.PI / 180);
  }
  return out;
}
/** STEM_N evenly spaced samples (x, y, angle) along a polyline. */
function sampleLine(poly: number[]) {
  const n = poly.length / 2,
    acc = [0];
  for (let i = 1; i < n; i++) acc.push(acc[i - 1]! + Math.hypot(poly[i * 2]! - poly[i * 2 - 2]!, poly[i * 2 + 1]! - poly[i * 2 - 1]!));
  const total = acc[n - 1]! || 1,
    out: number[] = [];
  let j = 1;
  for (let i = 0; i < STEM_N; i++) {
    const d = i / (STEM_N - 1) * total;
    while (j < n - 1 && acc[j]! < d) j++;
    const span = acc[j]! - acc[j - 1]! || 1,
      e = clamp((d - acc[j - 1]!) / span);
    out.push(poly[j * 2 - 2]! + (poly[j * 2]! - poly[j * 2 - 2]!) * e, poly[j * 2 - 1]! + (poly[j * 2 + 1]! - poly[j * 2 - 1]!) * e, 0);
  }
  for (let i = 0; i < STEM_N; i++) {
    const a = Math.max(0, i - 1),
      b = Math.min(STEM_N - 1, i + 1);
    out[i * 3 + 2] = Math.atan2(out[b * 3 + 1]! - out[a * 3 + 1]!, out[b * 3]! - out[a * 3]!);
  }
  return out;
}
export function onStem(pts: number[], t: number) {
  const q = clamp(t) * (STEM_N - 1),
    i = Math.min(STEM_N - 2, Math.floor(q)),
    e = q - i;
  return {
    x: pts[i * 3]! + (pts[i * 3 + 3]! - pts[i * 3]!) * e,
    y: pts[i * 3 + 1]! + (pts[i * 3 + 4]! - pts[i * 3 + 1]!) * e,
    ang: pts[i * 3 + 2]! + (pts[i * 3 + 5]! - pts[i * 3 + 2]!) * e
  };
}
const SIZE_OF: Record<SpeciesName, number> = {
  rose: 1,
  peony: 1.08,
  daisy: .92,
  poppy: 1.02,
  tulip: .9,
  lily: 1.12,
  cosmos: .92,
  blossom: .74,
  sunflower: 1.18,
  berry: .34
};
function makeFlower(rng: () => number, entry: MixEntry, radius: number, open: number): Flower {
  const spec = SPECIES[entry.sp];
  const rings = spec.rings.map((r, k) => ({
    off: k * 2.399 + rng() * .7,
    dn: spec.side ? 0 : r[0] >= 12 ? Math.round((rng() - .5) * 4) : r[0] > 3 ? Math.round(rng() * 2 - 1) : 0
  }));
  const bud = open < .27 && entry.sp !== 'berry';
  return {
    species: entry.sp,
    tint: entry.tint,
    size: radius * SIZE_OF[entry.sp],
    rot: (rng() - .5) * (spec.side ? 18 : 110),
    aspect: spec.side ? 1 : .8 + rng() * .28,
    hue: (rng() - .5) * 16,
    sat: (rng() - .5) * 12,
    lit: (rng() - .5) * 10,
    seed: Math.floor(rng() * 1e6),
    open: bud ? open : Math.max(.45, open),
    bud,
    rings
  };
}
const pick = <T,>(rng: () => number, list: T[]) => list[Math.floor(rng() * list.length)]!;
function resample(flat: number[], step: number) {
  const n = flat.length / 2;
  const out: number[] = [];
  let carry = 0,
    px = flat[0]!,
    py = flat[1]!;
  out.push(px, py);
  for (let i = 1; i <= n; i++) {
    const x = flat[i % n * 2]!,
      y = flat[i % n * 2 + 1]!;
    let d = Math.hypot(x - px, y - py);
    while (carry + d >= step) {
      const k = (step - carry) / d;
      px += (x - px) * k;
      py += (y - py) * k;
      out.push(px, py);
      d = Math.hypot(x - px, y - py);
      carry = 0;
    }
    carry += d;
    px = x;
    py = y;
  }
  return out;
}
const ellipseOutline = (bowl: boolean) => Array.from({
  length: 36
}, (_, i) => {
  const a = i / 36 * Math.PI * 2 - Math.PI / 2;
  return bowl ? [.28 + Math.cos(a) * .27, -.24 + Math.sin(a) * .22] : [.1 + Math.cos(a) * .1, -.36 + Math.sin(a) * .34];
}).flat();
export function generate(letters: Letter[], seed: number, density0: number, measure: (text: string) => number, opts: GenerateOptions = {}): Composition {
  // Short words get larger blooms and a fuller garden.
  const count = letters.filter(l => l.char.trim()).length,
    shortBoost = count > 0 && count < 9 ? Math.min(.4, (9 - count) * .055) : 0,
    density = Math.min(1, density0 + shortBoost * .6);
  const mix = mixOf(opts.mix ?? 'Roses'),
    vine = vineOf(opts.vine ?? 'Curling vines'),
    bloom = clamp(opts.size ?? 1, .5, 1.8) * (1 + shortBoost),
    asc = clamp((opts.asc ?? .7) / .7, .85, 1.25);
  const raw = letters.map(l => measure(l.char)),
    total = raw.reduce((a, b) => a + b, 0),
    scale = Math.min(1, 1240 / Math.max(total, 1)),
    big = Math.pow(scale, .62);
  const fontSize = 420 * scale,
    width = total * scale,
    start = (1400 - width) / 2,
    baseline = 500,
    positioned: Composition['letters'] = [];
  let x = start;
  for (let i = 0; i < letters.length; i++) {
    positioned.push({
      ...letters[i]!,
      x,
      width: raw[i]! * scale
    });
    x += raw[i]! * scale;
  }
  type Plan = {
    l: (typeof positioned)[number];
    i: number;
    role: number;
    j: number;
    rng: () => number;
    root: Point;
    end: Point;
    flower: Flower;
    lean: number;
    r: number;
  };
  const plans: Plan[] = [];
  positioned.forEach((l, i) => {
    if (!l.char.trim()) return;
    const rng = random(seed * 137 + i * 7919 + l.char.codePointAt(0)! * 31);
    const role = i % 7;
    // A loose editorial rhythm: two focal heads, a supporting cluster, a hanging
    // half-open flower and quiet buds. There is deliberately no flower-per-letter row.
    const rise = [-.94, -1.04, .19, .29, -.78, -.99, -.32][role]! * (role < 2 || role === 4 || role === 5 ? asc : 1);
    const spread = [.30, .92, .72, .40, .00, 1.03, 1.08][role]!;
    const size = [1.90, .88, .62, 1.15, 1.72, 1.03, .72][role]!;
    const open = [.96, .56, .17, .72, .84, .46, .22][role]!;
    const count = density > .65 && (role === 0 || role === 4) ? 2 : 1;
    const group = role === 0 || role === 4 ? mix.focal : role === 1 || role === 3 ? mix.support : mix.filler;
    for (let j = 0; j < count; j++) {
      const secondary = j === 1;
      const skip = j === 0 && density < .65 && role === 2;
      const endpointY = baseline + fontSize * (rise + (rng() - .5) * .12);
      const root = {
        x: l.x + l.width * (.25 + rng() * .40),
        y: baseline - fontSize * (.08 + rng() * .19)
      };
      const end = {
        x: l.x + l.width * spread + (rng() - .5) * 44 * scale,
        y: endpointY
      };
      let openness = clamp(open + (rng() - .5) * .13);
      let radius = 58 * size * (.88 + rng() * .22) * big * bloom;
      let entry = pick(rng, secondary ? mix.buds : group);
      if (secondary) {
        end.x += fontSize * (role === 0 ? .18 : -.16);
        end.y += fontSize * (role === 0 ? .12 : -.17);
        radius *= role === 0 ? .52 : .4;
        openness = role === 0 ? .55 : .14;
      } else if (role === 2 || role === 6) {
        if (rng() < .55) entry = pick(rng, mix.buds);
      }
      if (role === 1 && !secondary) {
        end.x = l.x + l.width * .88;
        end.y = baseline - fontSize * .47;
      }
      if (role === 6 && !secondary) {
        end.x = l.x + l.width * .79;
        end.y = baseline - fontSize * .22;
        radius *= .92;
      }
      if (/[aeo]/i.test(l.char)) {
        root.x = l.x + l.width * .55;
        root.y = baseline - fontSize * .22;
      }
      const lean = (rng() > .5 ? 1 : -1) * (50 + rng() * 60) * scale;
      const flower = makeFlower(rng, entry, radius, openness);
      if (!skip) plans.push({
        l,
        i,
        role,
        j,
        rng,
        root,
        end,
        flower,
        lean,
        r: flower.size
      });
    }
  });
  // Keep heads inside the stage and ease them apart so no two hide each other.
  for (let pass = 0; pass < 4; pass++) {
    for (let a = 0; a < plans.length; a++) {
      for (let b = a + 1; b < plans.length; b++) {
        const p = plans[a]!,
          q = plans[b]!,
          dx = q.end.x - p.end.x,
          dy = q.end.y - p.end.y,
          d = Math.hypot(dx, dy) || 1,
          min = (p.r + q.r) * .78;
        if (d < min) {
          const k = (min - d) / 2 / d;
          p.end.x -= dx * k;
          p.end.y -= dy * k;
          q.end.x += dx * k;
          q.end.y += dy * k;
        }
      }
    }
  }
  const outline = opts.outline;
  const contours = new Map<number, number[] | undefined>();
  /** A letter's outline as evenly spaced, smoothed points in stage px (clockwise). */
  const contourOf = (l: (typeof positioned)[number]) => {
    if (contours.has(l.id)) return contours.get(l.id);
    const shape = outline?.(l.char) ?? ellipseOutline(/[abdegopqcsw]/i.test(l.char));
    const world: number[] = [];
    for (let k = 0; k < shape.length; k += 2) world.push(l.x + shape[k]! * fontSize, baseline + shape[k + 1]! * fontSize);
    let d = resample(world, 7 * scale + 2);
    for (let pass = 0; pass < 3; pass++) {
      const m = d.length / 2,
        s: number[] = [];
      for (let i = 0; i < m; i++) {
        const a = (i + m - 1) % m,
          b = (i + 1) % m;
        s.push((d[a * 2]! + 2 * d[i * 2]! + d[b * 2]!) / 4, (d[a * 2 + 1]! + 2 * d[i * 2 + 1]! + d[b * 2 + 1]!) / 4);
      }
      d = s;
    }
    const out = d.length >= 24 ? d : undefined;
    contours.set(l.id, out);
    return out;
  };
  /** A stem that climbs a letter's stroke toward `end`, a point or two off its outline, and leaves it with a short stalk. */
  const climb = (l: (typeof positioned)[number], end: Point, wobble: number, phase: number) => {
    const d = contourOf(l);
    if (!d) return undefined;
    const n = d.length / 2,
      step = 7 * scale + 2,
      maxK = Math.min(n - 2, Math.ceil(fontSize * 1.1 / step)),
      low = baseline - fontSize * .3;
    let best = {
      s: 0,
      dir: 1,
      k: 2,
      score: Infinity
    };
    for (let s = 0; s < n; s++) {
      if (d[s * 2 + 1]! < low) continue;
      for (const dir of [1, -1]) for (let k = 2; k <= maxK; k++) {
        const idx = ((s + dir * k) % n + n) % n,
          score = Math.hypot(d[idx * 2]! - end.x, d[idx * 2 + 1]! - end.y) + k * step * .1;
        if (score < best.score) best = {
          s,
          dir,
          k,
          score
        };
      }
    }
    if (!isFinite(best.score)) return undefined;
    const poly: number[] = [];
    for (let k = 0; k <= best.k; k++) {
      const idx = ((best.s + best.dir * k) % n + n) % n,
        a = (idx + n - 1) % n,
        b = (idx + 1) % n,
        tx = d[b * 2]! - d[a * 2]!,
        ty = d[b * 2 + 1]! - d[a * 2 + 1]!,
        len = Math.hypot(tx, ty) || 1,
        off = (4 + 3 * wobble * Math.sin(k * .5 + phase)) * scale;
      poly.push(d[idx * 2]! + ty / len * off, d[idx * 2 + 1]! - tx / len * off);
    }
    const m = poly.length / 2,
      qx = poly[m * 2 - 2]!,
      qy = poly[m * 2 - 1]!,
      hx = qx - poly[m * 2 - 4]!,
      hy = qy - poly[m * 2 - 3]!,
      hl = Math.hypot(hx, hy) || 1,
      dist = Math.hypot(end.x - qx, end.y - qy);
    // the stalk: a short curve from the outline to the head (the head is drawn in if it is far)
    const reach = fontSize * .34;
    if (dist > reach) {
      end.x = qx + (end.x - qx) * reach / dist;
      end.y = qy + (end.y - qy) * reach / dist;
    }
    const stalk = Math.min(dist, reach);
    for (let k = 1; k <= 8; k++) {
      const u = k / 8,
        cx = qx + hx / hl * stalk * .45,
        cy = qy + hy / hl * stalk * .45;
      poly.push((1 - u) * (1 - u) * qx + 2 * (1 - u) * u * cx + u * u * end.x, (1 - u) * (1 - u) * qy + 2 * (1 - u) * u * cy + u * u * end.y);
    }
    return poly;
  };
  const plants: Plant[] = plans.map(p => {
    const {
      rng,
      root,
      end,
      flower,
      lean,
      l,
      i,
      role,
      j
    } = p;
    end.x = clamp(end.x, 40 + p.r * 1.3, 1360 - p.r * 1.3);
    end.y = clamp(end.y, -50 + p.r * .8, 800 - p.r * .6);
    const direction = end.y < root.y ? -1 : 1;
    const bend = vine.bend;
    const c: Curve = [root, {
      x: root.x + lean * bend,
      y: root.y + direction * fontSize * .15
    }, {
      x: end.x - lean * .7 * bend,
      y: end.y - direction * fontSize * .23
    }, end];
    const poly = climb(l, end, bend, rng() * 6.28);
    const stemPts = poly ? sampleLine(poly) : sampleStem(c);
    const secondary = j === 1;
    const leafCount = secondary ? 2 : Math.max(1, Math.round(vine.leaves + (role === 2 || role === 5 ? 1 : 0)));
    const leaves: Leaf[] = Array.from({
      length: leafCount
    }, (_, k) => ({
      t: .18 + (k + .2 + rng() * .4) / leafCount * .61,
      side: (k + role) % 2 ? 1 : -1,
      size: (26 + rng() * 26) * scale * (role >= 4 ? .76 : 1),
      angle: 32 + rng() * 30,
      phase: rng() * 6.28
    }));
    const thorns: number[] = [];
    if (vine.thorns) for (let t = .1 + rng() * .06; t < .78; t += .1 + rng() * .08) thorns.push(Math.round(t * 100) / 100);
    const tendrils: Plant['tendrils'] = [];
    const wantsTendril = rng() < vine.tendril * (role === 1 || role === 3 || role === 5 || role === 6 ? 1 : .55);
    const tendrilT = .38 + rng() * .3,
      tendrilSide = rng() > .5 ? 1 : -1,
      tendrilScale = scale * (.8 + rng() * .5),
      twigRoll = rng(),
      twigT = .3 + rng() * .35;
    if (wantsTendril) {
      const q = onStem(stemPts, tendrilT),
        a = q.ang + tendrilSide * 1.1;
      tendrils.push({
        t: tendrilT,
        pts: curlPoints(q.x, q.y, a, tendrilSide, tendrilScale)
      });
    }
    if (twigRoll < vine.twigs) {
      const q = onStem(stemPts, twigT),
        a = q.ang - tendrilSide * .9;
      tendrils.push({
        t: twigT,
        pts: curlPoints(q.x, q.y, a, -tendrilSide, scale * 1.6, 9, .35)
      });
    }
    return {
      id: `${l.id}-${j}`,
      letter: l.id,
      index: i,
      role,
      curve: poly ? [{
        x: stemPts[0]!,
        y: stemPts[1]!
      }, {
        x: stemPts[14 * 3]!,
        y: stemPts[14 * 3 + 1]!
      }, {
        x: stemPts[29 * 3]!,
        y: stemPts[29 * 3 + 1]!
      }, end] : c,
      pts: stemPts,
      flower,
      front: role === 3,
      leaves,
      leaf: vine.leaf,
      thorns,
      width: vine.width * (.85 + scale * .15),
      tendrils,
      delay: rng() * .22,
      phase: rng() * 6.28
    };
  });
  const vines: Vine[] = [];
  positioned.forEach((l, i) => {
    if (!l.char.trim()) return;
    const rng = random(seed * 977 + i * 131 + l.char.codePointAt(0)! * 17);
    const want = rng(),
      startAt = rng(),
      span = .3 + rng() * .42,
      phase = rng() * 6.28,
      leafSeed = rng();
    if (want > vine.outline * (.45 + density * .7) || vines.length >= 5 + letters.length * .6) return;
    const dense = contourOf(l);
    if (!dense) return;
    const n = dense.length / 2;
    if (n < 8) return;
    // start low on the letter and climb it
    const lows: number[] = [];
    for (let k = 0; k < n; k++) if (dense[k * 2 + 1]! > baseline - fontSize * .3) lows.push(k);
    const from = lows.length ? lows[Math.floor(startAt * lows.length)]! : Math.floor(startAt * n),
      up = dense[(from + 6) % n * 2 + 1]! < dense[(from + n - 6) % n * 2 + 1]! ? 1 : -1,
      climbDir = leafSeed > .85 ? -up : up,
      count = Math.max(8, Math.floor(n * (.35 + span)));
    const pts: number[] = [],
      front: number[] = [];
    let runs = 0,
      lastSign = 0;
    for (let k = 0; k < count; k++) {
      const a = ((from + climbDir * k) % n + n) % n,
        b = (a + 1) % n,
        z = (a + n - 1) % n;
      const tx = dense[b * 2]! - dense[z * 2]!,
        ty = dense[b * 2 + 1]! - dense[z * 2 + 1]!,
        len = Math.hypot(tx, ty) || 1;
      const s = Math.sin(k * .42 + phase),
        off = (3 + 5.5 * s) * scale;
      pts.push(dense[a * 2]! + ty / len * off, dense[a * 2 + 1]! - tx / len * off);
      const sign = s < -.45 ? 1 : 0;
      if (sign !== lastSign) runs++;
      lastSign = sign;
      front.push(sign && runs % 4 !== 0 ? 1 : 0);
    }
    const last = pts.length / 2 - 1,
      ang = Math.atan2(pts[last * 2 + 1]! - pts[last * 2 - 1]!, pts[last * 2]! - pts[last * 2 - 2]!);
    const dir = leafSeed > .5 ? 1 : -1;
    const leaves = Array.from({
      length: Math.floor(last / 3)
    }, (_, k) => ({
      i: 2 + k * 3,
      side: k % 2 ? 1 : -1,
      size: (11 + rng() * 11) * scale,
      phase: rng() * 6.28
    })).filter(v => v.i < last);
    const blooms: Vine['blooms'] = [];
    const place = (at: number, entry: MixEntry, openness: number) => {
      if (at < 3 || at > last) return;
      blooms.push({
        i: at,
        flower: makeFlower(rng, entry, (14 + rng() * 9) * scale * bloom * 1.5, openness),
        ang: Math.atan2(pts[at * 2 + 1]! - pts[at * 2 - 1]!, pts[at * 2]! - pts[at * 2 - 2]!)
      });
    };
    if (rng() < .75) place(last, pick(rng, mix.filler), rng() < .5 ? .2 : .55);
    if (rng() < .45) place(Math.floor(last * .55), pick(rng, mix.filler), .5);
    vines.push({
      id: `v${l.id}`,
      letter: l.id,
      index: i,
      pts,
      front,
      leaves,
      leaf: vine.leaf,
      curl: curlPoints(pts[last * 2]!, pts[last * 2 + 1]!, ang, dir, scale * 1.2, 24),
      blooms,
      width: vine.width * .62,
      delay: rng() * .25
    });
  });
  return {
    letters: positioned,
    plants,
    vines,
    fontSize,
    start,
    width,
    baseline,
    fingerprint: plants.map(p => path(p.curve)).join('|') + vines.map(v => v.pts.length + ':' + Math.round(v.pts[0]!)).join(',')
  };
}
/** Prefix/suffix identity survives append, deletion and middle insertion. */
export function reconcile(previous: Letter[], next: string[], allocate: () => number): Letter[] {
  let prefix = 0,
    suffix = 0;
  while (prefix < previous.length && prefix < next.length && previous[prefix]!.char === next[prefix]) prefix++;
  while (suffix < previous.length - prefix && suffix < next.length - prefix && previous[previous.length - 1 - suffix]!.char === next[next.length - 1 - suffix]) suffix++;
  return next.map((char, i) => i < prefix ? previous[i]! : i >= next.length - suffix ? previous[previous.length - next.length + i]! : {
    id: allocate(),
    char
  });
}

/** Canvas 2D drawing of Bloom Type's flowers, leaves and stems. Every shape is drawn here from paths: no images, no other artwork. */
export type Palette = {
  flower: string;
  stem: string;
  leaf: string;
  text: string;
  background: string;
  engraved: boolean;
  /** Added for notgui.com: no vignette or grain, so the background is one flat colour. */
  plain?: boolean;
};
export const TAU = Math.PI * 2;
export const hash = (v: number) => {
  const s = Math.sin(v * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeOutBack = (t: number) => {
  const u = clamp(t) - 1;
  return 1 + 2.4 * u * u * u + 1.4 * u * u;
};
type Seg = [number, number, number, number, number, number];
type PetalPaths = {
  hatchA: Path2D;
  hatchB: Path2D;
  rib: Path2D;
  full: Path2D;
  half: Path2D;
  veins: Path2D;
  veins2: Path2D;
};
const petalCache = new Map<string, PetalPaths>();
function upperOf(shape: Shape, w: number): Seg[] {
  switch (shape) {
    case 'ruffle':
      return [[.08, -.55 * w, .3, -1.15 * w, .5, -1.02 * w], [.58, -1.24 * w, .7, -.96 * w, .78, -1.1 * w], [.86, -1.2 * w, .95, -.82 * w, .97, -.5 * w], [1, -.3 * w, 1, -.1 * w, 1, 0]];
    case 'strap':
      return [[.1, -w, .75, -w * 1.05, .92, -w * .7], [.97, -.45 * w, 1, -.15 * w, 1, 0]];
    case 'crinkle':
      return [[.04, -.95 * w, .32, -1.2 * w, .6, -1.06 * w], [.8, -.98 * w, .96, -.8 * w, .99, -.3 * w], [1, -.12 * w, 1, -.04 * w, 1, 0]];
    case 'point':
      return [[.2, -.9 * w, .62, -1.05 * w, .82, -.55 * w], [.9, -.3 * w, .96, -.1 * w, 1, 0]];
    case 'notch':
      return [[.1, -.9 * w, .5, -1.5 * w, .8, -1.15 * w], [1, -.95 * w, 1.02, -.35 * w, .9, 0]];
    default:
      return [[.1, -.75 * w, .5, -1.45 * w, .85, -.9 * w], [.97, -.55 * w, 1, -.2 * w, 1, 0]];
  }
}
function petalOf(shape: Shape, wid: number): PetalPaths {
  const key = shape + Math.round(wid * 50);
  let hit = petalCache.get(key);
  if (hit) return hit;
  const up = upperOf(shape, wid);
  const full = new Path2D(),
    half = new Path2D();
  full.moveTo(0, 0);
  half.moveTo(0, 0);
  for (const s of up) {
    full.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]);
    half.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]);
  }
  for (let i = up.length - 1; i >= 0; i--) {
    const s = up[i]!,
      px = i ? up[i - 1]![4] : 0,
      py = i ? up[i - 1]![5] : 0;
    full.bezierCurveTo(s[2], -s[3], s[0], -s[1], px, -py);
  }
  full.closePath();
  half.closePath();
  const veins = new Path2D(),
    veins2 = new Path2D();
  veins.moveTo(.02, 0);
  veins.lineTo(.86, 0);
  veins2.moveTo(.02, 0);
  veins2.lineTo(.9, 0);
  for (const [f, n] of [[.3, 1], [.52, 1], [.72, 0], [.18, 0], [.42, 0], [.62, 0]] as const) {
    const dst = n ? veins : veins2;
    for (const sd of [-1, 1]) {
      dst.moveTo(f, 0);
      dst.quadraticCurveTo(f + .18, sd * wid * .45, f + .3, sd * wid * (.62 + f * .3));
    }
    if (n) for (const sd of [-1, 1]) {
      veins2.moveTo(f, 0);
      veins2.quadraticCurveTo(f + .18, sd * wid * .45, f + .3, sd * wid * (.62 + f * .3));
    }
  }
  const hatchA = new Path2D(),
    hatchB = new Path2D(),
    rib = new Path2D();
  rib.moveTo(.02, 0);
  rib.lineTo(.9, 0);
  // Engraving: radial ticks across the shaded half; the concentric arcs are cached by spacing (see arcsOf).
  for (let a = -1.5; a <= 1.51; a += .3) {
    hatchB.moveTo(Math.cos(a) * .45, Math.sin(a) * .45);
    hatchB.lineTo(Math.cos(a) * .95, Math.sin(a) * .95);
  }
  hit = {
    hatchA,
    hatchB,
    rib,
    full,
    half,
    veins,
    veins2
  };
  petalCache.set(key, hit);
  return hit;
}
const arcCache = new Map<number, Path2D>();
/** Concentric arcs round a petal's base, `s` apart (in petal lengths): the engraver's lines that follow the curve. */
function arcsOf(s: number) {
  let a = arcCache.get(s);
  if (!a) {
    a = new Path2D();
    for (let r = .3; r < .98; r += s) {
      a.moveTo(r, 0);
      a.arc(0, 0, r, 0, TAU);
    }
    arcCache.set(s, a);
  }
  return a;
}
function dotsOf(n: number, r: number, dot: number, golden = 2.399) {
  const p = new Path2D();
  for (let i = 1; i <= n; i++) {
    const a = i * golden,
      d = r * Math.sqrt(i / n);
    p.moveTo(Math.cos(a) * d + dot, Math.sin(a) * d);
    p.arc(Math.cos(a) * d, Math.sin(a) * d, dot * (.65 + .5 * i / n), 0, TAU);
  }
  return p;
}
const buildShared = () => ({
  dome: dotsOf(40, .8, .05),
  disk: dotsOf(150, .92, .04),
  ring: (() => {
    const p = new Path2D();
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU,
        d = .62 + .1 * hash(i + 3);
      p.moveTo(Math.cos(a) * d + .06, Math.sin(a) * d);
      p.arc(Math.cos(a) * d, Math.sin(a) * d, .06, 0, TAU);
    }
    return p;
  })(),
  filaments: (() => {
    const p = new Path2D();
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU + hash(i) * .3,
        d = .75 + .35 * hash(i + 9);
      p.moveTo(0, 0);
      p.quadraticCurveTo(Math.cos(a + .2) * d * .5, Math.sin(a + .2) * d * .5, Math.cos(a) * d, Math.sin(a) * d);
    }
    return p;
  })(),
  anthers: (() => {
    const p = new Path2D();
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU + hash(i) * .3,
        d = .75 + .35 * hash(i + 9);
      p.moveTo(Math.cos(a) * d + .07, Math.sin(a) * d);
      p.arc(Math.cos(a) * d, Math.sin(a) * d, .07, 0, TAU);
    }
    return p;
  })(),
  spiral: (() => {
    const p = new Path2D();
    for (let i = 0; i < 70; i++) {
      const a = i * .4,
        r = .02 + i * .0042;
      if (i) p.lineTo(Math.cos(a) * r, Math.sin(a) * r);else p.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return p;
  })(),
  spots: (() => {
    const p = new Path2D();
    for (let i = 0; i < 9; i++) {
      const x = .12 + hash(i + 40) * .4,
        y = (hash(i + 70) - .5) * .16;
      p.moveTo(x + .018, y);
      p.arc(x, y, .018 + hash(i) * .01, 0, TAU);
    }
    return p;
  })(),
  rayLines: (() => {
    const p = new Path2D();
    for (let i = 0; i < 12; i++) {
      p.moveTo(0, 0);
      p.lineTo(Math.cos(i / 12 * TAU), Math.sin(i / 12 * TAU));
    }
    return p;
  })(),
  bud: (() => {
    const p = new Path2D();
    p.moveTo(0, .2);
    p.bezierCurveTo(-.36, .1, -.36, -.52, 0, -1);
    p.bezierCurveTo(.36, -.52, .36, .1, 0, .2);
    return p;
  })(),
  budLines: (() => {
    const p = new Path2D();
    p.moveTo(-.04, .15);
    p.bezierCurveTo(-.2, -.2, .02, -.6, .06, -.9);
    p.moveTo(.16, .1);
    p.bezierCurveTo(.08, -.25, -.08, -.55, -.02, -.82);
    return p;
  })()
});
let sharedCache: ReturnType<typeof buildShared> | undefined;
const shared = () => sharedCache ??= buildShared();
type LeafPaths = {
  full: Path2D;
  upper: Path2D;
  veins: Path2D;
  veins2: Path2D;
  mid: Path2D;
};
const leafCache = new Map<string, LeafPaths>();
function leafShape(kind: LeafKind): LeafPaths {
  let hit = leafCache.get(kind);
  if (hit) return hit;
  const [w, x1, x2, y1, y2] = kind === 'lance' ? [.2, .26, .72, 1, .85] : kind === 'round' ? [.46, .03, .9, 1.05, 1.05] : [.34, .2, .72, 1, 1] as const;
  const full = new Path2D(),
    upper = new Path2D();
  full.moveTo(0, 0);
  full.bezierCurveTo(x1, -w * y1, x2, -w * y2, 1, 0);
  full.bezierCurveTo(x2, w * y2, x1, w * y1, 0, 0);
  upper.moveTo(0, 0);
  upper.bezierCurveTo(x1, -w * y1, x2, -w * y2, 1, 0);
  upper.closePath();
  const veins = new Path2D(),
    veins2 = new Path2D(),
    mid = new Path2D();
  mid.moveTo(0, 0);
  mid.lineTo(.96, 0);
  for (let k = 0; k < 6; k++) {
    const f = .12 + k * .13;
    for (const sd of [-1, 1]) {
      const dst = k % 2 ? veins2 : veins;
      dst.moveTo(f, 0);
      dst.lineTo(f + .2, sd * w * (.55 + .3 * Math.sin(f * 3)));
      veins2.moveTo(f, 0);
      veins2.lineTo(f + .2, sd * w * (.55 + .3 * Math.sin(f * 3)));
    }
  }
  hit = {
    full,
    upper,
    veins,
    veins2,
    mid
  };
  leafCache.set(kind, hit);
  return hit;
}
export type Ctx = CanvasRenderingContext2D;
export type LeafLook = {
  ver: number;
  grad: CanvasGradient;
  dark: string;
  edge: string;
  vein: string;
  mid: string;
  ink: string;
  paper: string;
  stem: string;
  stemDark: string;
  stemLight: string;
};
export type FlowerLook = {
  ver: number;
  grads: CanvasGradient[];
  edge: string;
  vein: string;
  shade: string;
  ew: number;
  vw: number;
  centre: CanvasGradient;
  centreEdge: string;
  florets: string;
  dark: string;
  sepalEdge: string;
  bud: CanvasGradient;
  swatch: string;
  drop: CanvasGradient;
  flat: string;
  berry: CanvasGradient[];
};
function tinted(f: Flower, base: HSL): HSL {
  const [h, s, l] = base;
  switch (f.tint) {
    case 'pale':
      return [h + f.hue, s * .6 + f.sat, l + (100 - l) * .5 + f.lit];
    case 'warm':
      return [42 + f.hue * .5, 90 + f.sat * .3, 56 + f.lit];
    case 'cool':
      return [h + 170 + f.hue, s * .85 + f.sat, l * .95 + f.lit];
    default:
      return [h + f.hue, s + f.sat, l + f.lit];
  }
}
export function leafLookOf(c: Ctx, pal: Palette, ver: number): LeafLook {
  const [h, s, l] = toHsl(pal.leaf),
    [sh, ss, sl] = toHsl(pal.stem);
  const grad = c.createLinearGradient(0, 0, 1, 0);
  if (pal.engraved) {
    grad.addColorStop(0, hsla(h, s, l, .55));
    grad.addColorStop(1, hsla(h, s, l, .05));
  } else {
    grad.addColorStop(0, hsla(h, s + 4, l * .66));
    grad.addColorStop(.5, hsla(h, s, l));
    grad.addColorStop(1, hsla(h, s - 6, l + (100 - l) * .2));
  }
  return {
    ver,
    grad,
    dark: hsla(h, s, l * .35, .2),
    edge: hsla(h, s, l * .45, pal.engraved ? .95 : .55),
    vein: hsla(h, s - 5, Math.min(96, l + 22), pal.engraved ? 0 : .5),
    mid: hsla(h, s - 5, Math.min(96, l + 26), .6),
    ink: hsla(h, s, l * .55, .8),
    paper: pal.background,
    stem: pal.engraved ? hsla(sh, ss, sl, .95) : hsla(sh, ss, sl),
    stemDark: hsla(sh, ss, sl * .55, .9),
    stemLight: hsla(sh, ss - 8, Math.min(95, sl + 22), .55)
  };
}
export function flowerLookOf(c: Ctx, f: Flower, pal: Palette, leaf: LeafLook, ver: number): FlowerLook {
  const sp = SPECIES[f.species];
  const eng = pal.engraved;
  const [h, s, l] = tinted(f, toHsl(pal.flower));
  const grads = sp.rings.map((r, k) => {
    const g = c.createLinearGradient(0, 0, 1, 0);
    const tone = r[4];
    const base = l * (.74 + .3 * tone);
    if (eng) {
      g.addColorStop(0, hsla(h, s, base * .7, .5));
      g.addColorStop(.55, hsla(h, s, base * .7, .16));
      g.addColorStop(1, hsla(h, s, base * .7, 0));
    } else if (f.species === 'poppy' && k < 2) {
      g.addColorStop(0, 'hsl(' + Math.round(h) + ',30%,10%)');
      g.addColorStop(.1, 'hsl(' + Math.round(h) + ',40%,14%)');
      g.addColorStop(.26, hsla(h, s, base * .74));
      g.addColorStop(.8, hsla(h, s, base));
      g.addColorStop(1, hsla(h, s - 6, base + (100 - base) * .18));
    } else {
      g.addColorStop(0, hsla(h, s + 10, base * .6));
      g.addColorStop(.45, hsla(h, s + 2, base * .98));
      g.addColorStop(1, hsla(h, s - 10, base + (100 - base) * .34));
    }
    return g;
  });
  const centre = c.createRadialGradient(-.15, -.15, 0, 0, 0, 1);
  if (eng) {
    centre.addColorStop(0, hsla(h, s, l * .5, .15));
    centre.addColorStop(1, hsla(h, s, l * .5, .55));
  } else if (f.species === 'sunflower') {
    centre.addColorStop(0, hsla(34, 60, 24));
    centre.addColorStop(.75, hsla(28, 58, 15));
    centre.addColorStop(1, hsla(24, 50, 10));
  } else if (f.species === 'poppy') {
    centre.addColorStop(0, hsla(h, 10, 24));
    centre.addColorStop(1, hsla(h, 10, 8));
  } else {
    centre.addColorStop(0, hsla(46, 95, 66));
    centre.addColorStop(.7, hsla(40, 90, 52));
    centre.addColorStop(1, hsla(30, 82, 40));
  }
  const dropGrad = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  dropGrad.addColorStop(0, hsla(h, s, l * .2, eng ? 0 : .44));
  dropGrad.addColorStop(.7, hsla(h, s, l * .2, eng ? 0 : .28));
  dropGrad.addColorStop(1, hsla(h, s, l * .2, 0));
  const bud = c.createLinearGradient(0, .2, 0, -1);
  if (eng) {
    bud.addColorStop(0, hsla(h, s, l * .5, .45));
    bud.addColorStop(1, hsla(h, s, l * .5, .08));
  } else {
    bud.addColorStop(0, hsla(h, s + 6, l * .72));
    bud.addColorStop(.6, hsla(h, s, l));
    bud.addColorStop(1, hsla(h, s - 8, l + (100 - l) * .25));
  }
  const berry = [0, 1].map(k => {
    const g = c.createRadialGradient(-.32, -.36, .02, 0, 0, 1);
    if (eng) {
      g.addColorStop(0, hsla(h, s, l, 0));
      g.addColorStop(1, hsla(h, s, l * .6, .5));
    } else {
      g.addColorStop(0, hsla(h, s - 20, Math.min(92, l + 38)));
      g.addColorStop(.3, hsla(h, s + 6, l * (1 + k * .08)));
      g.addColorStop(1, hsla(h, s + 6, l * .5));
    }
    return g;
  });
  return {
    ver,
    grads,
    edge: eng ? hsla(h, s, l * .55, .95) : hsla(h, s + 6, l * .48, .55),
    vein: eng ? hsla(h, s, l * .55, .75) : hsla(h, s, l * .55, .26),
    shade: hsla(h, s + 4, l * .35, .04),
    ew: clamp(f.size * .028, .6, 1.5) * (eng ? 1.5 : 1),
    vw: clamp(f.size * .016, .4, .9) * (eng ? 1.3 : 1),
    centre,
    centreEdge: eng ? hsla(h, s, l * .5, .95) : hsla(28, 70, 22, .6),
    florets: eng ? hsla(h, s, l * .5, .7) : f.species === 'sunflower' ? hsla(40, 85, 52, .7) : hsla(36, 70, 30, .5),
    dark: eng ? hsla(h, s, l * .55, .85) : hsla(h, 15, 8),
    sepalEdge: leaf.edge,
    bud,
    drop: dropGrad,
    swatch: hsla(h, s, l * (f.species === 'lily' ? .6 : .85), .8),
    flat: hsla(h, s, l),
    berry
  };
}
/** One leaf, from its base at the origin along +x, `size` px long. */
export function drawLeaf(c: Ctx, kind: LeafKind, lk: LeafLook, size: number, eng: boolean) {
  const lw = clamp(size * .035, .6, 1.4) / size;
  const compound = kind === 'trifoil' ? [[-.62, .6], [0, .72], [.62, .6]] : kind === 'pinnate' ? [[-.55, .3], [.55, .3], [-.5, .32], [.5, .32], [-.4, .3], [.4, .3], [0, .42]] : null;
  c.save();
  c.scale(size, size);
  if (compound) {
    c.lineWidth = lw * 1.4;
    c.strokeStyle = lk.stemDark;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(kind === 'trifoil' ? .34 : .94, 0);
    c.stroke();
    compound.forEach(([ang, sc], i) => {
      c.save();
      const at = kind === 'trifoil' ? .34 : .14 + (i >> 1) * .27;
      if (kind === 'trifoil' && i === 1) c.translate(.3, 0);else c.translate(at, 0);
      c.rotate(kind === 'trifoil' ? ang! * .75 : ang! * (i === 6 ? 0 : 1.1));
      c.scale(sc!, sc!);
      body(c, 'oval', lk, lw / sc!, eng);
      c.restore();
    });
  } else body(c, kind, lk, lw, eng);
  c.restore();
}
function body(c: Ctx, kind: LeafKind, lk: LeafLook, lw: number, eng: boolean) {
  const P = leafShape(kind === 'trifoil' || kind === 'pinnate' ? 'oval' : kind);
  c.fillStyle = eng ? lk.paper : lk.grad;
  c.fill(P.full);
  if (eng) {
    c.fillStyle = lk.grad;
    c.fill(P.full);
  }
  c.fillStyle = lk.dark;
  c.fill(P.upper);
  c.lineWidth = lw;
  c.strokeStyle = lk.edge;
  c.stroke(P.full);
  c.strokeStyle = eng ? lk.ink : lk.vein;
  c.lineWidth = lw * .7;
  c.stroke(eng ? P.veins : P.veins);
  c.strokeStyle = lk.mid;
  c.lineWidth = lw * 1.1;
  c.stroke(P.mid);
}
export function drawThorn(c: Ctx, lk: LeafLook, size: number) {
  c.fillStyle = lk.stemDark;
  c.beginPath();
  c.moveTo(-size * .5, 0);
  c.quadraticCurveTo(0, -size * .3, size * .1, -size * 1.2);
  c.quadraticCurveTo(size * .3, -size * .3, size * .6, 0);
  c.fill();
}
/** A bud body with sepals wrapped round it; `grow` 0..1. */
function drawBud(c: Ctx, lk: FlowerLook, R: number, grow: number, alpha: number) {
  c.save();
  c.globalAlpha *= alpha;
  c.scale(R * (.7 + .3 * grow), R * (.7 + .3 * grow));
  c.fillStyle = lk.bud;
  c.fill(shared().bud);
  c.lineWidth = 1.2 / R;
  c.strokeStyle = lk.edge;
  c.stroke(shared().bud);
  c.strokeStyle = lk.vein;
  c.stroke(shared().budLines);
  c.restore();
}
function sepals(c: Ctx, lk: FlowerLook, leaf: LeafLook, R: number, n: number, spread: number, rot: number, eng: boolean) {
  const P = leafShape('lance');
  for (let i = 0; i < n; i++) {
    c.save();
    c.rotate(rot + (i - (n - 1) / 2) * spread);
    c.scale(R, R);
    c.fillStyle = eng ? leaf.paper : leaf.grad;
    c.fill(P.full);
    if (eng) {
      c.fillStyle = leaf.grad;
      c.fill(P.full);
    }
    c.fillStyle = leaf.dark;
    c.fill(P.upper);
    c.lineWidth = 1.1 / R;
    c.strokeStyle = lk.sepalEdge;
    c.stroke(P.full);
    c.restore();
  }
}
/** The whole flower at the origin. `o` is how open it is (0 closed .. 1 open, a little over for the overshoot). */
export function drawFlower(c: Ctx, f: Flower, lk: FlowerLook, leaf: LeafLook, o: number, t: number, shiver: number, eng: boolean) {
  const sp = SPECIES[f.species],
    R = f.size;
  if (R < .5 || o <= 0) return;
  if (f.species === 'berry') {
    drawBerries(c, f, lk, leaf, o, eng);
    return;
  }
  const bud = f.bud ? 1 : 1 - smooth((o - .06) / .34),
    bloom = f.bud ? 0 : smooth((o - .08) / .22);
  if (sp.calyx) sepals(c, lk, leaf, R * (.52 + .16 * bud), sp.calyx, TAU / sp.calyx, 0, eng);
  if (bloom > 0) {
    const a0 = c.globalAlpha;
    c.globalAlpha = a0 * bloom;
    const rings = sp.rings,
      nR = rings.length;
    for (let k = 0; k < nR; k++) {
      const [n0, len, wid, cup] = rings[k]!;
      const rd = f.rings[k]!,
        n = Math.max(3, n0 + rd.dn);
      const ok = clamp(o / .92 * (1 + nR * .11) - k * .11, 0, 1.08);
      if (ok <= .01) continue;
      const L = R * len * (.32 + .68 * Math.min(ok, 1.04)) * (1 - cup * .1 * (1 - ok));
      const P = petalOf(sp.shape, wid);
      if (f.species === 'peony' && k === nR - 2) stamens(c, lk, R * .26 * Math.min(o, 1), eng);
      if (!eng && k > 0 && !sp.side && n0 < 12 && wid > .42) {
        c.save();
        c.scale(L * 1.12, L * 1.12);
        c.fillStyle = lk.drop;
        c.beginPath();
        c.arc(0, 0, 1, 0, TAU);
        c.fill();
        c.restore();
      }
      const lily = f.species === 'lily';
      for (let i = 0; i < n; i++) {
        const jit = hash(f.seed + k * 31 + i * 7);
        const a = sp.side ? -Math.PI / 2 + (i - (n - 1) / 2) * (.14 + .44 * ok - k * .1) : rd.off + i * TAU / n + (jit - .5) * .5 * TAU / n + (1 - Math.min(ok, 1)) * (k % 2 ? .6 : -.6) + shiver * Math.sin(t * 36 + i * 1.7 + k);
        const peony = f.species === 'peony',
          lj = L * (peony ? .84 + .3 * hash(f.seed + i * 3 + k) : .92 + .16 * hash(f.seed + i * 3 + k));
        c.save();
        c.rotate(a);
        c.scale(lj, lj * (1 + (hash(f.seed + i * 5 + k * 9) - .5) * (peony ? .36 : .14)));
        if (eng) {
          c.fillStyle = leaf.paper;
          c.fill(P.full);
          c.lineWidth = 1.25 / lj;
          c.strokeStyle = lk.edge;
          c.stroke(P.full);
          c.save();
          c.clip(P.half);
          c.lineWidth = .5 / lj;
          c.stroke(arcsOf(Math.max(.05, Math.round(8 / lj * 100) / 100)));
          c.stroke(P.hatchB);
          c.restore();
          c.lineWidth = .6 / lj;
          c.stroke(P.rib);
          c.restore();
          continue;
        }
        c.fillStyle = lk.grads[k]!;
        c.fill(P.full);
        if (!eng) {
          c.fillStyle = lk.shade;
          c.fill(P.half);
        }
        if (lily) {
          c.fillStyle = lk.swatch;
          c.fill(shared().spots);
        }
        c.lineWidth = lk.ew / lj;
        c.strokeStyle = lk.edge;
        c.stroke(P.full);
        c.lineWidth = lk.vw / lj;
        c.strokeStyle = lk.vein;
        c.stroke(eng ? P.veins2 : P.veins);
        c.restore();
      }
    }
    c.globalAlpha = a0;
  }
  if (bloom > .3 && sp.centre !== 'none') {
    c.save();
    const cr = R * (sp.core ?? .3) * (.5 + .5 * Math.min(o, 1));
    c.globalAlpha *= clamp((bloom - .3) / .5);
    switch (sp.centre) {
      case 'spiral':
        c.scale(R * .5 * Math.min(o, 1), R * .5 * Math.min(o, 1));
        if (eng) {
          c.fillStyle = leaf.paper;
          c.beginPath();
          c.arc(0, 0, .46, 0, TAU);
          c.fill();
        }
        c.lineWidth = (eng ? 1.2 : 1.3) / (R * .5);
        c.strokeStyle = lk.edge;
        c.stroke(shared().spiral);
        break;
      case 'dome':
      case 'disk':
        c.scale(cr, cr);
        c.fillStyle = lk.centre;
        c.beginPath();
        c.arc(0, 0, 1, 0, TAU);
        c.fill();
        c.fillStyle = lk.florets;
        c.fill(sp.centre === 'disk' ? shared().disk : shared().dome);
        c.lineWidth = 1.2 / cr;
        c.strokeStyle = lk.centreEdge;
        c.stroke(new Path2D('M1 0A1 1 0 1 1 -1 0A1 1 0 1 1 1 0'));
        break;
      case 'pod':
        c.scale(cr, cr);
        c.fillStyle = lk.centre;
        c.beginPath();
        c.arc(0, 0, 1, 0, TAU);
        c.fill();
        c.strokeStyle = lk.florets;
        c.lineWidth = .06;
        c.stroke(shared().rayLines);
        c.fillStyle = lk.dark;
        c.fill(shared().ring);
        break;
      case 'stamens': {
        stamens(c, lk, R * (sp.core ?? .5) * Math.min(o, 1), eng);
        break;
      }
      case 'lily': {
        const sr = R * .55 * Math.min(o, 1);
        c.scale(sr, sr);
        c.lineWidth = 1.2 / sr;
        c.strokeStyle = eng ? lk.dark : hsla(40, 40, 70, .9);
        c.stroke(shared().filaments);
        c.fillStyle = eng ? lk.dark : hsla(18, 70, 33);
        c.fill(shared().anthers);
        break;
      }
    }
    c.restore();
  }
  if (bud > 0) {
    drawBud(c, lk, R, o / .4, f.bud ? 1 : bud);
    c.save();
    c.globalAlpha *= Math.max(bud, f.bud ? 1 : .2);
    c.translate(0, R * .12);
    sepals(c, lk, leaf, R * .78 * (.7 + .3 * bud), 5, .5, -Math.PI / 2, eng);
    c.restore();
  }
}
function stamens(c: Ctx, lk: FlowerLook, sr: number, eng: boolean) {
  c.save();
  c.scale(sr, sr);
  c.lineWidth = .8 / sr;
  c.strokeStyle = eng ? lk.dark : hsla(44, 70, 62, .85);
  c.stroke(shared().filaments);
  c.fillStyle = eng ? lk.dark : hsla(42, 92, 54);
  c.fill(shared().anthers);
  c.restore();
}
function drawBerries(c: Ctx, f: Flower, lk: FlowerLook, leaf: LeafLook, o: number, eng: boolean) {
  const n = 5 + Math.floor(hash(f.seed) * 4),
    R = f.size;
  c.save();
  c.globalAlpha *= clamp(o * 3);
  for (let i = 0; i < n; i++) {
    const a = i * 2.399 + hash(f.seed + i) * .4,
      d = Math.sqrt((i + .5) / n) * R * 1.3,
      r = R * (.62 + .2 * hash(f.seed + i * 5)) * Math.min(1, o * 1.4);
    c.save();
    c.translate(Math.cos(a) * d, Math.sin(a) * d);
    c.scale(r, r);
    c.beginPath();
    c.arc(0, 0, 1, 0, TAU);
    c.fillStyle = eng ? leaf.paper : lk.berry[i & 1]!;
    c.fill();
    if (eng) {
      c.fillStyle = lk.berry[i & 1]!;
      c.fill();
    }
    c.lineWidth = 1 / r;
    c.strokeStyle = lk.edge;
    c.stroke();
    if (!eng) {
      c.fillStyle = 'rgba(255,255,255,.55)';
      c.beginPath();
      c.ellipse(-.38, -.42, .2, .12, -.6, 0, TAU);
      c.fill();
    }
    c.restore();
  }
  c.restore();
}

/** The animated canvas: layout, growth, wind, pointer, typing and withering. One requestAnimationFrame loop that only runs while something moves. */
export type EngineProps = {
  text: string;
  font: string;
  fontUrl: string;
  palette: Palette;
  motion: string;
  seed: number;
  density: number;
  speed: number;
  wind: number;
  mix: string;
  vine: string;
  size: number;
  paused: boolean;
  replay: number;
};
export type Engine = {
  update(props: EngineProps): void;
  destroy(): void;
  /** Resolves once the font is loaded and the first layout exists. */
  ready(): Promise<void>;
  /** Manual engines only (no loop, the canvas is sized by the caller): move the clock on by `dt` seconds and draw. */
  advance(dt: number): void;
};
const W = 1400,
  H = 1050,
  OY = 145,
  MAX_PIXELS = 3.4e6,
  MAX_PARTICLES = 72;
const loaded = new Map<string, Promise<boolean>>();
function loadFont(family: string, url: string): Promise<boolean> {
  let hit = loaded.get(family + url);
  if (!hit) {
    hit = new Promise<boolean>(done => {
      try {
        const face = new FontFace(family, `url(${JSON.stringify(url)})`);
        face.load().then(f => {
          document.fonts.add(f);
          done(true);
        }, () => done(false));
      } catch {
        done(false);
      }
    });
    loaded.set(family + url, hit);
  }
  return hit;
}
const segment = (text: string) => typeof Intl !== 'undefined' && 'Segmenter' in Intl ? Array.from(new Intl.Segmenter('en', {
  granularity: 'grapheme'
}).segment(text), s => s.segment) : Array.from(text);
/** The outline of the bottom-most piece of a glyph, clockwise, in ems (Moore neighbour tracing of a bitmap). */
function glyphOutline(font: string, char: string): number[] | undefined {
  const S = 240,
    PX = 40,
    BY = 270;
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 380;
  const g = c.getContext('2d', {
    willReadFrequently: true
  });
  if (!g) return undefined;
  g.font = `${S}px ${font}`;
  g.fillStyle = '#fff';
  g.fillText(char, PX, BY);
  const w = c.width,
    h = c.height,
    data = g.getImageData(0, 0, w, h).data;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3]! > 127;
  let sx = -1,
    sy = -1;
  for (let y = h - 1; y >= 0 && sx < 0; y--) for (let x = 0; x < w; x++) if (on(x, y) && !on(x - 1, y)) {
    sx = x;
    sy = y;
    break;
  }
  if (sx < 0) return undefined;
  const dx = [-1, -1, 0, 1, 1, 1, 0, -1],
    dy = [0, -1, -1, -1, 0, 1, 1, 1];
  const pts: number[] = [sx, sy];
  let x = sx,
    y = sy,
    back = 0;
  for (let step = 0; step < 9000; step++) {
    let moved = false;
    for (let k = 1; k <= 8; k++) {
      const i = (back + k) % 8,
        nx = x + dx[i]!,
        ny = y + dy[i]!;
      if (on(nx, ny)) {
        const pi = (back + k - 1) % 8,
          px = x + dx[pi]!,
          py = y + dy[pi]!;
        x = nx;
        y = ny;
        for (let j = 0; j < 8; j++) if (x + dx[j]! === px && y + dy[j]! === py) {
          back = j;
          break;
        }
        moved = true;
        break;
      }
    }
    if (!moved || x === sx && y === sy) break;
    pts.push(x, y);
  }
  if (pts.length < 40) return undefined;
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) out.push((pts[i]! - PX) / S, (pts[i + 1]! - BY) / S);
  return out;
}
type Rt = {
  d: Float32Array;
  lean: number;
  burst: boolean;
};
type Ghost = {
  plants: Plant[];
  vines: Vine[];
  at: number;
  dx: number;
};
/** `manual`: no animation loop, observers or pointer; the caller sets the canvas size and steps the clock with `advance` (the offline video export). */
export function createEngine(canvas: HTMLCanvasElement, manual = false): Engine {
  const ctx = canvas.getContext('2d')!;
  const measure = document.createElement('canvas').getContext('2d')!;
  let props: EngineProps | undefined;
  let family = '',
    fontCss = '',
    ready = false,
    fontToken = 0;
  let letters: Letter[] = [],
    nextId = 100,
    comp: Composition | undefined,
    compKey = '';
  const births = new Map<number, number>(),
    offX = new Map<number, number>();
  let ghosts: Ghost[] = [];
  const rts = new Map<string, Rt>();
  const looks = new WeakMap<Flower, FlowerLook>();
  let leafLook: LeafLook | undefined,
    palKey = '',
    palVer = 0;
  const outlines = new Map<string, number[] | undefined>();
  let asc = .7,
    xh = .45;
  let t = 0,
    last = 0,
    raf = 0,
    visible = true,
    reduced = false,
    settleAt = 0,
    lastReplay = -1,
    gw = 0;
  let cssW = 0,
    cssH = 0,
    scale = 1,
    offY = 0,
    padX = 0,
    vignette: CanvasGradient | undefined,
    grain: CanvasPattern | null = null,
    grainFor = '';
  const readyWaiters: (() => void)[] = [];
  let drawMs = 0,
    frames = 0;
  let px = -9999,
    py = -9999,
    pointerOn = 0;
  const par = {
    x: new Float32Array(MAX_PARTICLES),
    y: new Float32Array(MAX_PARTICLES),
    vx: new Float32Array(MAX_PARTICLES),
    vy: new Float32Array(MAX_PARTICLES),
    r: new Float32Array(MAX_PARTICLES),
    vr: new Float32Array(MAX_PARTICLES),
    s: new Float32Array(MAX_PARTICLES),
    age: new Float32Array(MAX_PARTICLES),
    life: new Float32Array(MAX_PARTICLES),
    col: new Array<string>(MAX_PARTICLES).fill(''),
    live: 0
  };
  const petal = new Path2D('M0 0C.1 -.5 .7 -.55 1 0C.7 .55 .1 .5 0 0Z');
  const emit = (x: number, y: number, col: string, n: number, spread = 1) => {
    if (reduced) return;
    for (let k = 0; k < n; k++) {
      let i = -1;
      for (let j = 0; j < MAX_PARTICLES; j++) if (par.life[j]! <= par.age[j]!) {
        i = j;
        break;
      }
      if (i < 0) return;
      par.x[i] = x + (hash(t * 7 + k) - .5) * 14 * spread;
      par.y[i] = y + (hash(t * 3 + k * 2) - .5) * 8;
      par.vx[i] = (hash(t * 5 + k * 3) - .5) * 70 * spread;
      par.vy[i] = -30 - hash(t * 11 + k) * 40;
      par.r[i] = hash(t + k) * TAU;
      par.vr[i] = (hash(t * 2 + k) - .5) * 6;
      par.s[i] = 7 + hash(t * 13 + k) * 6;
      par.age[i] = 0;
      par.life[i] = 1.6 + hash(t * 17 + k) * 1.4;
      par.col[i] = col;
      par.live++;
    }
  };
  const gustK = () => props?.motion === 'Gust' ? 2.4 : .5;
  const windAt = (x: number) => Math.sin(t * .9 + x * .0032) * .7 + Math.sin(t * 1.7 + x * .0071 + 2) * .3 + Math.pow(Math.max(0, Math.sin((t * (props?.motion === 'Gust' ? .62 : .42) - x / W * 1.1) * TAU)), 8) * gustK();
  function lookOf(f: Flower): FlowerLook {
    let lk = looks.get(f);
    if (!lk || lk.ver !== palVer) {
      lk = flowerLookOf(ctx, f, props!.palette, leafLook!, palVer);
      looks.set(f, lk);
    }
    return lk;
  }
  function outline(char: string) {
    const key = family + char;
    if (!outlines.has(key)) outlines.set(key, glyphOutline(fontCss, char));
    return outlines.get(key);
  }
  function rebuild(p: EngineProps) {
    const key = [letters.map(l => l.id + l.char).join(), p.seed, p.density, p.mix, p.vine, p.size, ready, family].join('|');
    if (key === compKey) return;
    compKey = key;
    measure.font = fontCss;
    const adv: number[] = [];
    let prev = 0;
    for (let i = 1; i <= letters.length; i++) {
      const wd = measure.measureText(letters.slice(0, i).map(l => l.char).join('')).width;
      adv.push(wd - prev);
      prev = wd;
    }
    if (!ready) adv.fill(210);
    let call = 0;
    const old = comp;
    comp = generate(letters, p.seed, p.density, () => adv[call++] ?? 200, {
      mix: p.mix,
      vine: p.vine,
      size: p.size,
      asc,
      xh,
      outline: ready ? outline : undefined
    });
    if (old) {
      // letters already on the page slide to their new place; a new one starts with its neighbour's offset, so they never collide
      let carry = 0;
      for (const l of comp.letters) {
        const was = old.letters.find(o => o.id === l.id);
        if (was) {
          carry = (offX.get(l.id) ?? 0) + was.x - l.x;
          offX.set(l.id, carry);
        } else offX.set(l.id, carry);
      }
    }
    const alive = new Set<string>();
    for (const pl of comp.plants) {
      alive.add(pl.id);
      if (!rts.has(pl.id)) rts.set(pl.id, {
        d: new Float32Array(STEM_N * 3),
        lean: 0,
        burst: false
      });
    }
    for (const k of rts.keys()) if (!alive.has(k)) rts.delete(k);
    canvas.dataset.composition = comp.fingerprint;
  }
  function setLetters(p: EngineProps, first: boolean) {
    const next = segment(p.text).slice(0, 28);
    const prev = letters;
    letters = reconcile(prev, next, () => nextId++);
    const keep = new Set(letters.map(l => l.id));
    if (!first && comp && !reduced) {
      const gone = prev.filter(l => !keep.has(l.id)).map(l => l.id);
      if (gone.length) ghosts.push({
        plants: comp.plants.filter(pl => gone.includes(pl.letter)),
        vines: comp.vines.filter(v => gone.includes(v.letter)),
        at: t,
        dx: 0
      });
    }
    let fresh = 0;
    for (const l of letters) if (!births.has(l.id)) births.set(l.id, t + (first ? .3 + fresh++ * .155 : fresh++ * .12));
    for (const id of births.keys()) if (!keep.has(id)) {
      births.delete(id);
      offX.delete(id);
    }
  }
  function applyPalette(p: EngineProps) {
    const key = JSON.stringify(p.palette);
    if (key !== palKey) {
      palKey = key;
      palVer++;
      leafLook = leafLookOf(ctx, p.palette, palVer);
      grainFor = '';
    }
  }
  function sizeCanvas() {
    if (manual) {
      cssW = canvas.width;
      cssH = canvas.height;
      // a video's wide frame crops the stage's empty top and bottom a little, so the word is as big as it can be
      scale = Math.min(canvas.width / W, canvas.height / (H * .78));
      offY = (canvas.height - H * scale) / 2;
      padX = (canvas.width - W * scale) / 2;
      return true;
    }
    const r = canvas.getBoundingClientRect();
    cssW = r.width;
    cssH = r.height;
    if (cssW < 2 || cssH < 2) return false;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    dpr = Math.min(dpr, Math.sqrt(MAX_PIXELS / (cssW * cssH)));
    const w = Math.round(cssW * dpr),
      h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      vignette = undefined;
    }
    scale = Math.min(w / W, h / H);
    offY = (h - H * scale) / 2;
    padX = (w - W * scale) / 2;
    return true;
  }
  function ground(w: number, h: number) {
    const pal = props!.palette;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.background;
    ctx.fillRect(0, 0, w, h);
    if (!vignette) {
      vignette = ctx.createRadialGradient(w / 2, h * .48, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .75);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,.09)');
    }
    if (!pal.engraved && !pal.plain) {
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }
    const dark = isDark(pal.background);
    if (grainFor !== String(dark)) {
      grainFor = String(dark);
      const g = document.createElement('canvas');
      g.width = g.height = 96;
      const gc = g.getContext('2d')!,
        img = gc.createImageData(96, 96);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = dark ? 255 : 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = Math.floor(hash(i * .37) * (pal.engraved ? 26 : 14));
      }
      gc.putImageData(img, 0, 0);
      grain = ctx.createPattern(g, 'repeat');
    }
    if (grain && !pal.plain) {
      ctx.fillStyle = grain;
      ctx.fillRect(0, 0, w, h);
    }
  }
  /** Where each plant stands this frame. */
  function drawPlant(p: Plant, k: {
    age: number;
    life: number;
    wither: number;
  }, dt: number, dx: number) {
    const rt = rts.get(p.id);
    if (!rt) return;
    const pr = props!,
      eng = pr.palette.engraved,
      lk = leafLook!,
      f = p.flower;
    const a = k.age,
      life = k.life,
      grow = easeOutCubic(a / .72) * clamp(life * 1.2),
      open = easeOutBack((a - .5 - p.delay * .2) / .45) * f.open * smooth((life - .25) / .5);
    if (grow <= .002) return;
    const tipX = p.pts[(STEM_N - 1) * 3]!,
      tipY = p.pts[(STEM_N - 1) * 3 + 1]!;
    // wind, the pointer's push and the sway all bend the stem toward its tip
    let bend = reduced ? 0 : windAt(tipX + dx) * pr.wind * 24 * Math.min(1, grow * 1.2) * (1 - k.wither * .5);
    let shiver = 0;
    if (!reduced && pointerOn > .01) {
      const ddx = tipX + dx - px,
        ddy = tipY - py,
        inf = Math.exp(-(ddx * ddx + ddy * ddy) / 30000) * pointerOn;
      rt.lean += ((ddx >= 0 ? 1 : -1) * inf * 46 - rt.lean) * (1 - Math.exp(-dt * 6));
      shiver = inf * .07;
    } else rt.lean *= Math.exp(-dt * 4);
    bend += rt.lean;
    const d = rt.d;
    for (let i = 0; i < STEM_N; i++) {
      const u = i / (STEM_N - 1),
        s = bend * Math.pow(u, 2.6);
      d[i * 3] = p.pts[i * 3]! + s;
      d[i * 3 + 1] = p.pts[i * 3 + 1]! - Math.abs(s) * .1 * u + k.wither * u * u * 30;
    }
    for (let i = 0; i < STEM_N; i++) {
      const a0 = Math.max(0, i - 1),
        a1 = Math.min(STEM_N - 1, i + 1);
      d[i * 3 + 2] = Math.atan2(d[a1 * 3 + 1]! - d[a0 * 3 + 1]!, d[a1 * 3]! - d[a0 * 3]!);
    }
    const reach = grow * (STEM_N - 1),
      whole = Math.floor(reach),
      frac = reach - whole;
    const at = (t01: number, out: [number, number, number]) => {
      const q = clamp(t01) * (STEM_N - 1),
        i = Math.min(STEM_N - 2, Math.floor(q)),
        e = q - i;
      out[0] = d[i * 3]! + (d[i * 3 + 3]! - d[i * 3]!) * e;
      out[1] = d[i * 3 + 1]! + (d[i * 3 + 4]! - d[i * 3 + 1]!) * e;
      out[2] = d[i * 3 + 2]! + (d[i * 3 + 5]! - d[i * 3 + 2]!) * e;
    };
    const pt: [number, number, number] = [0, 0, 0];
    ctx.save();
    ctx.translate(dx, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(d[0]!, d[1]!);
    for (let i = 1; i <= whole && i < STEM_N; i++) ctx.lineTo(d[i * 3]!, d[i * 3 + 1]!);
    if (whole < STEM_N - 1) ctx.lineTo(d[whole * 3]! + (d[whole * 3 + 3]! - d[whole * 3]!) * frac, d[whole * 3 + 1]! + (d[whole * 3 + 4]! - d[whole * 3 + 1]!) * frac);
    ctx.strokeStyle = lk.stemDark;
    ctx.lineWidth = p.width + (eng ? .6 : 1.4);
    ctx.stroke();
    ctx.strokeStyle = lk.stem;
    ctx.lineWidth = Math.max(1, p.width - (eng ? .6 : .2));
    ctx.stroke();
    if (!eng) {
      ctx.translate(-p.width * .18, -p.width * .1);
      ctx.strokeStyle = lk.stemLight;
      ctx.lineWidth = p.width * .3;
      ctx.stroke();
      ctx.translate(p.width * .18, p.width * .1);
    }
    for (let n = 0; n < p.thorns.length; n++) {
      const tt = p.thorns[n]!;
      if (grow < tt + .04) continue;
      at(tt, pt);
      ctx.save();
      ctx.translate(pt[0], pt[1]);
      ctx.rotate(pt[2] + (n % 2 ? 1 : -1) * Math.PI / 2 + Math.PI / 2);
      drawThorn(ctx, lk, p.width * 1.7 * clamp((grow - tt) / .1));
      ctx.restore();
    }
    for (const td of p.tendrils) {
      const g = easeOutCubic((grow - td.t) / .4);
      if (g > .01) {
        at(td.t, pt);
        const i = Math.round(td.t * (STEM_N - 1)),
          ox = pt[0] - p.pts[i * 3]!,
          oy = pt[1] - p.pts[i * 3 + 1]!,
          pts = td.pts,
          n = Math.floor(pts.length / 2 * g);
        ctx.beginPath();
        ctx.moveTo(pts[0]! + ox, pts[1]! + oy);
        for (let j = 1; j < n; j++) ctx.lineTo(pts[j * 2]! + ox + Math.sin(t * 2 + j * .2 + p.phase) * (reduced ? 0 : pr.wind * .8) * j * .05, pts[j * 2 + 1]! + oy);
        ctx.strokeStyle = lk.stem;
        ctx.lineWidth = Math.max(1, p.width * .55);
        ctx.stroke();
      }
    }
    for (const leaf of p.leaves) {
      const g = smooth((grow - leaf.t) / .2);
      if (g <= 0) continue;
      at(leaf.t, pt);
      const wv = reduced ? 0 : windAt(pt[0] + dx);
      const flutter = reduced ? 0 : wv * .09 * pr.wind + Math.sin(t * (4.6 + leaf.phase % 2.5) + leaf.phase) * .05 * (.3 + pr.wind) * (1 + Math.max(0, wv));
      ctx.save();
      ctx.translate(pt[0], pt[1]);
      ctx.rotate(pt[2] + leaf.side * (leaf.angle * Math.PI / 180 + (1 - g) * .8) + flutter + k.wither * leaf.side * .6);
      drawLeaf(ctx, p.leaf, lk, leaf.size * g, eng);
      ctx.restore();
    }
    ctx.restore();
    // the head
    const o = open;
    if (o > 0 && f.size > 0) {
      const lkf = lookOf(f);
      const breath = reduced ? 1 : 1 + .022 * Math.sin(t * 1.25 + p.phase) * (pr.motion === 'Breathe' ? 1.3 : .7);
      ctx.save();
      ctx.translate(dx + d[(STEM_N - 1) * 3]!, d[(STEM_N - 1) * 3 + 1]!);
      ctx.rotate(f.rot * Math.PI / 180 + bend * -.006 + k.wither * 1.1);
      const sc = breath * (1 - k.wither * .3);
      ctx.scale(sc, sc * f.aspect);
      ctx.globalAlpha = alphaOf(pr.palette.flower) * (1 - k.wither * .5);
      drawFlower(ctx, f, lkf, leafLook!, o, t, shiver, eng);
      ctx.restore();
      if (!rt.burst && o > f.open * .98 && f.open > .8) {
        rt.burst = true;
        emit(dx + d[(STEM_N - 1) * 3]!, d[(STEM_N - 1) * 3 + 1]!, lkf.flat, 3);
      }
    }
  }
  function drawVine(v: Vine, age: number, dx: number, pass: 'back' | 'front', wither: number) {
    const lk = leafLook!,
      eng = props!.palette.engraved;
    const n = v.pts.length / 2,
      gv = easeOutCubic((age - v.delay * .3) / .8),
      m = Math.floor(gv * (n - 1));
    if (m < 1) return;
    ctx.save();
    ctx.translate(dx, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const run = (from: number, to: number) => {
      ctx.beginPath();
      ctx.moveTo(v.pts[from * 2]!, v.pts[from * 2 + 1]!);
      for (let i = from + 1; i <= to; i++) ctx.lineTo(v.pts[i * 2]!, v.pts[i * 2 + 1]!);
    };
    const stroke = () => {
      ctx.strokeStyle = lk.stemDark;
      ctx.lineWidth = v.width + 1.2;
      ctx.stroke();
      ctx.strokeStyle = lk.stem;
      ctx.lineWidth = Math.max(1, v.width - (eng ? .5 : 0));
      ctx.stroke();
    };
    if (pass === 'back') {
      run(0, m);
      stroke();
    } else {
      let i = 0;
      while (i < m) {
        if (v.front[i] && v.front[i + 1]) {
          let j = i + 1;
          while (j < m && v.front[j + 1]) j++;
          run(i, Math.min(j, m));
          stroke();
          i = j;
        } else i++;
      }
    }
    {
      for (const lf of v.leaves) {
        if (lf.i > m || !!v.front[lf.i] !== (pass === 'front')) continue;
        const g = smooth((m - lf.i) / 5);
        const i = lf.i,
          ang = Math.atan2(v.pts[i * 2 + 1]! - v.pts[i * 2 - 1]!, v.pts[i * 2]! - v.pts[i * 2 - 2]!);
        const fl = reduced ? 0 : Math.sin(t * 5 + lf.phase) * .07 * (.3 + props!.wind) + windAt(v.pts[i * 2]!) * .06 * props!.wind;
        ctx.save();
        ctx.translate(v.pts[i * 2]!, v.pts[i * 2 + 1]!);
        ctx.rotate(ang + lf.side * 1.05 + fl);
        drawLeaf(ctx, v.leaf, lk, lf.size * g * (1 - wither * .5), eng);
        ctx.restore();
      }
    }
    if (pass === 'back') {
      const c = easeOutCubic((age - .72) / .28);
      if (c > .01 && m >= n - 2) {
        const k = Math.floor(v.curl.length / 2 * c);
        ctx.beginPath();
        ctx.moveTo(v.curl[0]!, v.curl[1]!);
        for (let i = 1; i < k; i++) ctx.lineTo(v.curl[i * 2]!, v.curl[i * 2 + 1]!);
        ctx.strokeStyle = lk.stem;
        ctx.lineWidth = Math.max(1, v.width * .8);
        ctx.stroke();
      }
      for (const b of v.blooms) {
        if (m < b.i) continue;
        const o = easeOutBack((age - .55 - b.i / n * .25) / .3) * b.flower.open;
        if (o <= 0) continue;
        const lkf = lookOf(b.flower),
          bx = v.pts[b.i * 2]!,
          by = v.pts[b.i * 2 + 1]!;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(b.flower.rot * Math.PI / 180 + Math.sin(t * 1.3 + b.i) * (reduced ? 0 : .05 * props!.wind));
        ctx.scale(1 - wither * .3, (1 - wither * .3) * b.flower.aspect);
        ctx.globalAlpha = alphaOf(props!.palette.flower) * (1 - wither * .5);
        drawFlower(ctx, b.flower, lkf, lk, o, t, 0, eng);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function state(plant: {
    letter: number;
    index: number;
  }, born: number | undefined, dur: number) {
    const b = born ?? t;
    const age = reduced ? 1 : Math.max(0, (t - b) / dur);
    let life = 1,
      wither = 0;
    if (gw > .001 && !reduced) {
      const ph = Math.max(0, t - settleAt - plant.index * .32);
      const cycle = 1 - .94 * Math.pow(Math.sin(ph * Math.PI / 8), 2);
      life = 1 + (cycle - 1) * gw;
      wither = gw * (1 - smooth((cycle - .1) / .6));
    }
    return {
      age,
      life,
      wither
    };
  }
  function frame(now: number) {
    raf = 0;
    const p = props;
    if (!p || !sizeCanvas()) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : .016;
    last = now;
    if (!p.paused && !reduced) t += dt;
    const began = performance.now();
    render(dt);
    drawMs += (performance.now() - began - drawMs) * .05;
    if (++frames % 30 === 0) canvas.dataset.drawMs = drawMs.toFixed(2);
    if (shouldRun()) raf = requestAnimationFrame(frame);else last = 0;
  }
  function shouldRun() {
    if (!props || reduced || !visible || document.hidden) return false;
    if (props.paused) return false;
    return t < settleAt + .6 || props.wind > 0 || gw > .001 || props.motion === 'Grow & Wither' || par.live > 0 || ghosts.length > 0 || pointerOn > .01 || [...offX.values()].some(v => Math.abs(v) > .15);
  }
  function wake() {
    if (!raf && shouldRun()) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }
  // Added for notgui.com: where the lettering sits at rest, as "x baseline width fontSize" in CSS pixels from the
  // canvas's top left, so the page can line its own text up with the drawn word.
  function publishTextBox() {
    const first = comp!.letters[0],
      lastL = comp!.letters[comp!.letters.length - 1];
    if (!first || !lastL || !canvas.width) return;
    const k = cssW / canvas.width;
    const box = [padX + first.x * scale, offY + (comp!.baseline + OY) * scale, (lastL.x + lastL.width - first.x) * scale, comp!.fontSize * scale].map(v => (v * k).toFixed(2)).join(' ');
    if (canvas.dataset.textBox !== box) canvas.dataset.textBox = box;
  }
  function render(dt: number) {
    const p = props!,
      w = canvas.width,
      h = canvas.height;
    gw += ((p.motion === 'Grow & Wither' ? 1 : 0) - gw) * (1 - Math.exp(-dt * 2.2));
    if (Math.abs(gw - (p.motion === 'Grow & Wither' ? 1 : 0)) < .002) gw = p.motion === 'Grow & Wither' ? 1 : 0;
    pointerOn += ((px > -999 ? 1 : 0) - pointerOn) * (1 - Math.exp(-dt * 5));
    for (const [id, v] of offX) {
      const nv = v * Math.exp(-dt * 7);
      offX.set(id, Math.abs(nv) < .05 ? 0 : nv);
    }
    ground(w, h);
    ctx.setTransform(scale, 0, 0, scale, padX, offY);
    if (!ready || !comp) return;
    publishTextBox();
    ctx.translate(0, OY);
    const dur = 2.4 / Math.max(.25, p.speed);
    const pal = p.palette,
      fontPx = comp.fontSize;
    const pts = comp.plants,
      alive: Plant[] = [];
    for (const pl of pts) alive.push(pl);
    // plants behind the lettering, then the vines behind it
    ctx.globalAlpha = 1;
    for (const pl of alive) if (!pl.front) {
      const born = births.get(pl.letter),
        k = state(pl, born, dur);
      ctx.globalAlpha = 1;
      drawPlant(pl, k, dt, offX.get(pl.letter) ?? 0);
    }
    for (const v of comp.vines) {
      const k = state(v, births.get(v.letter), dur);
      ctx.globalAlpha = 1;
      drawVine(v, k.age, offX.get(v.letter) ?? 0, 'back', k.wither);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.text;
    ctx.font = fontCss.replace(/^\d+(\.\d+)?px/, `${fontPx}px`);
    ctx.textBaseline = 'alphabetic';
    for (const l of comp.letters) ctx.fillText(l.char, l.x + (offX.get(l.id) ?? 0), comp.baseline);
    for (const v of comp.vines) {
      const k = state(v, births.get(v.letter), dur);
      ctx.globalAlpha = 1;
      drawVine(v, k.age, offX.get(v.letter) ?? 0, 'front', k.wither);
    }
    for (const pl of alive) if (pl.front) {
      const k = state(pl, births.get(pl.letter), dur);
      ctx.globalAlpha = 1;
      drawPlant(pl, k, dt, offX.get(pl.letter) ?? 0);
    }
    // plants of letters that were deleted wither away and fall
    if (ghosts.length) {
      for (const gh of ghosts) {
        const age = (t - gh.at) / 1.6;
        ctx.globalAlpha = clamp(1 - age * 1.1);
        for (const pl of gh.plants) {
          if (!rts.has(pl.id)) rts.set(pl.id, {
            d: new Float32Array(STEM_N * 3),
            lean: 0,
            burst: true
          });
          if (!gh.dx && age < .05) {
            const lkf = lookOf(pl.flower);
            emit(pl.pts[(STEM_N - 1) * 3]!, pl.pts[(STEM_N - 1) * 3 + 1]!, lkf.flat, 5);
            gh.dx = 1;
          }
          drawPlant(pl, {
            age: 1,
            life: 1 - smooth(age) * .5,
            wither: smooth(age * 1.4)
          }, dt, 0);
        }
        for (const v of gh.vines) drawVine(v, 1, 0, 'back', smooth(age));
      }
      ctx.globalAlpha = 1;
      ghosts = ghosts.filter(g => t - g.at < 1.6);
    }
    // petals that drift down
    if (par.live > 0) {
      const wv = windAt(W / 2);
      par.live = 0;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (par.life[i]! <= par.age[i]!) continue;
        par.age[i]! += dt;
        if (par.life[i]! <= par.age[i]!) continue;
        par.live++;
        par.vy[i]! += 60 * dt;
        par.vx[i]! += wv * 40 * dt * p.wind;
        par.x[i]! += par.vx[i]! * dt + Math.sin(par.age[i]! * 3 + i) * .6;
        par.y[i]! += par.vy[i]! * dt;
        par.r[i]! += par.vr[i]! * dt;
        ctx.save();
        ctx.translate(par.x[i]!, par.y[i]!);
        ctx.rotate(par.r[i]!);
        ctx.scale(par.s[i]!, par.s[i]! * (.4 + .6 * Math.abs(Math.cos(par.age[i]! * 2 + i))));
        ctx.globalAlpha = clamp(1 - par.age[i]! / par.life[i]!) * .9;
        ctx.fillStyle = par.col[i]!;
        ctx.fill(petal);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    if (!letters.length && !manual) {
      ctx.globalAlpha = .35;
      ctx.fillStyle = pal.text;
      ctx.font = `84px ${fontCss.replace(/^\d+(\.\d+)?px /, '')}`;
      ctx.textAlign = 'center';
      ctx.fillText('a word is a beginning', 700, 410);
      ctx.textAlign = 'start';
    }
    ctx.globalAlpha = 1;
  }
  function absorb(p: EngineProps) {
    const font = fontOf(p.font);
    const fam = familyOf(font);
    const firstTime = !props;
    const textChanged = !props || props.text !== p.text;
    const fontChanged = fam !== family;
    const prev = props;
    props = p;
    applyPalette(p);
    if (fontChanged) {
      family = fam;
      ready = false;
      fontCss = `420px "${fam}", serif`;
      const token = ++fontToken;
      loadFont(fam, p.fontUrl).then(() => {
        if (token !== fontToken || !props) return;
        measure.font = fontCss;
        const h = measure.measureText('h').actualBoundingBoxAscent / 420,
          x = measure.measureText('x').actualBoundingBoxAscent / 420;
        asc = h > .3 && h < 1.2 ? h : .7;
        xh = x > .2 && x < .9 ? x : .45;
        ready = true;
        for (const done of readyWaiters.splice(0)) done();
        const b = t + .15;
        letters.forEach((l, i) => births.set(l.id, firstTime || !prev ? b + .15 + i * .155 : (births.get(l.id) ?? b)));
        compKey = '';
        rebuild(props);
        settleAt = Math.max(0, ...births.values()) + 2.4 / Math.max(.25, props.speed);
        paint();
      });
    }
    if (textChanged) setLetters(p, firstTime);
    if (ready) rebuild(p);
    if (lastReplay !== p.replay) {
      if (lastReplay >= 0) {
        letters.forEach((l, i) => births.set(l.id, t + i * .155));
        for (const r of rts.values()) r.burst = false;
        ghosts = [];
      }
      lastReplay = p.replay;
    }
    settleAt = Math.max(0, ...births.values()) + 2.4 / Math.max(.25, p.speed);
    paint();
  }
  function paint() {
    if (!props || manual) return;
    if (!sizeCanvas()) return;
    if (reduced || !visible || props.paused) render(.016);
    wake();
    if (!raf && !reduced) {
      // one still frame when nothing runs
      render(.016);
    }
    canvas.dataset.ready = ready ? '1' : '0';
  }
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = () => {
    reduced = mq.matches;
    paint();
  };
  reduced = !manual && mq.matches;
  if (!manual) mq.addEventListener('change', onMq);
  const io = new IntersectionObserver(es => {
    visible = es.some(e => e.isIntersecting);
    if (visible) paint();
  });
  if (!manual) io.observe(canvas);
  const ro = new ResizeObserver(() => {
    vignette = undefined;
    paint();
  });
  if (!manual) ro.observe(canvas);
  const onVis = () => {
    if (!document.hidden) paint();
  };
  document.addEventListener('visibilitychange', onVis);
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width * canvas.width - padX) / scale;
    py = ((e.clientY - r.top) / r.height * canvas.height - offY) / scale - OY;
    wake();
  };
  const onLeave = () => {
    px = py = -9999;
    wake();
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointercancel', onLeave);
  return {
    update(p) {
      absorb(p);
    },
    ready: () => ready ? Promise.resolve() : new Promise<void>(done => readyWaiters.push(done)),
    advance(dt) {
      if (!props || !ready || !sizeCanvas()) return;
      t += dt;
      render(dt);
    },
    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      props = undefined;
      fontToken++;
      mq.removeEventListener('change', onMq);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onLeave);
    }
  };
}

/** The React side: one canvas, drawn and animated by the engine. SSR renders the empty canvas with its label. */
function BloomDrawing({
  palette,
  motion,
  seed,
  density,
  speed,
  wind,
  text,
  font,
  fontUrl,
  mix,
  vine,
  size,
  replayVersion,
  paused = false
}: {
  palette: Palette;
  motion: string;
  seed: number;
  density: number;
  speed: number;
  wind: number;
  text: string;
  font: string;
  fontUrl: string;
  mix: string;
  vine: string;
  size: number;
  replayVersion: number;
  paused?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | undefined>(undefined);
  useEffect(() => {
    const e = createEngine(ref.current!);
    engine.current = e;
    return () => {
      e.destroy();
      engine.current = undefined;
    };
  }, []);
  const {
    flower,
    stem,
    leaf,
    text: ink,
    background,
    engraved,
    plain
  } = palette;
  useEffect(() => {
    const props: EngineProps = {
      text,
      font,
      fontUrl,
      palette: {
        flower,
        stem,
        leaf,
        text: ink,
        background,
        engraved,
        plain
      },
      motion,
      seed,
      density,
      speed,
      wind,
      mix,
      vine,
      size,
      paused,
      replay: replayVersion
    };
    engine.current?.update(props);
  }, [text, font, fontUrl, flower, stem, leaf, ink, background, engraved, plain, motion, seed, density, speed, wind, mix, vine, size, paused, replayVersion]);
  return <div className="botanical-art" style={{
    background,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    aspectRatio: '4 / 3'
  }}>
  <canvas ref={ref} role="img" aria-label={`${text || 'Your words'}, growing illustrated flowers`} style={{
      display: 'block',
      width: '100%',
      height: '100%',
      touchAction: 'pan-y'
    }} />
 </div>;
}


export const DEFAULTS = {"text":"breathe","font":"Instrument Serif","motion":"Breathe","flowerMix":"Roses","vineStyle":"Curling vines","illustration":"Painted","flowerColour":"#d6ff48","stemColour":"#b69aff","leafColour":"#b69aff","textColour":"#d7f3ff","backgroundColour":"#17132b","bloomSize":1,"growthDensity":0.82,"growthSpeed":1,"windIntensity":0.75,"randomSeed":17};
export interface BloomTypeProps {
  text?: string;
  /** One of the fonts in the list; only the exported one ships with this component (see README). */
  font?: string;
  motion?: 'Breathe' | 'Grow & Wither' | 'Gust';
  flowerMix?: string;
  vineStyle?: string;
  illustration?: 'Painted' | 'Engraved';
  flowerColour?: string;
  stemColour?: string;
  leafColour?: string;
  textColour?: string;
  backgroundColour?: string;
  bloomSize?: number;
  growthDensity?: number;
  growthSpeed?: number;
  windIntensity?: number;
  randomSeed?: number;
  replayVersion?: number;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Added for notgui.com: draw the background as one flat colour, with no vignette or grain. */
  plain?: boolean;
  /** Folder the font files are served from (default /fonts/). */
  fontBase?: string;
  /** Overrides the address of the chosen font's file. */
  fontUrl?: string;
  italicFontUrl?: string;
}
const number = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const oneOf = (value: unknown, list: string[], fallback: string) => typeof value === 'string' && list.includes(value) ? value : fallback;
/** The props as the drawing takes them: defaults filled, numbers clamped, the font's file found. */
export function resolveBloomProps(props: BloomTypeProps) {
  const p = {
    ...DEFAULTS,
    ...(Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)) as BloomTypeProps)
  };
  const face = fontOf(String(p.font));
  return {
    text: Array.from(typeof p.text === 'string' ? p.text : DEFAULTS.text).slice(0, 28).join(''),
    font: face.name,
    fontUrl: face.name === 'Instrument Serif' && props.fontUrl ? props.fontUrl : face.name === 'Instrument Serif Italic' && props.italicFontUrl ? props.italicFontUrl : (props.fontBase ?? '/fonts/') + face.file,
    palette: {
      flower: String(p.flowerColour),
      stem: String(p.stemColour),
      leaf: String(p.leafColour),
      text: String(p.textColour),
      background: String(p.backgroundColour),
      engraved: p.illustration === 'Engraved',
      plain: props.plain === true
    },
    motion: oneOf(p.motion, ['Breathe', 'Grow & Wither', 'Gust'], 'Breathe'),
    mix: String(p.flowerMix),
    vine: String(p.vineStyle),
    size: number(p.bloomSize, 1, .5, 1.8),
    seed: Math.round(number(p.randomSeed, 17, 1, 9999)),
    density: number(p.growthDensity, .82, .25, 1),
    speed: number(p.growthSpeed, 1, .3, 2),
    wind: number(p.windIntensity, .75, 0, 1.5)
  };
}
export function BloomType(props: BloomTypeProps) {
  const r = resolveBloomProps(props);
  return <div className={props.className} data-bloom-type="" style={{
    width: '100%',
    aspectRatio: '4 / 3',
    ...props.style
  }}>
  <BloomDrawing palette={r.palette} text={r.text} font={r.font} fontUrl={r.fontUrl} motion={r.motion} mix={r.mix} vine={r.vine} size={r.size} seed={r.seed} density={r.density} speed={r.speed} wind={r.wind} replayVersion={props.replayVersion ?? 0} paused={props.paused ?? false} />
 </div>;
}
export default BloomType;
