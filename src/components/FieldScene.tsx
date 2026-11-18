import { useEffect, useState } from 'react';
import { read, subscribe } from '../scripts/preferences';
import { scenePalettes } from '../scripts/scene-palette';

type GrassModule = typeof import('../designely/Grass');
type Artboard = GrassModule['grassArtboard'];

// The share of the viewport the grass fills comes from CSS (--field-share), so the band the page lays out
// around and the horizon the scene draws always agree.
function fieldShare() {
  const share = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--field-share'));
  return Number.isFinite(share) ? share : 0.3;
}

// Phones draw at the scene's lighter quality, also set in CSS (--field-quality) next to the share.
function fieldQuality(): 'high' | 'fast' {
  return getComputedStyle(document.documentElement).getPropertyValue('--field-quality').trim() === 'fast' ? 'fast' : 'high';
}

// The scene's horizon setting that puts the grass line at the top of the Field band.
// The scene scales its artboard to cover the stage, centred, so on a stage wider than the artboard the
// artboard is taller than the stage and its top and bottom are cropped off. The horizon is measured on
// the artboard, so the crop below the stage has to be added back.
function horizonFor(artboard: Artboard, stageWidth: number, stageHeight: number, share: number) {
  if (stageWidth <= 0 || stageHeight <= 0) return 1 - share;
  const artboardHeight = Math.max(stageHeight, (stageWidth * artboard.height) / artboard.width);
  const croppedBelow = (artboardHeight - stageHeight) / 2;
  const grassOnArtboard = (share * stageHeight + croppedBelow) / artboardHeight;
  return Math.min(1, Math.max(0.5, 1 - grassOnArtboard));
}

function currentHorizon(artboard: Artboard) {
  const stage = document.querySelector<HTMLElement>('.field-stage');
  return horizonFor(artboard, stage?.clientWidth ?? window.innerWidth, stage?.clientHeight ?? window.innerHeight, fieldShare());
}

// Runs once the page has painted and the browser has a moment to spare, so the scene's code never holds up
// the first paint or the page's other scripts starting. A frame callback runs just before a paint, and a task
// queued from it runs just after. Browsers without idle callbacks wait a little instead.
function afterPaint(run: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idle = 0;
  const frame = requestAnimationFrame(() => {
    timer = setTimeout(() => {
      if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(run, { timeout: 1000 });
      else timer = setTimeout(run, 100);
    });
  });
  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    if (idle) cancelIdleCallback(idle);
  };
}

// The Grass scene behind the whole viewport: its sky fills the screen and its grass fills the Field band.
// The scene's code loads only after the page has first painted. Until it draws, and for good where it can't
// (no WebGL2), the Field's CSS sky shows; without WebGL2 a still picture of the grass fills the band.
// A theme change sends the new palette to the running scene, which updates in place.
// The scene holds still while the band is off screen (under the Intro, the Field waits below the screen).
// The scene itself also holds still in a hidden tab and under reduced motion.
export default function FieldScene() {
  const [theme, setTheme] = useState(() => read('theme'));
  const [grass, setGrass] = useState<GrassModule | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [horizon, setHorizon] = useState(() => 1 - fieldShare());
  const [quality, setQuality] = useState(fieldQuality);
  const [bandShown, setBandShown] = useState(true);

  useEffect(() => subscribe('theme', setTheme), []);

  useEffect(() => {
    let cancelled = false;
    const cancel = afterPaint(() => {
      import('../designely/Grass').then(
        (loaded) => {
          if (cancelled) return;
          // The stage will fill the window, so the horizon is right from the scene's first frame.
          setHorizon(currentHorizon(loaded.grassArtboard));
          setGrass(loaded);
        },
        () => !cancelled && setUnavailable(true),
      );
    });
    return () => {
      cancelled = true;
      cancel();
    };
  }, []);

  useEffect(() => {
    const update = () => {
      if (grass) setHorizon(currentHorizon(grass.grassArtboard));
      setQuality(fieldQuality());
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [grass]);

  useEffect(() => {
    const band = document.getElementById('field');
    if (!band || typeof IntersectionObserver === 'undefined') return;
    // Below the screen the band's top edge touches the screen's bottom edge, which counts as intersecting, so
    // only some of the band showing counts as shown. The second threshold makes that change report itself.
    const observer = new IntersectionObserver((entries) => setBandShown(entries[entries.length - 1]!.intersectionRatio > 0), {
      threshold: [0, 0.01],
    });
    observer.observe(band);
    return () => observer.disconnect();
  }, []);

  const palette = scenePalettes[theme].field;
  const Grass = grass?.default;

  // data-palette and data-quality say which palette and quality the scene was last given, for anyone checking
  // from outside.
  return (
    <div data-palette={theme} data-quality={quality}>
      {Grass && !unavailable && (
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
          quality={quality}
          pointerPush
          paused={!bandShown}
          onUnavailable={() => setUnavailable(true)}
        />
      )}
      {unavailable && (
        <>
          <div className="field-still field-still-night" />
          <div className="field-still field-still-day" />
        </>
      )}
    </div>
  );
}
