// Core logic for the /studio content editor's write path. Lives outside
// src/studio and src/components on purpose: it's imported both by
// studio-dev.ts (only ever running inside the `astro:server:setup` hook,
// i.e. only under `astro dev`) and directly by the studio pages themselves
// (which are only ever injected into the router in dev — see
// studio-dev.ts's `astro:config:setup` hook). Either way, this never runs
// in a production build.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import sharp from 'sharp';
import { z } from 'astro:content';
import { projectSchema } from '../content.config';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PROJECTS_DIR = join(ROOT, 'src/content/projects');
const PUBLIC_VIDEOS_DIR = join(ROOT, 'public/videos');

const MAX_IMAGE_WIDTH = 2500;

type ImageInput =
  | { kind: 'existing'; path: string }
  | { kind: 'upload'; dataUrl: string; filename: string };

type FileInput =
  | { kind: 'existing'; path: string }
  | { kind: 'upload'; dataUrl: string; filename: string };

interface SavePayload {
  previousSlug: string | null;
  data: {
    title: string;
    slug: string;
    tagline: string;
    summary: string;
    date: string;
    status: string;
    category: string;
    featured: boolean;
    cardSize: string;
    tags: string[];
    accent: string;
    cover: ImageInput | null;
    gallery: Array<{ alt: string; image: ImageInput }>;
    preview: { src: FileInput | null; poster: ImageInput | null } | null;
    videos: Array<
      | { provider: 'youtube' | 'vimeo'; id: string; title: string }
      | {
          provider: 'local';
          title: string;
          duration: string;
          caption: string;
          src: FileInput | null;
          poster: ImageInput | null;
        }
    >;
    links: { github: string; demo: string; docs: string };
    downloads: Array<{ label: string; url: string; size: string }>;
  };
  body: string;
}

export interface SaveResult {
  ok: boolean;
  status: number;
  path?: string;
  errors?: Record<string, string[]>;
}

function slugifyName(input: string, fallback: string): string {
  const slug = input
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || fallback;
}

function extFromMime(mime: string): string {
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'image/jpeg') return 'jpg';
  const parts = mime.split('/');
  return parts[1] || 'bin';
}

function decodeDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) throw new Error('Malformed upload: expected a base64 data URL.');
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

/**
 * Writes an uploaded image into `destDirAbs/<baseName>.<ext>`, resizing it
 * down to MAX_IMAGE_WIDTH wide (preserving aspect ratio) if the original is
 * wider. SVGs are left untouched — they're vector, "wide" doesn't apply.
 * Returns the relative frontmatter path, e.g. "./cover.jpg".
 */
async function writeImage(
  upload: { dataUrl: string; filename: string },
  destDirAbs: string,
  baseName: string,
  relPrefix: string,
): Promise<string> {
  const { mime, buffer } = decodeDataUrl(upload.dataUrl);
  const ext = extFromMime(mime);
  mkdirSync(destDirAbs, { recursive: true });
  const filename = `${baseName}.${ext}`;
  const destAbs = join(destDirAbs, filename);

  if (ext === 'svg') {
    writeFileSync(destAbs, buffer);
  } else {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const pipeline =
      metadata.width && metadata.width > MAX_IMAGE_WIDTH
        ? image.resize({ width: MAX_IMAGE_WIDTH })
        : image;
    writeFileSync(destAbs, await pipeline.toBuffer());
  }

  return `${relPrefix}${filename}`;
}

async function resolveImage(
  input: ImageInput,
  destDirAbs: string,
  baseName: string,
  relPrefix: string,
): Promise<string> {
  if (input.kind === 'existing') return input.path;
  return writeImage(input, destDirAbs, baseName, relPrefix);
}

function resolveVideoFile(input: FileInput, slug: string): string {
  if (input.kind === 'existing') return input.path;
  const { buffer } = decodeDataUrl(input.dataUrl);
  const destDir = join(PUBLIC_VIDEOS_DIR, slug);
  mkdirSync(destDir, { recursive: true });
  const filename = slugifyName(input.filename, 'video') + (input.filename.match(/\.[a-z0-9]+$/i)?.[0] ?? '.mp4');
  writeFileSync(join(destDir, filename), buffer);
  return `/videos/${slug}/${filename}`;
}

