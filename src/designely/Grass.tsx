/**
 * Grass: the “Grass” component from Designely Studio, as a React component.
 * A field of grass to the horizon: gusts ripple across it in waves, and the pointer parts the blades, which spring back behind it.
 *
 * Use it like any component (it's a client component, so a Next.js server component can render it):
 *   import Grass from "./designely/Grass";
 *   <Grass bladeHeight={0.6} style={{ maxWidth: 720 }} />
 * It fills its container's width at the artboard's aspect ratio (4 / 3); a height in `style` fills that instead.
 * Props change the running scene without restarting it.
 * It needs WebGL2: without it nothing is drawn and the console says so once.
 * Files: designely-runtime.js (the engine, shared by every Designely component), grass.effect.ts (this component's shaders).
 *
 * Copyright (c) 2026 DESIGNELY LTD. Licensed only to play this export; see app.designely.studio/licence
 *
 * Edited for notgui.com: the scene settings the export kept inside PARAMS (horizon, camera height, dry colour,
 * flower colour, sky mode and quality) are props too, and the artboard size is exported. An onUnavailable prop
 * says when the scene couldn't start (no WebGL2), so the page can show something else. Nothing else changed.
 */
"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { mountDesignely, type DesignelyHandle, type DesignelyScene } from "./designely-runtime.js";
import { grassEffect } from "./grass.effect";

export interface GrassProps {
  /** Blade height: how tall the grass grows, in metres. Taller than the camera height and it rises into the sky. From 0.2 to 1.5. Default 0.6. */
  bladeHeight?: number;
  /** Density: how closely the blades grow. Denser costs more; the top is capped so playback stays smooth. From 0 to 0.9. Default 0.6. */
  density?: number;
  /** Base colour: the colour low down in the grass, where it’s shaded. A hex colour. Default "#0c260e". */
  baseColour?: string;
  /** Tip colour: the colour towards the tips, in the light. A hex colour. Default "#8dbb4c". */
  tipColour?: string;
  /** Flowers: how many blades carry a small flower on their tip. From 0 to 1. Default 0.35. */
  flowers?: number;
  /** Wind speed: how fast the gusts roll across and the blades sway. 0 holds the field still. From 0 to 2. Default 0.5. */
  windSpeed?: number;
  /** Wind strength: how far the wind bends the blades over, in the gusts most of all. From 0 to 1. Default 0.45. */
  windStrength?: number;
  /** Pointer push: the pointer parts the grass as it moves over it; the blades spring back after it. Default true. */
  pointerPush?: boolean;
  /** Sky top: the sky’s colour high up. A hex colour. Default "#6c9bd6". */
  skyTop?: string;
  /** Horizon colour: the colour at the horizon, which distant grass fades into. A hex colour. Default "#dfe9e8". */
  horizonColour?: string;
  /** Horizon: how far up the stage the horizon sits, so the grass fills the bottom (1 - horizon). From 0.5 to 1. Default 0.72. */
  horizon?: number;
  /** Camera height: how high above the ground the view is, in metres. From 0.1 to 3. Default 0.8. */
  cameraHeight?: number;
  /** Dry colour: the colour of the dry blades mixed into the grass. A hex colour. Default "#c9b35a". */
  dryColour?: string;
  /** Flower colour: the colour of the flowers on the blade tips. A hex colour. Default "#f6f2e6". */
  flowerColour?: string;
  /** Sky: "generated" draws the sky gradient, "transparent" shows what is under the stage above the grass. Default "generated". */
  sky?: "generated" | "transparent";
  /** Quality: "fast" draws fewer rows at half resolution. Default "high". */
  quality?: "high" | "fast";
  /** A class for the stage (the element the scene draws in). */
  className?: string;
  /** Styles for the stage, over its own: full width at the artboard's aspect ratio. */
  style?: CSSProperties;
  /** Holds the scene on its current frame while true. */
  paused?: boolean;
  /** Called once if the scene couldn't start, as in a browser without WebGL2. Added for notgui.com. */
  onUnavailable?: () => void;
}

/** The modules of designely-runtime.js this component needs (the engine warns if one is missing). */
const REQUIRES = ["simulation"];

/** The scene as exported from Designely Studio: its artboard, and the one layer the props change. */
const PARAMS: Record<string, unknown> = {
  "uBladeHeight": 0.6,
  "uDensity": 0.6,
  "uBaseColor": [0.047058823529411764, 0.14901960784313725, 0.054901960784313725, 1],
  "uTipColor": [0.5529411764705883, 0.7333333333333333, 0.2980392156862745, 1],
  "uFlowers": 0.35,
  "uWindSpeed": 0.5,
  "uWindStrength": 0.45,
  "uPointer": true,
  "uSky": "generated",
  "uSkyTop": [0.4235294117647059, 0.6078431372549019, 0.8392156862745098, 1],
  "uHorizonColor": [0.8745098039215686, 0.9137254901960784, 0.9098039215686274, 1],
  "uQuality": "high"
};

const LAYER = {
  "id": "grass",
  "name": "Grass",
  "kind": "effect",
  "effectId": "grass",
  "blendMode": "normal",
  "opacity": 1,
  "visible": true,
  "bindings": [],
  "params": PARAMS
};

