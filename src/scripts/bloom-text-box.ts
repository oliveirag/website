// Where Bloom Type drew a canvas's lettering at rest. The component publishes it as data-text-box,
// "x baseline width fontSize" in CSS pixels from the canvas's top left (added to the component for the Intro).
// Null until the drawing has its font and its layout.
export type TextBox = { x: number; baseline: number; width: number; fontSize: number };

export function readTextBox(canvas: HTMLCanvasElement): TextBox | null {
  const [x, baseline, width, fontSize] = (canvas.dataset.textBox ?? '').split(' ').map(Number);
  if (![x, baseline, width, fontSize].every((n) => Number.isFinite(n)) || !width || !fontSize) return null;
  return { x: x!, baseline: baseline!, width: width!, fontSize: fontSize! };
}
