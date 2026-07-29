#!/usr/bin/env node
// Pre-commit guard (invoked by .husky/pre-commit) — rejects any staged file
// over 40MB outright, or any .mp4/.webm over 8MB specifically, before it
// can land in git history. Git repos don't shrink when a big binary is
// later deleted — the blob stays in every clone's history forever — so this
// has to catch it before the commit, not after.
//
// The two-tier media policy this enforces (see CONTENT.md): short clips are
// self-hosted (public/videos/<slug>/, under ~5MB per AGENTS.md's own
// build-time check), anything larger belongs on GitHub Releases and gets
// linked via downloads[].url instead of committed at all.

import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const MAX_ANY_BYTES = 40 * 1024 * 1024;
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
  encoding: 'utf-8',
})
  .split('\n')
  .filter(Boolean);

const violations = [];

for (const file of staged) {
  let size;
  try {
    size = statSync(file).size;
  } catch {
    continue; // deleted/renamed away between staging and this check
  }

  const isVideo = /\.(mp4|webm)$/i.test(file);
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_ANY_BYTES;

  if (size > limit) {
    violations.push({ file, size, limit, isVideo });
  }
}

if (violations.length > 0) {
  console.error('\n[pre-commit] Blocked — file(s) over the size policy:\n');
  for (const { file, size, limit, isVideo } of violations) {
    const mb = (size / (1024 * 1024)).toFixed(1);
    const limitMb = (limit / (1024 * 1024)).toFixed(0);
    console.error(`  ${file} — ${mb}MB (limit: ${limitMb}MB${isVideo ? ', video' : ''})`);
  }
  console.error(
    '\nThis repo keeps large binaries out of git history — a committed-then-deleted file' +
      "\nstill bloats every future clone forever, it doesn't just disappear." +
      '\n\nWhat to do instead:' +
      '\n  - Video over 8MB: re-encode it smaller (see CONTENT.md\'s media policy), or' +
      '\n  - Any file over 40MB (firmware, STEP files, zips, etc.): upload it as a GitHub' +
      '\n    Release asset and link it via a project\'s `downloads[].url` field instead.' +
      '\n\nSee CONTENT.md for the full two-tier media policy.\n',
  );
  process.exit(1);
}
