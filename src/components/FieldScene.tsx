import { useEffect, useState } from 'react';
import Grass, { grassArtboard } from '../designely/Grass';
import { read, subscribe } from '../scripts/preferences';
import { scenePalettes } from '../scripts/scene-palette';

// The share of the viewport the grass fills comes from CSS (--field-share), so the band the page lays out
// around and the horizon the scene draws always agree.
function fieldShare() {
  const share = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--field-share'));
  return Number.isFinite(share) ? share : 0.3;
}

// The scene's horizon setting that puts the grass line at the top of the Field band.
// The scene scales its artboard to cover the stage, centred, so on a stage wider than the artboard the
// artboard is taller than the stage and its top and bottom are cropped off. The horizon is measured on
// the artboard, so the crop below the stage has to be added back.
function horizonFor(stageWidth: number, stageHeight: number, share: number) {
  if (stageWidth <= 0 || stageHeight <= 0) return 1 - share;
  const artboardHeight = Math.max(stageHeight, (stageWidth * grassArtboard.height) / grassArtboard.width);
  const croppedBelow = (artboardHeight - stageHeight) / 2;
  const grassOnArtboard = (share * stageHeight + croppedBelow) / artboardHeight;
  return Math.min(1, Math.max(0.5, 1 - grassOnArtboard));
}

function currentHorizon() {
  const stage = document.querySelector<HTMLElement>('.field-stage');
  return horizonFor(stage?.clientWidth ?? window.innerWidth, stage?.clientHeight ?? window.innerHeight, fieldShare());
}

// The Grass scene behind the whole viewport: its sky fills the screen and its grass fills the Field band.
// A theme change sends the new palette to the running scene, which updates in place.
export default function FieldScene() {
  const [theme, setTheme] = useState(() => read('theme'));
  const [horizon, setHorizon] = useState(() => 1 - fieldShare());

  useEffect(() => subscribe('theme', setTheme), []);

  useEffect(() => {
    const update = () => setHorizon(currentHorizon());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const palette = scenePalettes[theme].field;

  // data-palette says which theme's palette the scene was last given, for anyone checking from outside.
  return (
    <div data-palette={theme}>
      <Grass
        className="field-stage"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '100vh', aspectRatio: 'auto' }}
        horizon={horizon}
        baseColour={palette.grassBase}
        tipColour={palette.grassTip}
        dryColour={palette.dry}
        flowerColour={palette.flower}
        flowers={palette.flowers}
        skyTop={palette.skyTop}
        horizonColour={palette.horizonColour}
        pointerPush
      />
    </div>
  );
}
