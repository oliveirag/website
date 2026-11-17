import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import BloomType from '../designely/BloomType';
import { read, subscribe } from '../scripts/preferences';
import { scenePalettes } from '../scripts/scene-palette';

const NAME = ['guilherme', 'oliveira'];
// Bloom Type's flower mix for the Intro. 'Wildflowers' is the alternative on offer; Roses stays until I choose.
const FLOWER_MIX = 'Roses';
// Below the tablet breakpoint the name is stacked on two lines, so the letters and flowers are large enough.
const TWO_LINES = '(max-width: 639px)';
// Two lines: the side margin, the gap between baselines and the tallest the letters get, against the screen.
const GUTTER = 24;
const LINE_GAP = 1.35;
const MAX_LETTER_SHARE = 0.16;

// Where Bloom Type drew a line's lettering, as shares of its canvas's width. They hold at any size, because the
// drawing scales with the canvas as long as the canvas keeps its 4:3 shape.
type Shares = { baseline: number; width: number; fontSize: number };

function shares(canvas: HTMLCanvasElement): Shares | null {
  const [, baseline, width, fontSize] = (canvas.dataset.textBox ?? '').split(' ').map(Number);
  const canvasWidth = canvas.getBoundingClientRect().width;
  if (!canvasWidth || !fontSize || !width || !Number.isFinite(baseline)) return null;
  return { baseline: baseline! / canvasWidth, width: width / canvasWidth, fontSize: fontSize / canvasWidth };
}

// Places two drawn lines: both words at one letter size, as large as fits, stacked and centred together.
function stack(lines: Shares[], stageWidth: number, stageHeight: number) {
  const letters = Math.min(...lines.map((line) => ((stageWidth - 2 * GUTTER) * line.fontSize) / line.width), stageHeight * MAX_LETTER_SHARE);
  const gap = letters * LINE_GAP;
  const firstBaseline = stageHeight / 2 - gap / 2 + letters * 0.3;
  return lines.map((line, i) => {
    const width = letters / line.fontSize;
    return { width, top: firstBaseline + i * gap - line.baseline * width };
  });
}

// The name growing flowers, in the current theme's Intro palette. A theme change sends the new palette to the
// running drawing, which updates in place without regrowing. Bloom Type honours reduced motion itself (it
// draws the grown still frame), pauses off screen, and leans the flowers toward the pointer over its canvas.
// Once released, the drawing lets go of the lettering: the letters go at once and their flowers wither and
// shed their petals.
function IntroBloom({ onRelease }: { onRelease: (release: () => void) => void }) {
  const [theme, setTheme] = useState(() => read('theme'));
  useEffect(() => subscribe('theme', setTheme), []);
  const [twoLines, setTwoLines] = useState(() => matchMedia(TWO_LINES).matches);
  useEffect(() => {
    const query = matchMedia(TWO_LINES);
    const follow = () => setTwoLines(query.matches);
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, []);
  const [released, setReleased] = useState(false);
  useEffect(() => onRelease(() => setReleased(true)), [onRelease]);

  const lines = twoLines ? NAME : [NAME.join(' ')];
  const palette = scenePalettes[theme].intro;
  // Black screens away to nothing and white multiplies away to nothing, leaving the Field's sky behind it.
  const background = palette.blend === 'screen' ? '#000000' : '#ffffff';

  const stage = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ width: number; top: number }[] | null>(null);

  useLayoutEffect(() => {
    setPlacement(null);
    if (!twoLines) return;
    const root = stage.current!;
    let measured: Shares[] | null = null;
    const place = () => {
      if (!measured) {
        const found = [...root.querySelectorAll('canvas')].map(shares);
        if (found.length !== NAME.length || found.some((line) => !line)) return;
        measured = found as Shares[];
      }
      setPlacement(stack(measured, root.clientWidth, root.clientHeight));
    };
    // The shares exist once each drawing has its font and its layout. After that, only the screen size matters.
    const drawn = new MutationObserver(place);
    drawn.observe(root, { subtree: true, attributes: true, attributeFilter: ['data-text-box'] });
    const resized = new ResizeObserver(place);
    resized.observe(root);
    place();
    return () => {
      drawn.disconnect();
      resized.disconnect();
    };
  }, [twoLines]);

  // data-palette says which theme's palette the drawing was last given, for anyone checking from outside.
  return (
    <div ref={stage} data-palette={theme} className="intro-lines">
      {lines.map((text, i) => {
        const placed = placement?.[i];
        // Each line blends onto what is under it, so where two lines overlap only their drawings add up.
        const style: CSSProperties = twoLines
          ? { top: placed?.top ?? 0, width: placed?.width ?? '100%', left: '50%', transform: 'translateX(-50%)', opacity: placed ? 1 : 0, mixBlendMode: palette.blend }
          : { inset: 0, mixBlendMode: palette.blend };
        return (
          <div key={text} className="intro-line" data-intro-line={text} style={style}>
            <BloomType
              text={released ? ' ' : text}
              plain
              flowerMix={FLOWER_MIX}
              backgroundColour={background}
              textColour={palette.name}
              flowerColour={palette.blooms}
              stemColour={palette.stems}
              leafColour={palette.leaves}
              style={twoLines ? { width: '100%' } : { width: '100%', height: '100%', aspectRatio: 'auto' }}
            />
          </div>
        );
      })}
    </div>
  );
}

export interface IntroDrawing {
  /** Lets go of the lettering, so the real text can take its place, and lets the flowers wither away. */
  release(): void;
  /** Stops and removes the drawing. */
  unmount(): void;
}

// Draws the Intro into `container`.
export function mountIntroBloom(container: HTMLElement): IntroDrawing {
  const root = createRoot(container);
  let release: (() => void) | undefined;
  let releaseAsked = false;
  const onRelease = (fn: () => void) => {
    release = fn;
    if (releaseAsked) fn();
  };
  root.render(<IntroBloom onRelease={onRelease} />);
  return {
    release() {
      releaseAsked = true;
      release?.();
    },
    unmount: () => root.unmount(),
  };
}
