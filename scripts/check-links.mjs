#!/usr/bin/env node
// Broken-link check, run against the built `dist/` output (CI runs this
// after `npm run build`, not before). Internal links only, on purpose:
// this template ships with placeholder URLs (`https://github.com/your-handle/...`)
// in the demo content and example config by design — checking external
// links would fail CI on every untouched fork's first build for a URL
// that was never supposed to resolve yet, before anyone's had a chance to
// fill in their own. Internal links are exactly what a template bug would
// actually break (a typo'd href, a missing asset), so that's what this
// checks.

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, 'dist');

if (!existsSync(DIST)) {
  console.error('[check-links] dist/ not found — run `npm run build` first.');
  process.exit(1);
}

function findHtmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findHtmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function isInternal(url) {
  if (!url) return false;
  if (url.startsWith('#')) return false; // pure in-page fragment
  if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(url)) return false;
  return true;
}

/** Resolves an internal href/src to a real file under dist/, the same way
 * a static file server would: a directory gets its index.html, a trailing
 * slash implies the same, query/hash are stripped first. */
function resolveTarget(url, fromFile) {
  const withoutHash = url.split('#')[0].split('?')[0];
  if (!withoutHash) return null; // was only a hash/query, nothing to check

  let target = withoutHash.startsWith('/') ? join(DIST, withoutHash) : resolve(dirname(fromFile), withoutHash);

  if (existsSync(target) && statSync(target).isDirectory()) {
    target = join(target, 'index.html');
  }
  return target;
}

const htmlFiles = findHtmlFiles(DIST);
const broken = [];
const hrefPattern = /<(?:a|link)\s[^>]*?(?:href)="([^"]+)"/gi;
const srcPattern = /<(?:img|script|source|video|audio)\s[^>]*?src="([^"]+)"/gi;

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf-8');
  const urls = new Set();
  for (const m of html.matchAll(hrefPattern)) urls.add(m[1]);
  for (const m of html.matchAll(srcPattern)) urls.add(m[1]);

  for (const url of urls) {
    if (!isInternal(url)) continue;
    const target = resolveTarget(url, file);
    if (!target) continue;
    if (!existsSync(target)) {
      broken.push({ file: file.replace(DIST, 'dist'), url, target: target.replace(DIST, 'dist') });
    }
  }
}

if (broken.length > 0) {
  console.error(`\n[check-links] ${broken.length} broken internal link(s):\n`);
  for (const { file, url, target } of broken) {
    console.error(`  ${file} -> "${url}" (expected ${target})`);
  }
  console.error('');
  process.exit(1);
}

console.log(`[check-links] Checked ${htmlFiles.length} page(s), all internal links resolve.`);
