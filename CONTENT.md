# Adding & editing content

This doc covers two things: the content schema (every field, what it does,
what happens if you get it wrong) and a plain-language walkthrough for
adding a project — no coding required for that part, though editing
`index.mdx` files by hand is also always an option.

## The two ways to add content

**The studio editor** (`npm run dev`, then open `http://localhost:4321/studio`)
is a local-only form: fill in fields, drop in images, click Save, and it
writes the files for you in the right place, in the right format. This is
the path most people should use — skip to
["Adding a project, step by step"](#adding-a-project-step-by-step) below.

**By hand**: every project is a folder at `src/content/projects/<slug>/`
containing an `index.mdx` file (frontmatter + a Markdown/MDX body) plus
whatever images that entry references, colocated in the same folder. If
you're comfortable editing YAML frontmatter directly, copy an existing
project folder as a starting point and edit it. The schema section below
tells you exactly what's required and what the valid values are.

Either way, **the studio and the schema are generated from the same
source** (`src/content.config.ts`) — the dropdowns in the editor can never
offer a value the build would reject, because they're built from the exact
same list.

---

## Adding a project, step by step

This assumes you've already run `npm run dev` (see README.md if not) and
have `http://localhost:4321/studio` open.

1. **Click "NEW PROJECT"** in the sidebar.
2. **01. BASICS** — type a title. The URL slug fills in automatically as you
   type (e.g. "My Cool Robot" → `my-cool-robot`); click REGENERATE if you
   edit the title after typing a slug by hand and want it to resync. Fill in
   the date, a one-sentence tagline, and a summary (this is what shows up in
   search results and link previews — keep it under 200 characters, the
   field will tell you if you go over).
3. **02. CLASSIFICATION** — pick a status and category from the dropdowns
   (see the [Statuses](#statuses) and [Categories](#categories) tables below
   for what each one means), a card size, and add a few tags. Toggle
   "Featured" if you want it pinned to the top of the homepage grid.
4. **03. MEDIA** — drop in a cover image (this is what shows on the homepage
   card and at the top of the project page). If you have more photos, drop
   them into the gallery grid — write a real, specific caption for each one
   in the alt text field, not just the project name six times; that caption
   is what shows up in the lightbox. Add video links or files if you have
   any — see [Media policy](#media-policy) below for the size guidance the
   editor doesn't enforce for you.
5. **04. LINKS** — GitHub repo, live demo, docs — whatever applies. Leave any
   of them blank and that button just won't show up on the page.
6. **05. DOWNLOADS** — for files people might want to download (a BOM, a
   pinout diagram, firmware). See [Media policy](#media-policy) — anything
   over a few MB shouldn't be a direct link into this repo.
7. **06. BODY** — write the actual write-up in Markdown. Click "Preview" to
   see it rendered before saving.
8. **Click "SAVE TO DISK"**. The footer shows you the exact file path it
   wrote. If anything's invalid (a required field is empty, the summary's
   too long, etc.) you'll see the specific error inline instead — fix it and
   save again.
9. **Check it** at `http://localhost:4321/projects/<slug>/` and on the
   homepage — no restart needed, the dev server picks up a new project
   live, usually within a second or two.
10. **Ship it** — see README.md's Quickstart for the git commands and how
    Cloudflare Pages picks it up.

**On deleting things:** removing an image, video, or download row in the
editor only removes the *reference* — it never deletes the underlying file
from disk. That's deliberate (see AGENTS.md); it means you can always
recover from an accidental removal by re-adding the same file, and it means
old files can accumulate as orphans over time. The project list page in the
studio shows an "Orphaned files" count per project when this happens, with
a manual, confirm-gated way to clean them up — nothing is ever deleted
automatically.

---

## Schema reference

Every field below lives in the schema at `src/content.config.ts` — that
file is the actual source of truth; this table explains what each field
means and shows a realistic value. Fields marked **required** cause a build
failure if missing; everything else is optional.

| Field | Required | Type | Example | Notes |
|---|---|---|---|---|
| `title` | ✅ | string | `"TERRAPOD"` | Shown as the card/page heading. |
| `slug` | ✅ | string | `"terrapod"` | Must match the folder name — the studio keeps these in sync automatically. |
| `tagline` | ✅ | string | `"A self-tending hydroponic terrarium, driven by a Pi 5 and an ESP32 sensor mesh."` | One sentence, shown under the title. |
| `summary` | ✅ | string, ≤200 chars | `"Closed-loop hydroponic terrarium: a Pi 5 handles scheduling and vision, an ESP32 mesh reports climate and reservoir data."` | Used for `<meta description>` and the OG/Twitter card description — write it for someone who's never seen the project. |
| `date` | ✅ | date (`YYYY-MM-DD`) | `2026-02-18` | Drives sort order everywhere. |
| `status` | ✅ | enum, see [below](#statuses) | `"in-progress"` | |
| `category` | ✅ | enum, see [below](#categories) | `"hardware"` | |
| `featured` | — | boolean, default `false` | `true` | Pins the card to the homepage's featured rail/bento slot. |
| `cardSize` | — | `"sm" \| "md" \| "lg"`, default `"md"` | `"lg"` | Controls the homepage grid span. |
| `tags` | — | string[], max 6 | `["hydroponics", "raspberry-pi", "esp32"]` | Shown as `#hashtag`s on the project page. |
| `accent` | — | hex color string | `"#4FD97A"` | **No studio UI for this field** — it's schema-supported but hand-edited only; add it directly in the `.mdx` frontmatter if you want a per-project accent color. Must match `^#([0-9a-fA-F]{3}\|[0-9a-fA-F]{6})$` or the build rejects it. |
| `cover` | — | image path | `"./cover.jpg"` | Relative to the project's own folder. Omit it entirely for a text-forward card (see PID CONTROLLER in the demo content). |
| `gallery` | — | `{ src, alt }[]` | `[{ src: "./gallery/01-enclosure.jpg", alt: "TERRAPOD's enclosure, closed and running." }]` | `alt` is required per item — it's the lightbox caption, not a repeat of the tagline. |
| `preview.src` / `preview.poster` | — | video path (absolute) / image path (relative) | `src: "/videos/terrapod/preview-loop.mp4"`, `poster: "./preview-poster.svg"` | The silent hover-preview loop shown on the homepage card. See [Media policy](#media-policy) — keep this one especially small (<500KB), it autoplays on hover for every visitor. |
| `videos` | — | array, see below | | |
| `links.github` / `links.demo` / `links.docs` | — | URL | `"https://github.com/you/terrapod"` | Any subset — each renders its own button, omitted ones just don't appear. |
| `downloads` | — | `{ label, url, size }[]` | `{ label: "Bill of Materials (CSV)", url: "/downloads/terrapod-bom.csv", size: "1 KB" }` | `size` is *authored*, not measured — write what you know it to be. |

### `videos[]` entries

Three shapes, discriminated by `provider`:

```yaml
videos:
  - provider: "youtube"
    id: "LvtA58t_l8w"          # the part after ?v= in a YouTube URL
    title: "SKYWARDEN — First Autonomous Patrol"
  - provider: "vimeo"
    id: "123456789"
    title: "A Vimeo-hosted clip"
  - provider: "local"
    src: "/videos/terrapod/grow-cycle.mp4"   # absolute path, served from public/
    poster: "./video-poster.svg"             # relative path, colocated with index.mdx
    title: "One Grow Cycle, Timelapse"
    duration: "0:05"           # "m:ss" — authored, not measured
    caption: "Optional — a sentence under the player."
```

`youtube`/`vimeo` don't need a `duration` — the platform's own player shows
it. `local` requires one, since there's no player to ask.

### Statuses

The build fails on anything outside this exact list of four:

| Value | Meaning |
|---|---|
| `shipped` | Done, working, not actively changing. |
| `in-progress` | Actively being worked on right now. |
| `concept` | An idea or early prototype, not yet a real build. |
| `archived` | Was active, isn't anymore — shelved, superseded, or discontinued. |

### Categories

Also exactly four — same rule, same failure mode:

| Value | Meaning |
|---|---|
| `robotics` | Anything that moves/senses/acts autonomously. |
| `hardware` | Physical builds without the "autonomous" framing — enclosures, PCBs, mechanical work. |
| `software` | Code-only projects — libraries, tools, firmware without a specific physical build attached. |
| `build` | Everything else that's still a real project but doesn't fit the other three. |

If you try to save a project (via the studio or by hand) with a status or
category outside these lists, you'll get an error naming the field and
listing the exact values the build will accept — the same error either way,
because both paths validate against the identical schema.

---

## Media policy

Two tiers, by size — not by file type, and not by which directory something
"should" go in as a convention:

**Small and colocated.** Images live directly in the project's own folder
(`src/content/projects/<slug>/`) and get referenced by relative path
(`./cover.jpg`, `./gallery/01-foo.jpg`). Astro's asset pipeline resolves,
optimizes, and generates AVIF/WebP variants for these automatically — you
never touch that part.

**Video is different — it lives in `public/`, not colocated,** because
Astro's image pipeline doesn't process video at all: `public/videos/<slug>/<file>.mp4`,
referenced in frontmatter as the absolute path `/videos/<slug>/<file>.mp4`
(leading slash, not a relative `./` path — a relative path here silently
404s in the browser, since nothing rewrites it the way `cover`/`gallery` get
rewritten). Two soft size ceilings, checked by `npm run check:videos` (which
`npm run build` also runs, as a warning, not a build failure):

| Field | Soft limit | Why |
|---|---|---|
| `preview.src` (hover loop) | 500KB | Autoplays on hover for every visitor who lands on the homepage — this one has to be tiny. |
| `videos[].src` (local provider) | 5MB | Still self-hosted, but only loads when someone opens the project page and plays it. |

**Anything bigger, or any large binary that isn't video at all** — firmware
builds, STEP files, zip archives — doesn't belong in this git repository at
all. Upload it as a **GitHub Release asset** on your fork's repo and link it
via that project's `downloads[].url` field instead. A pre-commit hook
enforces this mechanically: any staged file over 40MB, or any `.mp4`/`.webm`
over 8MB, gets rejected before the commit can even happen, with a message
pointing back here.

### The `.webm` sibling convention

For best results, ship a WebM version alongside every local MP4 — smaller
file, same content, and `VideoEmbed.astro` will serve it to any browser that
supports it automatically. This is **not a schema field** — there's no
`videos[].webm` to fill in. It's a filename convention: drop a
same-basename `.webm` file in the same folder as the `.mp4`
(`grow-cycle.mp4` + `grow-cycle.webm`), and it gets picked up automatically.
If the sibling doesn't exist, the site just serves the MP4 — nothing breaks,
you only lose the smaller-file-size optimization. Generate one with:

```
ffmpeg -i public/videos/<slug>/<file>.mp4 -c:v libvpx-vp9 -crf 32 -b:v 0 -an public/videos/<slug>/<file>.webm
```

(`-an` drops audio — every local video/preview clip in this template is a
silent loop; drop that flag if yours has sound.) `npm run check:videos`
will tell you exactly which files are missing a sibling and print this
command pre-filled with the right paths.

To re-encode an MP4 that's over its size limit in the first place:

```
ffmpeg -i public/videos/<slug>/<file>.mp4 -vf format=yuv420p -c:v libx264 -crf 30 -preset slow -movflags +faststart -an public/videos/<slug>/<file>.mp4
```

Re-encode both files (MP4 and its WebM sibling, if it has one) when
`check:videos` flags something — a stale, larger sibling left behind after
only re-encoding the MP4 defeats the point of having it.

## Photo metadata

Most phone cameras embed GPS coordinates, device make/model, and sometimes
your name (Artist/Copyright tags) directly in every photo they take. If
you're photographing your own home, workbench, or garage for a project
write-up — which is exactly what this template is for — that photo reveals
where you live unless something strips it first. This is handled
automatically, three separate ways, so it doesn't depend on remembering to
do it by hand:

1. **Build time.** Astro's own image pipeline (the `sharp` service that
   generates every AVIF/WebP/resized variant of a `cover`/`gallery`/poster
   image) never calls `.withMetadata()`, so none of those variants carry
   EXIF/GPS/IPTC — this is sharp's default, not something the build has to
   ask for. There's one extra wrinkle: Vite's static-asset handling also
   copies the *original, unprocessed* source file into the build output
   under its own hashed filename, purely so it has a stable URL to resolve
   `image()` metadata against — no page actually links to that copy (every
   real `<Image>`/`<Picture>` usage requests a specific width, which
   resolves to a different, already-clean file), but it still physically
   exists in the deployed output. `npm run build` runs
   `scripts/strip-dist-image-metadata.mjs` right after `astro build`
   specifically to catch that copy too — it sweeps every image in the built
   output and strips metadata unconditionally, so the guarantee holds
   regardless of which part of the pipeline produced a given file.
2. **Committing by hand.** A pre-commit hook
   (`scripts/check-staged-images-for-gps.mjs`) checks every staged
   `.jpg`/`.jpeg`/`.tiff`/`.heic` for embedded GPS coordinates and **rejects
   the commit outright** if it finds any — same fail-closed pattern as the
   file-size hook. It tells you which file and gives you the fix:
   ```
   exiftool -gps:all= -overwrite_original <file>
   ```
3. **Uploading through `/studio` or the CMS.** The upload handler
   (`writeImage()` in `src/integrations/studio-save.ts`) runs every raster
   upload through the same rotate-then-strip sharp pipeline as the build —
   metadata never reaches disk in the first place, so there's nothing to
   catch later.

None of this touches photo *content* — only the invisible metadata riding
along with it. If you want to double-check any file yourself:
[exiftool](https://exiftool.org/) (`brew install exiftool`) will show you
everything a photo carries: `exiftool -GPS:all -Make -Model yourphoto.jpg`.

## Video metadata

Phone and action-cam video carries the same kind of GPS/device metadata as
photos — a `videos[]` clip or `preview.src` hover loop can reveal exactly
where and on what it was recorded, same risk as an unstripped photo. This
gets the same three-layer treatment as photo metadata above, using
[ffmpeg](https://ffmpeg.org/) (`brew install ffmpeg`) instead of sharp/
exiftool, since video containers aren't something either of those tools
handles:

1. **Uploading through `/studio`.** The upload handler (`resolveVideoFile()`
   in `src/integrations/studio-save.ts`) runs every video upload through
   `ffmpeg -map 0:v -map 0:a? -map_metadata -1 -c copy` before writing it —
   a lossless re-mux (no re-encode) that drops all container/stream
   metadata and keeps only the video and (if present) audio streams. That
   last part matters: some cameras (GoPro-style action cams especially)
   store GPS as its own timed metadata *stream*, not a container-level tag
   — `-map_metadata -1` alone wouldn't touch a stream, only tags, so the
   upload handler explicitly maps in just the video/audio streams rather
   than copying everything the input happens to contain.
2. **Committing by hand.** A pre-commit hook
   (`scripts/check-staged-video-metadata.mjs`) checks every staged
   `.mp4`/`.webm` for GPS or device-identifying tags (via `ffprobe`, matched
   by pattern rather than an exact tag list — the same location/make/model
   information shows up under different keys depending on camera and
   muxer, e.g. a plain `location` tag alongside Apple's
   `com.apple.quicktime.location.ISO6709`) and **rejects the commit
   outright** if it finds any, same fail-closed pattern as the photo-GPS
   hook. Unlike that hook, this one requires `ffmpeg`/`ffprobe` to be
   installed rather than working with a pure-JS fallback — ffmpeg is
   already a required tool for anyone touching video in this repo (the
   re-encode commands above), so this isn't a new dependency for that
   case; missing ffmpeg fails the commit closed rather than silently
   skipping the check. It tells you which file and gives you the fix:
   ```
   ffmpeg -i clip.mp4 -map 0:v -map 0:a? -map_metadata -1 -c copy clip.stripped.mp4
   mv clip.stripped.mp4 clip.mp4
   ```
3. **Already committed.** `npm run check:videos` also reports (warns, same
   as its size check — see the media policy above) any already-committed
   `preview.src`/local `videos[].src` that still carries GPS/device
   metadata, with the same fix command. This only runs if `ffmpeg` is
   installed; if it isn't, this one check is skipped with a note rather
   than failing the build, since it's informational, not the enforcement
   layer — the pre-commit hook is.

If you want to double-check any file yourself:
`ffprobe -v quiet -print_format json -show_format -show_streams yourvideo.mp4`
will show you everything, including any per-stream tags a plain
`exiftool`-style view might miss.
