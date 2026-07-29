#!/usr/bin/env node
// Build-time check (not a hard failure — see AGENTS.md "Content collections")
// for video weight: preview loops over 500KB and any other video over 5MB.
// Both fields are plain strings (not image()-resolved, see content.config.ts),
// so nothing in Astro's own pipeline ever inspects these files — this is the
// only thing that does.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PROJECTS_DIR = join(ROOT, 'src/content/projects');
const PUBLIC_DIR = join(ROOT, 'public');

const PREVIEW_LIMIT_BYTES = 500 * 1024;
const VIDEO_LIMIT_BYTES = 5 * 1024 * 1024;

function readFrontmatter(mdxPath) {
  const raw = readFileSync(mdxPath, 'utf-8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return parseYaml(match[1]);
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(0)}KB`;
}

function reencodeCommand(publicPath, targetKB) {
  return `ffmpeg -i "public${publicPath}" -vf format=yuv420p -c:v libx264 -crf 30 -preset slow -movflags +faststart -an "public${publicPath}" # target ~${targetKB}KB`;
}

// See AGENTS.md's "WebM siblings" note: the sibling is derived by rewriting
// the extension, not stored as its own frontmatter field, which is exactly
// why this script — like the studio's orphan detector and VideoEmbed.astro
// — has to know about the convention independently rather than reading it
// off the schema. Silent (-an) to match reencodeCommand's own encodes above,
// since every local video/preview clip in this repo is a soundless loop.
function webmCommand(publicPath) {
  const webmPath = publicPath.replace(/\.mp4$/, '.webm');
  return `ffmpeg -i "public${publicPath}" -c:v libvpx-vp9 -crf 32 -b:v 0 -an "public${webmPath}"`;
}

const slugs = existsSync(PROJECTS_DIR)
  ? readdirSync(PROJECTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];

const warnings = [];
const notices = [];

for (const slug of slugs) {
  const mdxPath = join(PROJECTS_DIR, slug, 'index.mdx');
  if (!existsSync(mdxPath)) continue;
  const frontmatter = readFrontmatter(mdxPath);
  if (!frontmatter) continue;

  const checks = [];
  if (frontmatter.preview?.src) {
    checks.push({ src: frontmatter.preview.src, limit: PREVIEW_LIMIT_BYTES, kind: 'preview loop' });
  }
  for (const video of frontmatter.videos ?? []) {
    if (video.provider === 'local' && video.src) {
      checks.push({ src: video.src, limit: VIDEO_LIMIT_BYTES, kind: 'video' });
    }
  }

  for (const { src, limit, kind } of checks) {
    if (!src.startsWith('/')) continue; // not a public/ path — nothing to stat
    const filePath = join(PUBLIC_DIR, src);
    if (!existsSync(filePath)) {
      warnings.push(`  ${slug}: ${kind} "${src}" is referenced but the file doesn't exist at public${src}.`);
      continue;
    }
    const { size } = statSync(filePath);
    if (size > limit) {
      warnings.push(
        `  ${slug}: ${kind} "${src}" is ${formatBytes(size)}, over the ${formatBytes(limit)} limit.\n` +
          `    Re-encode: ${reencodeCommand(src, Math.round(limit / 1024))}`,
      );
    }

    // Informational, not a warning: a missing WebM sibling is a missed
    // optimisation, not broken anything — VideoEmbed.astro already guards
    // against serving a <source> for one that doesn't exist (see its
    // frontmatter). Only `kind: 'video'` gets this notice: that's the only
    // place anything actually looks for the sibling. The preview loop's
    // hover-preview `<video>` (ProjectCard.astro) has no WebM handling at
    // all today, so recommending one there would be recommending dead
    // weight, not a real optimisation — see AGENTS.md's "WebM siblings" note.
    if (kind === 'video' && src.endsWith('.mp4')) {
      const webmPath = src.replace(/\.mp4$/, '.webm');
      if (!existsSync(join(PUBLIC_DIR, webmPath))) {
        notices.push(
          `  ${slug}: ${kind} "${src}" has no WebM sibling — WebM-capable browsers get the MP4 only.\n` +
            `    Generate one: ${webmCommand(src)}`,
        );
      }
    }
  }
}

if (warnings.length > 0) {
  console.warn('\n[check-video-sizes] Oversized video assets:\n');
  console.warn(warnings.join('\n\n'));
  console.warn('\nThis is a warning, not a build failure — see AGENTS.md.\n');
} else {
  console.log('[check-video-sizes] All video assets are within budget.');
}

if (notices.length > 0) {
  console.log('\n[check-video-sizes] Missed optimisation — missing WebM siblings:\n');
  console.log(notices.join('\n\n'));
  console.log('\nInformational only; MP4 playback is unaffected.\n');
}