/** Builds the frontmatter object, running image uploads as a side effect. */
async function buildFrontmatter(payload: SavePayload, slug: string, destDirAbs: string) {
  const d = payload.data;

  const frontmatter: Record<string, unknown> = {
    title: d.title,
    slug,
    tagline: d.tagline,
    summary: d.summary,
    date: d.date,
    status: d.status,
    category: d.category,
    featured: d.featured,
    cardSize: d.cardSize,
    tags: d.tags,
  };

  if (d.accent) frontmatter.accent = d.accent;

  if (d.cover) {
    frontmatter.cover = await resolveImage(d.cover, destDirAbs, 'cover', './');
  }

  if (d.gallery.length > 0) {
    const galleryDir = join(destDirAbs, 'gallery');
    frontmatter.gallery = await Promise.all(
      d.gallery.map(async (item, index) => ({
        src: await resolveImage(
          item.image,
          galleryDir,
          `${String(index + 1).padStart(2, '0')}-${slugifyName(item.alt, 'image')}`,
          './gallery/',
        ),
        alt: item.alt,
      })),
    );
  }

  if (d.preview) {
    const previewEntry: Record<string, unknown> = {};
    if (d.preview.src) previewEntry.src = resolveVideoFile(d.preview.src, slug);
    if (d.preview.poster) {
      previewEntry.poster = await resolveImage(d.preview.poster, destDirAbs, 'preview-poster', './');
    }
    frontmatter.preview = previewEntry;
  }

  if (d.videos.length > 0) {
    let localIndex = 0;
    frontmatter.videos = await Promise.all(
      d.videos.map(async (video) => {
        if (video.provider === 'local') {
          localIndex += 1;
          const entry: Record<string, unknown> = {
            provider: 'local',
            title: video.title,
            duration: video.duration,
          };
          if (video.src) entry.src = resolveVideoFile(video.src, slug);
          if (video.poster) {
            entry.poster = await resolveImage(video.poster, destDirAbs, `video-${localIndex}-poster`, './');
          }
          if (video.caption) entry.caption = video.caption;
          return entry;
        }
        return { provider: video.provider, id: video.id, title: video.title };
      }),
    );
  }

  const links: Record<string, string> = {};
  if (d.links.github) links.github = d.links.github;
  if (d.links.demo) links.demo = d.links.demo;
  if (d.links.docs) links.docs = d.links.docs;
  if (Object.keys(links).length > 0) frontmatter.links = links;

  if (d.downloads.length > 0) frontmatter.downloads = d.downloads;

  return frontmatter;
}

/** Same shape as buildFrontmatter, but with cheap placeholders instead of
 * running any image uploads — used to validate before touching disk. */
function buildFrontmatterForValidation(payload: SavePayload, slug: string) {
  const d = payload.data;
  const placeholder = (input: ImageInput) => (input.kind === 'existing' ? input.path : './pending.jpg');
  const filePlaceholder = (input: FileInput) => (input.kind === 'existing' ? input.path : '/videos/pending/pending.mp4');

  const frontmatter: Record<string, unknown> = {
    title: d.title,
    slug,
    tagline: d.tagline,
    summary: d.summary,
    date: d.date,
    status: d.status,
    category: d.category,
    featured: d.featured,
    cardSize: d.cardSize,
    tags: d.tags,
  };
  if (d.accent) frontmatter.accent = d.accent;
  if (d.cover) frontmatter.cover = placeholder(d.cover);
  if (d.gallery.length > 0) {
    frontmatter.gallery = d.gallery.map((item) => ({
      src: placeholder(item.image),
      alt: item.alt,
    }));
  }
  if (d.preview) {
    const previewEntry: Record<string, unknown> = {};
    if (d.preview.src) previewEntry.src = filePlaceholder(d.preview.src);
    if (d.preview.poster) previewEntry.poster = placeholder(d.preview.poster);
    frontmatter.preview = previewEntry;
  }
  if (d.videos.length > 0) {
    frontmatter.videos = d.videos.map((video) => {
      if (video.provider === 'local') {
        const entry: Record<string, unknown> = {
          provider: 'local',
          title: video.title,
          duration: video.duration,
        };
        if (video.src) entry.src = filePlaceholder(video.src);
        if (video.poster) entry.poster = placeholder(video.poster);
        if (video.caption) entry.caption = video.caption;
        return entry;
      }
      return { provider: video.provider, id: video.id, title: video.title };
    });
  }
  const links: Record<string, string> = {};
  if (d.links.github) links.github = d.links.github;
  if (d.links.demo) links.demo = d.links.demo;
  if (d.links.docs) links.docs = d.links.docs;
  if (Object.keys(links).length > 0) frontmatter.links = links;
  if (d.downloads.length > 0) frontmatter.downloads = d.downloads;

  return frontmatter;
}

