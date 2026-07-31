#!/usr/bin/env node
// Pre-commit guard (invoked by .husky/pre-commit) — rejects any staged
// .mp4/.webm carrying GPS or device-identifying metadata, same fail-closed
// pattern as check-staged-file-sizes.mjs and check-staged-images-for-gps.mjs.
// Phone video embeds the same kind of location/device metadata as phone
// photos; this is the video half of that same protection (see CONTENT.md's
// "Video metadata" section).
//
// Requires ffprobe (ships with ffmpeg) — unlike the image-GPS check, which
// deliberately avoids a system dependency via the pure-JS `exifr` package.
// ffmpeg is already a documented required tool for anyone touching video
// in this repo (CONTENT.md's re-encode/webm-sibling commands), so this
// isn't a new burden for video specifically. Missing ffprobe fails the
// commit closed, same as finding real metadata would — "couldn't check"
// is not "is clean".

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { probeVideoMetadata, isFfprobeAvailable } from './video-metadata.mjs';

const VIDEO_EXTENSIONS = /\.(mp4|webm)$/i;

const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
  encoding: 'utf-8',
})
  .split('\n')
  .filter(Boolean)
  .filter((file) => VIDEO_EXTENSIONS.test(file));

if (staged.length === 0) process.exit(0);

if (!isFfprobeAvailable()) {
  console.error(
    '\n[pre-commit] Blocked — staged video file(s) found, but ffprobe (part of ffmpeg) is not installed:\n' +
      staged.map((f) => `  ${f}`).join('\n') +
      '\n\nCan\'t verify these are free of GPS/device metadata without it. Install ffmpeg, then retry:' +
      '\n  brew install ffmpeg\n',
  );
  process.exit(1);
}

const violations = [];

for (const file of staged) {
  if (!existsSync(file)) continue; // deleted/renamed away between staging and this check
  const result = probeVideoMetadata(file);
  if (result === null) continue; // not a file ffprobe can read as media — not this hook's problem
  if (result.hasSensitiveMetadata) violations.push({ file, ...result });
}

if (violations.length > 0) {
  console.error('\n[pre-commit] Blocked — staged video(s) contain GPS or device metadata:\n');
  for (const { file, gps, device } of violations) {
    for (const [key, value] of gps) console.error(`  ${file} — ${key}: ${value}`);
    for (const [key, value] of device) console.error(`  ${file} — ${key}: ${value}`);
  }
  console.error(
    '\nPhone/action-cam video commonly embeds the exact location and device it was recorded' +
      '\non, the same way photos do. Committing it unmodified publishes that in git history' +
      "\nforever, even if you later delete or replace the file — the blob doesn't go away." +
      '\n\nStrip it before committing, e.g. for clip.mp4 (same container/codec, no re-encode —' +
      '\nkeep the output extension matching the input, .mp4 or .webm):' +
      '\n  ffmpeg -i clip.mp4 -map 0:v -map 0:a? -map_metadata -1 -c copy clip.stripped.mp4' +
      '\n  mv clip.stripped.mp4 clip.mp4' +
      '\n\nUploading through /studio instead strips this automatically — see CONTENT.md\'s' +
      '\n"Video metadata" section.\n',
  );
  process.exit(1);
}
