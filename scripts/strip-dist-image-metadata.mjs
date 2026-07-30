#!/usr/bin/env node
// Belt-and-suspenders pass over the actual build OUTPUT, run after `astro
// build`. Astro's own image service (node_modules/astro/dist/assets/services/
// sharp.js) already strips EXIF/GPS/IPTC from every width/format variant it
// generates (sharp doesn't call .withMetadata(), so none of that survives
// re-encoding) — but Vite's static-asset pipeline separately copies the
// *original, untouched* source file into dist/_astro/ under its own
// content-hashed name (e.g. cover.D9vcoql6.jpg, no width suffix) so it has a
// stable URL for the ImageMetadata object Astro's content-layer resolves
// `cover: image()` to. That bare copy never passes through sharp at all, so
// it carries whatever metadata the source file had. No page links to it —
// every real <Image>/<Picture> usage requests a specific width/format, which
// resolves to a *suffixed* sibling — but the file still sits in the publicly
// deployed output at a guessable path (strip the `_<suffix>` off any
// referenced sibling URL and you have it). Confirmed by injecting real
// GPS/EXIF into src/content/projects/terrapod/cover.jpg, running a real
// `npm run build`, and checking every dist/_astro/cover.* variant with
// exiftool: only the bare cover.D9vcoql6.jpg leaked; every _<suffix> variant
// was already clean.
//
// Rather than depend on that Vite behavior staying exactly this way (or
// chasing every other path something unprocessed could end up in dist/),
// this just sweeps every raster image actually present in the build output
// and strips metadata unconditionally. sharp() with no .withMetadata() call
// strips by default; .rotate() bakes in EXIF orientation first so a stripped
// file can't end up sideways. Idempotent and cheap enough to always run —
// files sharp's own service already produced get re-stripped as a no-op.

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST_ASTRO_DIR = join(ROOT, 'dist/_astro');

const STRIPPABLE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff']);

function walk(dirAbs) {
  let files = [];
  for (const entry of readdirSync(dirAbs)) {
    const entryAbs = join(dirAbs, entry);
    if (statSync(entryAbs).isDirectory()) {
      files = files.concat(walk(entryAbs));
    } else {
      files.push(entryAbs);
    }
  }
  return files;
}

async function main() {
  let files;
  try {
    files = walk(DIST_ASTRO_DIR);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('[strip-dist-image-metadata] No dist/_astro directory found, nothing to do.');
      return;
    }
    throw err;
  }

  const imageFiles = files.filter((f) => STRIPPABLE_EXTENSIONS.has(extname(f).toLowerCase()));

  await Promise.all(
    imageFiles.map(async (fileAbs) => {
      const buffer = readFileSync(fileAbs);
      const cleaned = await sharp(buffer).rotate().toBuffer();
      writeFileSync(fileAbs, cleaned);
    }),
  );

  console.log(`[strip-dist-image-metadata] Stripped metadata from ${imageFiles.length} image(s) in dist/_astro/.`);
}

main();