export async function saveProject(payload: SavePayload): Promise<SaveResult> {
  const slug = payload.data.slug.trim();
  if (!slug) {
    return { ok: false, status: 400, errors: { slug: ['Slug is required.'] } };
  }

  const destDirAbs = join(PROJECTS_DIR, slug);
  const isRename = Boolean(payload.previousSlug) && payload.previousSlug !== slug;
  const isNew = !payload.previousSlug;

  if (isNew && existsSync(destDirAbs)) {
    return {
      ok: false,
      status: 400,
      errors: { slug: [`A project already exists at src/content/projects/${slug}/. Choose a different slug.`] },
    };
  }
  if (isRename && existsSync(destDirAbs)) {
    return {
      ok: false,
      status: 400,
      errors: { slug: [`Can't rename to "${slug}" — src/content/projects/${slug}/ already exists.`] },
    };
  }

  // Validate against the real content schema before writing anything.
  const validationFrontmatter = buildFrontmatterForValidation(payload, slug);
  const schema = projectSchema(() => z.string());
  const parsed = schema.safeParse(validationFrontmatter);
  if (!parsed.success) {
    const flattened = z.flattenError(parsed.error);
    const errors: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(flattened.fieldErrors)) {
      if (messages) errors[key] = messages as string[];
    }
    if (flattened.formErrors.length > 0) errors._form = flattened.formErrors;
    return { ok: false, status: 400, errors };
  }

  // Past this point we're committed to writing. Rename the directory first
  // (if the slug changed on an existing entry) so image uploads land in the
  // right place.
  const previousDirAbs = payload.previousSlug ? join(PROJECTS_DIR, payload.previousSlug) : null;
  if (isRename && previousDirAbs && existsSync(previousDirAbs)) {
    mkdirSync(dirname(destDirAbs), { recursive: true });
    renameSync(previousDirAbs, destDirAbs);
  } else {
    mkdirSync(destDirAbs, { recursive: true });
  }

  const frontmatter = await buildFrontmatter(payload, slug, destDirAbs);
  const yamlBody = stringifyYaml(frontmatter, {
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
    lineWidth: 0,
  });
  const fileContents = `---\n${yamlBody}---\n\n${payload.body.trim()}\n`;

  writeFileSync(join(destDirAbs, 'index.mdx'), fileContents);

  const relPath = `src/content/projects/${slug}/index.mdx`;
  return { ok: true, status: 200, path: relPath };
}

