#!/usr/bin/env node
// Regenerates public/admin/config.yml from scripts/cms-config-template.mjs
// (which in turn imports its enums/limits from src/project-schema.ts).
// Run automatically by `npm run build`; run by hand after editing the
// template or the schema. scripts/check-cms-config.mjs is what verifies
// nobody hand-edited the output or forgot to run this.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { buildCmsConfig } from './cms-config-template.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

export function renderCmsConfigYaml() {
  const header = [
    '# GENERATED FILE — do not hand-edit.',
    '# Produced by scripts/generate-cms-config.mjs from src/project-schema.ts',
    '# (via scripts/cms-config-template.mjs). Re-run that script after changing',
    '# the schema or the template — `npm run build` already does this for you.',
    '# scripts/check-cms-config.mjs (run in CI) fails if this file is out of',
    '# date with either one.',
    '',
    '',
  ].join('\n');
  return header + stringify(buildCmsConfig(), { lineWidth: 0 });
}

// Guarded so check-cms-config.mjs can import renderCmsConfigYaml() as a
// pure function — without this check, that import would silently
// overwrite config.yml as a side effect of loading the module, which is
// exactly the kind of thing a *check* script must never do.
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const outPath = join(ROOT, 'public/admin/config.yml');
  writeFileSync(outPath, renderCmsConfigYaml());
  console.log(`[generate-cms-config] Wrote ${outPath}`);
}
