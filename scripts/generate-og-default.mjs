#!/usr/bin/env node
// Regenerates public/og-default.png from site.config.ts's current name/
// tagline. Not part of `npm run build` — this is a fork-time step, not a
// per-build one: the image only needs regenerating when you change your
// name/tagline in site.config.ts, and running it unconditionally on every
// build would fight anyone who hand-edited the PNG afterward. Run it by
// hand: `node scripts/generate-og-default.mjs`.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import siteConfig from '../site.config.ts';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function escapeXml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

const name = escapeXml(siteConfig.name.toUpperCase());
const tagline = escapeXml(siteConfig.tagline);

// Same palette as src/styles/tokens.css — kept as literal hex here rather
// than importing tokens.css, since this script rasterizes an SVG string
// outside any CSS pipeline. Update both if the tokens change.
const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0B0D0F"/>
  <defs>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(232,234,237,0.04)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect x="0" y="0" width="6" height="630" fill="#FF6B35"/>
  <text x="80" y="300" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#E8EAED" letter-spacing="-1">${name}</text>
  <text x="80" y="360" font-family="Arial, sans-serif" font-size="30" fill="#8A939B">${tagline}</text>
  <rect x="78" y="400" width="220" height="2" fill="#00E0C6"/>
</svg>
`;

const outPath = join(ROOT, 'public/og-default.png');
sharp(Buffer.from(svg))
  .png()
  .toFile(outPath)
  .then(() => console.log(`[generate-og-default] Wrote ${outPath}`));
