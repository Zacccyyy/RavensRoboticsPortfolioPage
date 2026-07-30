import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectSchema } from './project-schema';

// The schema itself lives in project-schema.ts, which has no dependency on
// `astro:content` — this file's only job is the Astro-specific wiring
// (defineCollection + the glob loader). See project-schema.ts for why that
// split exists: scripts/generate-cms-config.mjs and
// scripts/check-cms-config.mjs need to import STATUSES/CATEGORIES/
// CARD_SIZES/VIDEO_PROVIDERS/projectSchema from plain `node`, outside any
// Astro context, and `astro:content` can't be resolved there.
export * from './project-schema';

const projects = defineCollection({
  loader: glob({ pattern: '*/index.mdx', base: './src/content/projects' }),
  schema: ({ image }) => projectSchema(image),
});

export const collections = { projects };
