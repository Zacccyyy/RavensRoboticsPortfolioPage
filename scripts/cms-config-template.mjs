// The actual shape of public/admin/config.yml, as a plain JS object rather
// than hand-written YAML. Consumed by both generate-cms-config.mjs (writes
// the file) and check-cms-config.mjs (verifies the committed file matches
// this, unmodified) — one definition, two consumers, so they can't disagree
// with each other the way a hand-maintained YAML file could disagree with
// the schema it was supposed to mirror.
//
// Widget choices, hints, media-folder paths, and nesting are NOT derivable
// from the Zod schema — Zod knows a field is a string, not that it should
// render as a `color` widget or land in `gallery/` on disk. Those choices
// are hand-authored here, same as /studio's hand-written form markup is.
// What IS schema-derived — and imported, not re-typed — is every enum
// option list and every numeric limit: STATUSES, CATEGORIES, CARD_SIZES,
// VIDEO_PROVIDERS, SUMMARY_MAX_LENGTH, TAGS_MAX. That's the part that
// actually drifts if hand-duplicated, so that's the part this generates.
import {
  STATUSES,
  CATEGORIES,
  CARD_SIZES,
  VIDEO_PROVIDERS,
  SUMMARY_MAX_LENGTH,
  TAGS_MAX,
} from '../src/project-schema.ts';

// Which GitHub repo the CMS commits to — not schema-derived (it has nothing
// to do with content.config.ts), a real value like site.config.ts's
// siteUrl. Update this if you fork the repo; see README.md.
const REPO = 'Zacccyyy/RavensRoboticsPortfolioPage';

