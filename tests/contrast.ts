// WCAG 2 contrast maths for the colour tests. Colours are [r, g, b, alpha] with channels from 0 to 255.
export type Rgba = [number, number, number, number];

export function rgbaFromHex(hex: string): Rgba {
  const n = parseInt(hex.trim().slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255, 1];
}

// A computed CSS colour, "rgb(1, 2, 3)" or "rgba(1, 2, 3, 0.5)".
export function rgbaFromCss(colour: string): Rgba {
  const v = colour.match(/[\d.]+/g)!.map(Number);
  return [v[0], v[1], v[2], v[3] ?? 1];
}

export const cssFromHex = (hex: string) => {
  const [r, g, b] = rgbaFromHex(hex);
  return `rgb(${r}, ${g}, ${b})`;
};

function channel(v: number) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export const relativeLuminance = ([r, g, b]: Rgba) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

// Alpha compositing: a translucent colour drawn over an opaque one.
export const compositeOver = ([r, g, b, a]: Rgba, [R, G, B]: Rgba): Rgba => [
  r * a + R * (1 - a),
  g * a + G * (1 - a),
  b * a + B * (1 - a),
  1,
];

export function contrastRatio(text: Rgba, background: Rgba) {
  const fg = relativeLuminance(compositeOver(text, background));
  const bg = relativeLuminance(background);
  return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
}

// Truncated, never rounded up, so a reported 4.5 really is at least 4.5.
export const formatRatio = (ratio: number) => (Math.floor(ratio * 100) / 100).toFixed(2);
