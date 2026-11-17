# Bloom Type

Original procedural botanical artwork by Designely Studio, drawn on a canvas. Requires React 18+ and TypeScript, no other dependencies.

1. Copy designely/BloomType.tsx into your React or Next.js project.
2. Copy instrument-serif-latin.woff2 from public/fonts into your app's public/fonts directory (keep its folder) and retain FONT_LICENSE.txt.
3. Import { BloomType } from './designely/BloomType' and render <BloomType /> in a container with a real width. Its default aspect ratio is 4:3; style can set width/height.

The file is self-contained: no Designely runtime, CSS or network font service is needed. Next.js: import it from a client component. SSR is supported (it renders an empty labelled canvas); drawing starts after mount. Modern browsers need Canvas 2D, Path2D, FontFace, ResizeObserver, IntersectionObserver and requestAnimationFrame.

Props: text (up to 28 characters), font, motion ('Breathe', 'Grow & Wither', 'Gust'), flowerMix, vineStyle, illustration ('Painted', 'Engraved'), flowerColour, stemColour, leafColour, textColour, backgroundColour (CSS hex), bloomSize (.5–1.8), growthDensity (.25–1), growthSpeed (.3–2), windIntensity (0–1.5), randomSeed (1–9999), replayVersion, paused, className, style, fontBase, fontUrl. Increment replayVersion to replay growth. paused freezes the clock; reduced motion draws mature still artwork. Drawing pauses while the component is off screen, and the pointer makes the flowers lean and shiver.

Fonts: this download includes the font you chose (Instrument Serif). The component knows 19 fonts by name (see FONTS in the file); to use another, download its .woff2 from Google Fonts' open-licensed families, or copy it from Designely, into public/fonts/bloom/ under the file name listed in FONTS, or point fontUrl at it. Unknown or missing files fall back to a serif. Every font is under the SIL Open Font License 1.1. Only the Latin subset is guaranteed.

Defaults are the settings you exported. Motion and palette changes retain the arrangement; appending text retains existing plants. Text fitting may rescale the composition.

Remix and Embed are not supported for this procedural component.
