// The site's sounds, by name. Each one is a file in public/sounds/ named after it, in any of the formats
// below (the first one found wins): public/sounds/ambience.mp3, public/sounds/cue-link.mp3 and so on.
// Dropping a file in is all it takes; the next build finds it. A sound with no file stays silent.
//
// Which files exist is worked out at build time, so the browser never asks for a file that isn't there
// (a 404 would put an error in the console even though the engine ignores it).
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const soundNames = ['ambience', 'cue-link', 'cue-theme', 'cue-chatbot'] as const;
export type SoundName = (typeof soundNames)[number];

// Where each available sound is served from.
export type SoundFiles = Partial<Record<SoundName, string>>;

const extensions = ['mp3', 'm4a', 'ogg', 'wav'];

// Server only: runs while the pages are built, from the project root.
export function soundFiles(): SoundFiles {
  const found: SoundFiles = {};
  for (const name of soundNames) {
    const extension = extensions.find((ext) => existsSync(join(process.cwd(), 'public', 'sounds', `${name}.${ext}`)));
    if (extension) found[name] = `/sounds/${name}.${extension}`;
  }
  return found;
}
