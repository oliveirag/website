import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import BloomType from '../designely/BloomType';
import { read, subscribe } from '../scripts/preferences';
import { scenePalettes } from '../scripts/scene-palette';

// The name growing flowers, in the current theme's Intro palette. A theme change sends the new palette to the
// running drawing, which updates in place without regrowing. Bloom Type honours reduced motion itself (it
// draws the grown still frame), pauses off screen, and leans the flowers toward the pointer over its canvas.
function IntroBloom() {
  const [theme, setTheme] = useState(() => read('theme'));
  useEffect(() => subscribe('theme', setTheme), []);
  const palette = scenePalettes[theme].intro;

  // data-palette says which theme's palette the drawing was last given, for anyone checking from outside.
  return (
    <div data-palette={theme} style={{ width: '100%', height: '100%' }}>
      <BloomType
        text="guilherme oliveira"
        backgroundColour={palette.background}
        textColour={palette.name}
        flowerColour={palette.blooms}
        stemColour={palette.stems}
        leafColour={palette.leaves}
        style={{ width: '100%', height: '100%', aspectRatio: 'auto' }}
      />
    </div>
  );
}

// Draws the Intro into `container`. Returns a function that stops and removes the drawing.
export function mountIntroBloom(container: HTMLElement): () => void {
  const root = createRoot(container);
  root.render(<IntroBloom />);
  return () => root.unmount();
}
