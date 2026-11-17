# Grass

The “Grass” component from Designely Studio as a React component (TypeScript, React 18 or 19). It works in
Next.js (app router) and Vite with no setup and no other dependencies.

## Install

1. Copy the `designely` folder into your app: Next.js `components/designely` (or anywhere), Vite `src/designely`.
2. Render it:

```tsx
import Grass from "./designely/Grass";

export default function Page() {
  return <Grass style={{ maxWidth: 720 }} />;
}
```

It's a client component (`"use client"`), so a Next.js server component page can render it as it is.

## If nothing shows

The component fills the width of its parent, so a parent with no width draws nothing (the console says "is 0px wide"). Give the parent a width, and check it isn't inside a flex container that collapses it: the Vite template's `#root` is one, so wrap the component in a block with a width, for example `<div style={{ width: "100%" }}>`. It also needs WebGL2.

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `bladeHeight` | `number` | `0.6` | Blade height (0.2 to 1.5): How tall the grass grows, in metres. Taller than the camera height and it rises into the sky. |
| `density` | `number` | `0.6` | Density (0 to 0.9): How closely the blades grow. Denser costs more; the top is capped so playback stays smooth. |
| `baseColour` | `string` | `"#0c260e"` | Base colour: The colour low down in the grass, where it’s shaded. |
| `tipColour` | `string` | `"#8dbb4c"` | Tip colour: The colour towards the tips, in the light. |
| `flowers` | `number` | `0.35` | Flowers (0 to 1): How many blades carry a small flower on their tip. |
| `windSpeed` | `number` | `0.5` | Wind speed (0 to 2): How fast the gusts roll across and the blades sway. 0 holds the field still. |
| `windStrength` | `number` | `0.45` | Wind strength (0 to 1): How far the wind bends the blades over, in the gusts most of all. |
| `pointerPush` | `boolean` | `true` | Pointer push: The pointer parts the grass as it moves over it; the blades spring back after it. |
| `skyTop` | `string` | `"#6c9bd6"` | Sky top: The sky’s colour high up. |
| `horizonColour` | `string` | `"#dfe9e8"` | Horizon colour: The colour at the horizon, which distant grass fades into. |
| `className` | `string` | | A class for the stage |
| `style` | `CSSProperties` | | Over the stage's own: full width at the artboard's aspect ratio (4 / 3) |
| `paused` | `boolean` | `false` | Holds the scene on its current frame |

Props change the running scene in place: it never restarts.
Without WebGL2 nothing is drawn and the console says so once.

## Files

| File | Size | Gzipped | |
|---|---|---|---|
| `designely/Grass.tsx` | 8.0 kB | 3.2 kB | The component |
| `designely/grass.effect.ts` | 10 kB | 3.9 kB | Its shaders and settings |
| `designely/designely-runtime.js` | 75 kB | 29 kB | The engine, shared by every Designely component |
| `designely/designely-runtime.d.ts` | 1.6 kB | 685 B | The engine’s types |

`designely-runtime.js` is the same for every Designely component (modules: core, simulation): with more than one, keep one copy, the newest.

Copyright (c) 2026 DESIGNELY LTD. Licensed only to play this export; see app.designely.studio/licence.
