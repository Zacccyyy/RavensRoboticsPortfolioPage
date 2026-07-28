import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ---------------------------------------------------------------------------
// Enum sources of truth. Every valid value for a given field lives here and
// nowhere else — the "admin system" for this site is these arrays plus the
// build failing loudly when a content file drifts from them.
// ---------------------------------------------------------------------------

export const STATUSES = ['shipped', 'in-progress', 'concept', 'archived'] as const;
export const CATEGORIES = ['software', 'hardware', 'robotics', 'build'] as const;
export const CARD_SIZES = ['sm', 'md', 'lg'] as const;

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

const projects = defineCollection({
  loader: glob({ pattern: '*/index.mdx', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: z.string(),
      tagline: z.string(),
      summary: z
        .string()
        .max(200, { error: '"summary" is too long. Keep it to 200 characters or fewer.' }),
      date: z.coerce.date(),
      status: z.enum(STATUSES, { error: enumError('status', STATUSES) }),
      category: z.enum(CATEGORIES, { error: enumError('category', CATEGORIES) }),
      featured: z.boolean().default(false),
      cardSize: z
        .enum(CARD_SIZES, { error: enumError('cardSize', CARD_SIZES) })
        .default('md'),
      tags: z
        .array(z.string())
        .max(6, { error: '"tags" has too many entries. Use 6 or fewer.' })
        .default([]),

      cover: image().optional(),
      gallery: z.array(image()).optional(),

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
              provider: z.literal('youtube'),
              id: z.string(),
              title: z.string(),
            }),
            z.object({
              provider: z.literal('vimeo'),
              id: z.string(),
              title: z.string(),
            }),
            z.object({
              provider: z.literal('local'),
              // Same rule as preview.src above: absolute /videos/... path
              // served from public/, not a relative one.
              src: z.string(),
              poster: image(),
              title: z.string(),
              caption: z.string().optional(),
            }),
          ]),
        )
        .optional(),

      links: z
        .object({
          github: z.url().optional(),
          demo: z.url().optional(),
          docs: z.url().optional(),
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

      accent: z
        .string()
        .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
          error: '"accent" must be a hex color, e.g. "#7C5CFF".',
        })
        .optional(),
    }),
});

export const collections = { projects };
