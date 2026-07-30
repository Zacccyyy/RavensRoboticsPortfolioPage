#!/usr/bin/env node
// Pre-commit guard (invoked by .husky/pre-commit), same pattern as
// check-staged-file-sizes.mjs: fail closed, not a warning. A photo with GPS
// coordinates still embedded — the default on basically every phone camera —
// reveals exactly where it was taken, which for a home/hobby project (a
// terrarium build, a workbench, a garage) usually means where you live.
// Astro's own build pipeline strips this from every generated image variant
// (see scripts/strip-dist-image-metadata.mjs and the doc comment on
// writeImage() in src/integrations/studio-save.ts for the two places that
// already guarantee this for anything that goes through them) — but a
// photo committed straight into src/content/projects/**/ sits in git
// history, unprocessed, forever. This is the check that catches it before
// that history exists, for anyone committing by hand rather than through
// /studio or the CMS.
//
// Uses exifr (pure JS) rather than shelling out to the exiftool binary —
// forkers shouldn't need a system dependency installed just to commit a
// photo.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import exifr from 'exifr';

const IMAGE_EXTENSIONS = /\.(jpe?g|tiff?|heic|heif)$/i;

const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
  encoding: 'utf-8',
})
  .split('\n')
  .filter(Boolean)
  .filter((file) => IMAGE_EXTENSIONS.test(file));

const violations = [];

for (const file of staged) {
  let buffer;
  try {
    buffer = readFileSync(file);
  } catch {
    continue; // deleted/renamed away between staging and this check
  }

  let gps;
  try {
    gps = await exifr.gps(buffer);
  } catch {
    continue; // not a format exifr can parse — nothing to strip
  }

  if (gps) {
    violations.push({ file, gps });
  }
}

if (violations.length > 0) {
  console.error('\n[pre-commit] Blocked — staged image(s) contain embedded GPS coordinates:\n');
  for (const { file, gps } of violations) {
    console.error(`  ${file} — lat ${gps.latitude}, lon ${gps.longitude}`);
  }
  console.error(
    '\nMost phone cameras embed the exact location a photo was taken. Committing that photo' +
      '\nunmodified publishes that location in git history forever, even if you later delete' +
      "\nor replace the file — the blob doesn't go away." +
      '\n\nStrip it before committing, e.g.:' +
      '\n  exiftool -gps:all= -overwrite_original <file>' +
      '\n\nUploading through /studio or the CMS instead strips this automatically — see' +
      "\nCONTENT.md's \"Photo metadata\" section.\n",
  );
  process.exit(1);
}
