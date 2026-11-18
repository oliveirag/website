// The name's move from the Intro into Home's heading.
//
// The name is drawn on Bloom Type's canvas, under the Intro's cover, and the heading sits in the Sky under that
// cover too, so neither can travel. Instead real text is laid exactly over the drawn name, one piece per word,
// in a layer above the cover. Each word then moves and scales onto the same word in the heading while its colour
// fades from the Intro's ink to the heading's. When it lands, the layer empties and the heading shows in the
// same spot. Phones draw the name on two lines and set the heading on one, which is why each word travels alone.
//
import { readTextBox } from './bloom-text-box';

export interface Flight {
  /** Puts every word in its place at once and shows the heading. Safe to call more than once. */
  land(): void;
}

// Where each word of an element's text sits on screen, in order.
function wordRects(element: Element): DOMRect[] {
  const rects: DOMRect[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    for (const match of text.matchAll(/\S+/g)) {
      const range = document.createRange();
      range.setStart(node, match.index!);
      range.setEnd(node, match.index! + match[0].length);
      rects.push(range.getBoundingClientRect());
    }
  }
  return rects;
}

function span(className: string, text?: string) {
  const el = document.createElement('span');
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// Starts the flight, or returns null when there is no drawn name to start from (the drawing hadn't loaded, or
// a phone's lines aren't placed yet) or the drawing and the heading don't hold the same words.
export function flyNameHome(stage: HTMLElement, layer: HTMLElement, heading: HTMLElement, options: { duration: number; easing: string; ink: string }): Flight | null {
  const canvases = [...stage.querySelectorAll<HTMLCanvasElement>('canvas[data-text-box]')].filter((canvas) => canvas.dataset.ready === '1');
  const lines = canvases.map((canvas) => {
    const line = canvas.closest<HTMLElement>('[data-intro-line]');
    return {
      canvas,
      box: line && getComputedStyle(line).opacity !== '0' ? readTextBox(canvas) : null,
      words: (line?.dataset.introLine ?? '').split(/\s+/).filter(Boolean),
    };
  });
  const targets = wordRects(heading);
  const wordCount = lines.reduce((sum, line) => sum + line.words.length, 0);
  if (!lines.length || lines.some((line) => !line.box || !line.words.length) || wordCount !== targets.length) return null;

  const headingStyle = getComputedStyle(heading);
  const headingSize = parseFloat(headingStyle.fontSize);
  const animations: Animation[] = [];
  const timing: KeyframeAnimationOptions = { duration: options.duration, easing: options.easing, fill: 'forwards' };

  // Lay each line of text over its drawn line: the same size, its first letter on the same pen position, on the
  // same baseline. A text range's top is the font's ascent above its baseline, the same ascent a canvas reports.
  const measure = document.createElement('canvas').getContext('2d')!;
  const placed = lines.map(({ canvas, box, words }) => {
    const line = document.createElement('div');
    line.className = 'intro-flight-line';
    line.style.fontSize = `${box!.fontSize}px`;
    line.style.color = options.ink;
    const pieces = words.map((word, i) => {
      if (i) line.append(' ');
      const piece = span('intro-flight-word');
      const inked = span('intro-flight-ink', word);
      const settled = span('intro-flight-settled', word);
      settled.style.color = headingStyle.color;
      piece.append(inked, settled);
      line.append(piece);
      return { piece, inked, settled };
    });
    layer.append(line);
    const canvasRect = canvas.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(pieces[0]!.inked);
    const glyphs = range.getBoundingClientRect();
    measure.font = `${box!.fontSize}px ${getComputedStyle(line).fontFamily}`;
    const baseline = glyphs.top + measure.measureText(words[0]!).fontBoundingBoxAscent;
    line.style.left = `${canvasRect.left + box!.x - lineRect.left}px`;
    line.style.top = `${canvasRect.top + box!.baseline - (baseline - lineRect.top)}px`;
    return { box: box!, pieces };
  });

  heading.setAttribute('data-intro-flying', '');

  // Each word moves from where its glyphs are now to where the same word's glyphs are in the heading. Both are
  // measured as text ranges, so the move lines up glyphs rather than boxes.
  let index = 0;
  for (const { box, pieces } of placed) {
    const scale = headingSize / box.fontSize;
    for (const { piece, inked, settled } of pieces) {
      const from = piece.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(inked);
      const glyphs = range.getBoundingClientRect();
      const to = targets[index++]!;
      const x = to.left - from.left - scale * (glyphs.left - from.left);
      const y = to.top - from.top - scale * (glyphs.top - from.top);
      animations.push(piece.animate([{ transform: 'none' }, { transform: `translate(${x}px, ${y}px) scale(${scale})` }], timing));
      animations.push(settled.animate([{ opacity: 0 }, { opacity: 1 }], timing));
    }
  }

  let landed = false;
  return {
    land() {
      if (landed) return;
      landed = true;
      for (const animation of animations) animation.cancel();
      layer.replaceChildren();
      heading.removeAttribute('data-intro-flying');
    },
  };
}