export function buildCmsConfig() {
  return {
    backend: {
      name: 'github',
      repo: REPO,
      branch: 'main',
      // No base_url/OAuth app configured, deliberately — see README.md's
      // "Optional: editing from a browser" section. This is what surfaces
      // "Sign In Using Access Token" as a real option on the login screen,
      // instead of requiring an OAuth proxy server.
      publish_mode: 'simple',
    },

    media_folder: '',
    public_folder: '',

    collections: [
      {
        name: 'projects',
        label: 'Projects',
        label_singular: 'Project',
        folder: 'src/content/projects',
        // {{fields.slug}}, not the auto title-derived {{slug}} tag — so the
        // folder name and the frontmatter `slug` field are always the same
        // typed string. `slug` is a real required field in the schema, not
        // something Astro derives from the folder name.
        path: '{{fields.slug}}/index',
        extension: 'mdx',
        format: 'frontmatter',
        frontmatter_delimiter: '---',
        create: true,
        fields: [
          { name: 'title', label: 'Title', widget: 'string' },
          {
            name: 'slug',
            label: 'Slug',
            widget: 'string',
            pattern: [
              '^[a-z0-9]+(-[a-z0-9]+)*$',
              'Lowercase letters, numbers, and hyphens only — this becomes the folder name and the URL.',
            ],
          },
          { name: 'tagline', label: 'Tagline', widget: 'string', hint: 'One sentence.' },
          {
            name: 'summary',
            label: 'Summary',
            widget: 'text',
            pattern: [
              `^.{1,${SUMMARY_MAX_LENGTH}}$`,
              `Keep it to ${SUMMARY_MAX_LENGTH} characters or fewer — this is the meta description and OG/Twitter card text.`,
            ],
          },
          {
            name: 'date',
            label: 'Date of Origin',
            widget: 'datetime',
            format: 'YYYY-MM-DD',
            date_format: true,
            time_format: false,
          },
          { name: 'status', label: 'Status', widget: 'select', options: [...STATUSES] },
          { name: 'category', label: 'Category', widget: 'select', options: [...CATEGORIES] },
          { name: 'featured', label: 'Featured', widget: 'boolean', default: false, required: false },
          {
            name: 'cardSize',
            label: 'Card Size',
            widget: 'select',
            options: [...CARD_SIZES],
            default: 'md',
            required: false,
          },
          { name: 'tags', label: 'Tags', widget: 'list', required: false, max: TAGS_MAX, default: [] },
          {
            name: 'accent',
            label: 'Accent Colour',
            widget: 'color',
            required: false,
            enableAlpha: false,
            hint: 'Optional per-project accent, e.g. #4FD97A. No UI for this in the old studio editor.',
          },
          {
            name: 'cover',
            label: 'Cover Image',
            widget: 'image',
            required: false,
            hint: 'Omit for a text-forward card instead of an image card (see PID CONTROLLER).',
          },
          {
            name: 'gallery',
            label: 'Gallery',
            widget: 'list',
            required: false,
            summary: '{{fields.alt}}',
            fields: [
              { name: 'src', label: 'Image', widget: 'image', media_folder: 'gallery', public_folder: './gallery' },
              {
                name: 'alt',
                label: 'Alt Text',
                widget: 'string',
                hint: "Describe this specific photo — it's the lightbox caption, not the project tagline repeated.",
              },
            ],
          },
          {
            name: 'preview',
            label: 'Preview Loop (homepage hover video)',
            widget: 'object',
            required: false,
            fields: [
              {
                name: 'src',
                label: 'Video File',
                widget: 'file',
                media_folder: '/public/videos/{{fields.slug}}',
                public_folder: '/videos/{{fields.slug}}',
                hint: 'Silent loop, ideally under 500KB — it autoplays on hover on the homepage for every visitor.',
              },
              { name: 'poster', label: 'Poster Image', widget: 'image' },
            ],
          },
          {
            name: 'videos',
            label: 'Videos',
            widget: 'list',
            required: false,
            typeKey: 'provider',
            summary: '{{fields.title}} ({{fields.provider}})',
            types: [
              {
                name: VIDEO_PROVIDERS[0],
                label: 'YouTube',
                fields: [
                  { name: 'id', label: 'Video ID', widget: 'string', hint: 'The part after ?v= in the YouTube URL.' },
                  { name: 'title', label: 'Title', widget: 'string' },
                ],
              },
              {
                name: VIDEO_PROVIDERS[1],
                label: 'Vimeo',
                fields: [
                  { name: 'id', label: 'Video ID', widget: 'string' },
                  { name: 'title', label: 'Title', widget: 'string' },
                ],
              },
              {
                name: VIDEO_PROVIDERS[2],
                label: 'Local File',
                fields: [
                  {
                    name: 'src',
                    label: 'Video File',
                    widget: 'file',
                    media_folder: '/public/videos/{{fields.slug}}',
                    public_folder: '/videos/{{fields.slug}}',
                    hint: "Keep under ~5MB — see CONTENT.md's media policy.",
                  },
                  { name: 'poster', label: 'Poster Image', widget: 'image' },
                  { name: 'title', label: 'Title', widget: 'string' },
                  {
                    name: 'duration',
                    label: 'Duration',
                    widget: 'string',
                    pattern: ['^[0-9]+:[0-9]{2}$', 'Use m:ss format, e.g. 2:14 — authored, not measured from the file.'],
                  },
                  { name: 'caption', label: 'Caption', widget: 'string', required: false },
                ],
              },
            ],
          },
          {
            name: 'links',
            label: 'Links',
            widget: 'object',
            required: false,
            fields: [
              { name: 'github', label: 'GitHub', widget: 'string', required: false },
              { name: 'demo', label: 'Live Demo', widget: 'string', required: false },
              { name: 'docs', label: 'Docs', widget: 'string', required: false },
            ],
          },
          {
            name: 'downloads',
            label: 'Downloads',
            widget: 'list',
            required: false,
            summary: '{{fields.label}}',
            fields: [
              { name: 'label', label: 'Label', widget: 'string' },
              {
                name: 'url',
                label: 'URL',
                widget: 'string',
                hint: 'Absolute /downloads/... path for small text files, or a GitHub Release asset URL for anything large — see CONTENT.md.',
              },
              {
                name: 'size',
                label: 'File Size',
                widget: 'string',
                hint: 'Authored, e.g. "12.4 MB" — not measured automatically.',
              },
            ],
          },
          {
            name: 'body',
            label: 'Body',
            widget: 'markdown',
            hint: "Saved as the file's Markdown/MDX body, below the frontmatter — not a frontmatter field itself.",
          },
        ],
      },
    ],
  };
}

/** Every top-level frontmatter field name this config declares, plus
 * 'body' — which isn't in the Zod schema's shape (it's the file's Markdown
 * content, not a frontmatter key) but IS a real field here. Used by
 * check-cms-config.mjs to cross-check against the schema's actual shape. */
export function topLevelFieldNames(config) {
  return config.collections[0].fields.map((field) => field.name);
}
