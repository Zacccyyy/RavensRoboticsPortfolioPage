// Pure schema logic for the `projects` collection — deliberately has zero
// dependency on `astro:content` (unlike content.config.ts, which imports
// this file and does the actual `defineCollection()` call). `astro:content`
// is a virtual module that only resolves inside Astro/Vite's own pipeline;
// it can't be imported by a plain `node script.mjs` process. Keeping this
// file free of it is what lets scripts/generate-cms-config.mjs and
// scripts/check-cms-config.mjs import STATUSES/CATEGORIES/CARD_SIZES/
// VIDEO_PROVIDERS/projectSchema directly at the CLI, outside any Astro
// context — the same reason src/integrations/studio-save.ts needs
// server.ssrLoadModule to reach content.config.ts, but doesn't need it to
// reach this file.
import { z, type ZodType } from 'astro/zod';

// ---------------------------------------------------------------------------
// Enum sources of truth. Every valid value for a given field lives here and
// nowhere else — the "admin system" for this site is these arrays plus the
// build failing loudly when a content file drifts from them.
// ---------------------------------------------------------------------------

export const STATUSES = ['shipped', 'in-progress', 'concept', 'archived'] as const;
export const CATEGORIES = ['software', 'hardware', 'robotics', 'build'] as const;
export const CARD_SIZES = ['sm', 'md', 'lg'] as const;
export const SUMMARY_MAX_LENGTH = 200;
export const TAGS_MAX = 6;
export const VIDEO_PROVIDERS = ['youtube', 'vimeo', 'local'] as const;

/**
 * Produces a plain-English error for an invalid/missing enum value, naming
 * the field and listing the only values the build will accept. Astro already
 * reports the offending file and field path around this message.
 */
function enumError(field: string, allowed: readonly string[]) {
  return (issue: { input?: unknown }) => {
    if (issue.input === undefined) {
      return `"${field}" is missing. Set it to one of: ${allowed.join(', ')}.`;
    }
    return `"${field}" is set to ${JSON.stringify(issue.input)}, which is not a valid value. Use one of: ${allowed.join(', ')}.`;
  };
}

/**
 * Wraps an optional string schema (a URL, a regex-validated hex color) so an
 * empty string is treated as "not provided" rather than an invalid value.
 * `.optional()` alone only tolerates the key being *absent* — a present but
 * empty string still hits the real validator underneath, and something
 * like `z.url()` correctly rejects "" as not a URL. That distinction is
 * invisible in a hand-written .mdx file (nobody types `demo: ""` on
 * purpose), but Sveltia CMS's object widget writes exactly that for a
 * blank optional sub-field instead of omitting the key — confirmed the
 * hard way when a real save with blank Demo/Docs links broke the build.
 * Stripping "" to undefined *before* the real schema runs keeps the
 * specific, useful error message for a genuinely invalid non-empty value
 * (e.g. `z.url()`'s complaint about a non-URL string) intact — this only
 * short-circuits the one blank-string case.
 */
function optionalNonEmpty<T extends ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}

// Extracted so the studio editor (src/studio/) — and now the CMS config
// generator (scripts/generate-cms-config.mjs) — can build the exact same
// Zod schema outside of Astro's content-layer loader, passing their own
// stub for `image()`, since during editing an image field is just the
// authored relative-path string, not yet a resolved asset. This is what
// keeps the editor's validation and this schema from ever drifting apart:
// there is only one schema definition, not two hand-synced copies.
export function projectSchema<ImageSchema extends ZodType>(image: () => ImageSchema) {
  return z.object({
      title: z.string(),
      slug: z.string(),
      tagline: z.string(),
      summary: z
        .string()
        .max(SUMMARY_MAX_LENGTH, {
          error: `"summary" is too long. Keep it to ${SUMMARY_MAX_LENGTH} characters or fewer.`,
        }),
      date: z.coerce.date(),
      status: z.enum(STATUSES, { error: enumError('status', STATUSES) }),
      category: z.enum(CATEGORIES, { error: enumError('category', CATEGORIES) }),
      featured: z.boolean().default(false),
      cardSize: z
        .enum(CARD_SIZES, { error: enumError('cardSize', CARD_SIZES) })
        .default('md'),
      tags: z
        .array(z.string())
        .max(TAGS_MAX, { error: `"tags" has too many entries. Use ${TAGS_MAX} or fewer.` })
        .default([]),

      cover: image().optional(),
      // Each item carries its own alt text — the gallery has no separate
      // caption field, and the Lightbox needs a real per-image description
      // to caption with, not a project-wide fallback repeated six times.
      gallery: z
        .array(
          z.object({
            src: image(),
            alt: z.string(),
          }),
        )
        .optional(),

      // `src` here is a plain string, not image() — video isn't a
      // supported asset type in Astro's content-layer pipeline, so this
      // never gets resolved to a built path. It must be an absolute
      // /videos/<slug>/<file>.mp4 path served from public/, not a
      // relative one. See "Content collections" in AGENTS.md.
      preview: z
        .object({
          src: z.string(),
          poster: image(),
        })
        .optional(),

      videos: z
        .array(
          z.discriminatedUnion('provider', [
            z.object({
              provider: z.literal(VIDEO_PROVIDERS[0]),
              id: z.string(),
              title: z.string(),
            }),
            z.object({
              provider: z.literal(VIDEO_PROVIDERS[1]),
              id: z.string(),
              title: z.string(),
            }),
            z.object({
              provider: z.literal(VIDEO_PROVIDERS[2]),
              // Same rule as preview.src above: absolute /videos/... path
              // served from public/, not a relative one.
              src: z.string(),
              poster: image(),
              title: z.string(),
              // "m:ss", e.g. "2:14" — authored, not probed from the file at
              // build time. Keeps the schema self-contained (no ffprobe
              // dependency for a template repo other people fork) and
              // matches the existing precedent of downloads[].size, which
              // is also human-provided metadata about a binary asset rather
              // than something computed from it.
              duration: z.string(),
              caption: z.string().optional(),
            }),
          ]),
        )
        .optional(),

      links: z
        .object({
          github: optionalNonEmpty(z.url()),
          demo: optionalNonEmpty(z.url()),
          docs: optionalNonEmpty(z.url()),
        })
        .optional(),

      downloads: z
        .array(
          z.object({
            label: z.string(),
            url: z.string(),
            size: z.string(),
          }),
        )
        .optional(),

      accent: optionalNonEmpty(
        z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
          error: '"accent" must be a hex color, e.g. "#7C5CFF".',
        }),
      ),
  });
}