const SCENE = {
  "schemaVersion": 88,
  "id": "grass",
  "name": "Grass",
  "canvas": {
    "width": 1200,
    "height": 900,
    "scaling": "cover",
    "background": [0, 0, 0, 0],
    "dprMax": 2
  }
};

/** The artboard's size. The scene scales it to cover the stage, so a stage of another shape crops it. */
export const grassArtboard = { width: SCENE.canvas.width, height: SCENE.canvas.height };

type Settings = Omit<GrassProps, "className" | "style" | "paused" | "onUnavailable">;

/** A number kept between min and max (whole when asked), or undefined when it isn't a number. */
function numberIn(value: number | undefined, min: number, max: number, whole = false): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const kept = Math.min(max, Math.max(min, value));
  return whole ? Math.round(kept) : kept;
}

/** "#rrggbb" (or #rgb, #rgba, #rrggbbaa) as the engine's [red, green, blue, alpha] from 0 to 1, or undefined. */
function colourOf(hex: string | undefined): [number, number, number, number] | undefined {
  const match = typeof hex === "string" ? /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim()) : null;
  if (!match) return undefined;
  let digits = match[1]!;
  if (digits.length <= 4) digits = digits.split("").map((d) => d + d).join("");
  if (digits.length === 6) digits += "ff";
  const channel = (i: number) => parseInt(digits.slice(i * 2, i * 2 + 2), 16) / 255;
  return [channel(0), channel(1), channel(2), channel(3)];
}

/** The scene with the props' settings in its layer (a value of the wrong type, or a colour that isn't hex, keeps the exported one). */
function sceneWith(settings: Settings): DesignelyScene {
  const params: Record<string, unknown> = { ...PARAMS };
  const set = (name: string, value: unknown) => {
    if (value !== undefined) params[name] = value;
  };
  set("uBladeHeight", numberIn(settings.bladeHeight, 0.2, 1.5));
  set("uDensity", numberIn(settings.density, 0, 0.9));
  set("uBaseColor", colourOf(settings.baseColour));
  set("uTipColor", colourOf(settings.tipColour));
  set("uFlowers", numberIn(settings.flowers, 0, 1));
  set("uWindSpeed", numberIn(settings.windSpeed, 0, 2));
  set("uWindStrength", numberIn(settings.windStrength, 0, 1));
  set("uPointer", typeof settings.pointerPush === "boolean" ? settings.pointerPush : undefined);
  set("uSkyTop", colourOf(settings.skyTop));
  set("uHorizonColor", colourOf(settings.horizonColour));
  set("uHorizon", numberIn(settings.horizon, 0.5, 1));
  set("uCameraHeight", numberIn(settings.cameraHeight, 0.1, 3));
  set("uDryColor", colourOf(settings.dryColour));
  set("uFlowerColor", colourOf(settings.flowerColour));
  set("uSky", settings.sky === "generated" || settings.sky === "transparent" ? settings.sky : undefined);
  set("uQuality", settings.quality === "high" || settings.quality === "fast" ? settings.quality : undefined);
  return { ...SCENE, layers: [{ ...LAYER, params }] };
}

export default function Grass({ className, style, paused = false, onUnavailable, ...settings }: GrassProps) {
  const stage = useRef<HTMLDivElement>(null);
  const handle = useRef<DesignelyHandle | null>(null);
  const scene = sceneWith(settings);
  const key = JSON.stringify(scene.layers[0]!.params);
  const latest = useRef({ scene, key, paused, onUnavailable });
  latest.current = { scene, key, paused, onUnavailable };
  const shown = useRef("");

  // The scene starts in the browser only (never during server rendering) and stops when the component goes.
  useEffect(() => {
    if (!stage.current) return;
    const running = mountDesignely(stage.current, latest.current.scene, { effects: [grassEffect], requires: REQUIRES });
    handle.current = running;
    shown.current = latest.current.key;
    if (running && latest.current.paused) running.pause();
    // Without WebGL2 the engine still returns a handle but adds no canvas (the same check its own warning makes).
    if (!running || !stage.current.querySelector("canvas")) latest.current.onUnavailable?.();
    // A stage with no size draws nothing, and nothing else says so: after the first layout, say it once.
    const element = stage.current;
    const check = requestAnimationFrame(() => {
      if (element.clientWidth === 0 || element.clientHeight === 0) console.warn("[designely] Grass is 0px wide, so nothing is drawn. Give its container a width (the component fills its parent).");
    });
    return () => {
      cancelAnimationFrame(check);
      handle.current = null;
      running?.destroy();
    };
  }, []);

  // New settings go to the running scene: it updates in place, never restarts.
  useEffect(() => {
    if (!handle.current || shown.current === key) return;
    shown.current = key;
    handle.current.update(latest.current.scene);
  }, [key]);

  useEffect(() => {
    if (paused) handle.current?.pause();
    else handle.current?.play();
  }, [paused]);

  return <div ref={stage} className={className} style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", overflow: "hidden", ...style }} />;
}