export function readProjectRaw(slug: string): { frontmatterRaw: string; body: string } | null {
  const mdxPath = join(PROJECTS_DIR, slug, 'index.mdx');
  if (!existsSync(mdxPath)) return null;
  const raw = readFileSync(mdxPath, 'utf-8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  return { frontmatterRaw: match[1], body: match[2].trim() };
}

// ---------------------------------------------------------------------------
// Orphan detection & manual cleanup. "Orphan" = a file physically present in
// a project's content folder or public/videos/<slug>/ that no field in the
// current frontmatter points to — most commonly left behind after a cover
// is replaced or a gallery/video row is removed in the editor (removing a
// row only drops the frontmatter reference; it never touches disk itself,
// see project-form-client.ts). Detection is read-only; deletion is a
// separate, explicit, confirm-gated action — nothing here runs on save.
// ---------------------------------------------------------------------------
export interface OrphanReport {
  content: string[]; // relative to src/content/projects/<slug>/, excludes index.mdx
  video: string[]; // relative to public/videos/<slug>/
}

function listFilesRecursive(dir: string, base = ''): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFilesRecursive(join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

function normalizeRelPath(p: string): string {
  return p.replace(/^\.\//, '');
}

/** Every content-dir-relative path (cover, gallery, posters) the frontmatter
 * currently references, resolved the same way the editor resolves them. */
function referencedContentPaths(fm: Record<string, any>): Set<string> {
  const refs = new Set<string>();
  if (fm.cover) refs.add(normalizeRelPath(fm.cover));
  for (const g of fm.gallery ?? []) if (g?.src) refs.add(normalizeRelPath(g.src));
  if (fm.preview?.poster) refs.add(normalizeRelPath(fm.preview.poster));
  for (const v of fm.videos ?? []) {
    if (v?.provider === 'local' && v.poster) refs.add(normalizeRelPath(v.poster));
  }
  return refs;
}

/**
 * Every public/videos/<slug>/-relative path the frontmatter references —
 * plus, for a local `videos[]` entry's .mp4, its .webm sibling.
 * VideoEmbed.astro derives that sibling by rewriting the extension rather
 * than storing it as its own frontmatter field (see AGENTS.md's "WebM
 * siblings" note), so it would otherwise look unreferenced and get flagged
 * as an orphan even though it's the file VideoEmbed serves to WebM-capable
 * browsers.
 *
 * `preview.src` deliberately does NOT get the same treatment: ProjectCard's
 * hover-preview `<video>` only ever emits an MP4 `<source>` — it doesn't
 * look for a WebM sibling at all (unlike VideoEmbed, which does, and now
 * guards against a missing one — see VideoEmbed.astro). A `preview-loop.webm`
 * sitting next to `preview-loop.mp4` is therefore a real orphan today, not
 * a false positive: nothing serves it. If that changes (ProjectCard grows
 * the same WebM-source handling VideoEmbed has), move `preview.src` into
 * the webm-sibling branch below to match.
 */
function referencedVideoPaths(fm: Record<string, any>, slug: string): Set<string> {
  const refs = new Set<string>();
  const prefix = `/videos/${slug}/`;
  const relOf = (src: string) => (src.startsWith(prefix) ? src.slice(prefix.length) : null);

  const previewRel = typeof fm.preview?.src === 'string' ? relOf(fm.preview.src) : null;
  if (previewRel) refs.add(previewRel);

  for (const v of fm.videos ?? []) {
    if (v?.provider !== 'local' || typeof v.src !== 'string') continue;
    const rel = relOf(v.src);
    if (!rel) continue;
    refs.add(rel);
    if (rel.endsWith('.mp4')) refs.add(rel.replace(/\.mp4$/, '.webm'));
  }
  return refs;
}

export function computeOrphans(slug: string): OrphanReport {
  const raw = readProjectRaw(slug);
  if (!raw) return { content: [], video: [] };
  const fm = parseYaml(raw.frontmatterRaw) as Record<string, any>;

  const contentDir = join(PROJECTS_DIR, slug);
  const referencedContent = referencedContentPaths(fm);
  const content = listFilesRecursive(contentDir).filter(
    (f) => f !== 'index.mdx' && !referencedContent.has(f),
  );

  const videoDir = join(PUBLIC_VIDEOS_DIR, slug);
  const referencedVideo = referencedVideoPaths(fm, slug);
  const video = listFilesRecursive(videoDir).filter((f) => !referencedVideo.has(f));

  return { content, video };
}

export interface DeleteOrphansResult {
  deleted: string[];
  skipped: string[];
}

/**
 * Deletes only paths that are *still* orphans at the moment of the call —
 * recomputed fresh here rather than trusting whatever list the client last
 * saw, so a file that became referenced between page load and the delete
 * click (or any path that was never a real orphan to begin with) is
 * silently skipped rather than removed. This is the only place in the
 * studio that deletes a file, and it's only ever reached from an explicit,
 * user-confirmed "delete selected" action — never from save.
 */
export function deleteOrphans(slug: string, requested: { content: string[]; video: string[] }): DeleteOrphansResult {
  const fresh = computeOrphans(slug);
  const deleted: string[] = [];
  const skipped: string[] = [];

  const contentDir = join(PROJECTS_DIR, slug);
  for (const p of requested.content ?? []) {
    if (!fresh.content.includes(p)) {
      skipped.push(`content:${p}`);
      continue;
    }
    const abs = join(contentDir, p);
    if (relative(contentDir, abs).startsWith('..')) {
      skipped.push(`content:${p}`);
      continue;
    }
    rmSync(abs, { force: true });
    deleted.push(`content:${p}`);
  }

  const videoDir = join(PUBLIC_VIDEOS_DIR, slug);
  for (const p of requested.video ?? []) {
    if (!fresh.video.includes(p)) {
      skipped.push(`video:${p}`);
      continue;
    }
    const abs = join(videoDir, p);
    if (relative(videoDir, abs).startsWith('..')) {
      skipped.push(`video:${p}`);
      continue;
    }
    rmSync(abs, { force: true });
    deleted.push(`video:${p}`);
  }

  return { deleted, skipped };
}
