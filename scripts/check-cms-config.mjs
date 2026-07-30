#!/usr/bin/env node
// Two independent drift checks for public/admin/config.yml, run in CI on
// every PR (see .github/workflows/ci.yml):
//
//   1. Regeneration check — re-renders the config from
//      scripts/cms-config-template.mjs and fails if it doesn't match the
//      committed file byte-for-byte. Catches: someone hand-edited
//      config.yml directly, or changed the template/schema and forgot to
//      run `node scripts/generate-cms-config.mjs` (or `npm run build`,
//      which runs it automatically) before committing.
//
//   2. Field-set check — parses the committed config.yml's top-level field
//      names and compares them against the real Zod schema's actual shape
//      (src/project-schema.ts). Catches a different failure the
//      regeneration check CAN'T: someone adds or removes a field in the
//      schema but never updates cms-config-template.mjs at all, so the
//      generator's own output is internally consistent (matches what it
//      would generate) while still being wrong relative to the schema it's
//      supposed to mirror.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { z } from 'astro/zod';
import { projectSchema } from '../src/project-schema.ts';
import { buildCmsConfig, topLevelFieldNames } from './cms-config-template.mjs';
import { renderCmsConfigYaml } from './generate-cms-config.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = join(ROOT, 'public/admin/config.yml');

let failed = false;

// --- Check 1: regeneration drift ------------------------------------------
const onDisk = readFileSync(CONFIG_PATH, 'utf-8');
const freshlyGenerated = renderCmsConfigYaml();

if (onDisk !== freshlyGenerated) {
  failed = true;
  console.error(
    '\n[check-cms-config] public/admin/config.yml does not match freshly generated output.\n' +
      '  Run `node scripts/generate-cms-config.mjs` and commit the result.\n',
  );
} else {
  console.log('[check-cms-config] config.yml matches freshly generated output.');
}

// --- Check 2: field-set drift against the real schema ----------------------
const schemaFieldNames = Object.keys(projectSchema(() => z.string()).shape);
// 'body' is deliberately not in the Zod schema's shape — it's the file's
// Markdown content, not a frontmatter key — but it IS a real field in the
// CMS config, so it's expected here rather than a sign of drift.
const expectedConfigFieldNames = [...schemaFieldNames, 'body'];

const configFieldNames = topLevelFieldNames(parseYaml(onDisk));

const missingFromConfig = expectedConfigFieldNames.filter((name) => !configFieldNames.includes(name));
const extraInConfig = configFieldNames.filter((name) => !expectedConfigFieldNames.includes(name));

if (missingFromConfig.length > 0 || extraInConfig.length > 0) {
  failed = true;
  console.error('\n[check-cms-config] config.yml\'s top-level fields disagree with the schema:\n');
  if (missingFromConfig.length > 0) {
    console.error(`  In the schema but missing from config.yml: ${missingFromConfig.join(', ')}`);
  }
  if (extraInConfig.length > 0) {
    console.error(`  In config.yml but not in the schema: ${extraInConfig.join(', ')}`);
  }
  console.error('\n  Update scripts/cms-config-template.mjs to match, then regenerate.\n');
} else {
  console.log('[check-cms-config] config.yml\'s field set matches the schema exactly.');
}

// Sanity check on the template itself, independent of what's on disk — if
// this ever fails, buildCmsConfig() and topLevelFieldNames() have drifted
// from each other, which would be a bug in this script, not in config.yml.
if (topLevelFieldNames(buildCmsConfig()).length === 0) {
  failed = true;
  console.error('[check-cms-config] buildCmsConfig() produced no fields — something is broken.');
}

if (failed) {
  process.exit(1);
}
