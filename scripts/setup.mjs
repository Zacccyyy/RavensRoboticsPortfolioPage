#!/usr/bin/env node
// `npm run setup` — a post-install sanity check + reminder, not a
// bootstrap step. site.config.ts and src/content/projects/ are real,
// committed files (this repo is a live site first, a fork template
// second — see README.md), so there's nothing here to copy into place.
// This script never overwrites or deletes anything; the only file it
// writes is the generated OG image, which is exactly what it's for.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

if (!existsSync(join(ROOT, 'site.config.ts'))) {
  console.error(
    '[setup] site.config.ts is missing. It should be a committed file — did something delete it?' +
      '\n         Restore it from git, or copy site.config.example.ts to site.config.ts as a starting point.',
  );
  process.exit(1);
}

await import('./generate-og-default.mjs');

console.log(`
[setup] Install looks good. If you're setting this up as your own fork
(rather than working on the original site), you still need to:

  1. Edit site.config.ts with your own name/bio/links.
     (site.config.example.ts documents every field, if you want the reference.)
  2. Delete the example projects in src/content/projects/ — avian-visitors/,
     lyric-panel/, pid-controller/, skywarden/, terrapod/ — and their video
     assets in public/videos/terrapod/. They're real working examples for
     you to learn the schema from, not placeholder content: if you don't
     remove them, they publish as-is on your site.
  3. Add your own projects — open /studio (\`npm run dev\`) or, if you're
     using Claude Code, run /new-project.
  4. Re-run \`node scripts/generate-og-default.mjs\` any time you change
     name/tagline in site.config.ts — this script just ran it once, but
     against whatever was in site.config.ts *right now*.

See README.md's Quickstart for the full walkthrough.
`);
