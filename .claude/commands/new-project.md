---
description: Scaffold a new project content entry and its asset folder
---

Scaffold a new entry for the `projects` content collection, defined in
`src/content.config.ts`. Interview the user for every field below, then
create the files.

## 1. Gather fields

Ask for each field one at a time (or in a short batch via AskUserQuestion
where the field is a fixed enum). Do not invent values — if the user has no
answer for an optional field, omit it entirely rather than writing a null or
empty placeholder.

Required:
- `title` — string. Display name of the project.
- `slug` — string. Kebab-case URL slug. Suggest one derived from `title` and
  confirm it with the user rather than asking from scratch. This becomes the
  project's URL: `/projects/<slug>/`.
- `tagline` — string. One short line.
- `summary` — string, **max 200 characters**. Count the characters before
  writing the file; if the user's answer is over the limit, tell them the
  overage and ask them to trim it rather than truncating it yourself.
- `date` — date (YYYY-MM-DD).
- `status` — enum, ask as a multiple-choice pick from exactly these four:
  `shipped`, `in-progress`, `concept`, `archived`.
- `category` — enum, ask as a multiple-choice pick from exactly these four:
  `software`, `hardware`, `robotics`, `build`.
- `cardSize` — enum, ask as a multiple-choice pick from exactly these three:
  `sm`, `md`, `lg`. Default to `md` if the user has no preference.

Optional (ask, but make clear each can be skipped):
- `featured` — boolean. Default `false`.
- `tags` — array of strings, **max 6**. Ask for a comma-separated list.
- `cover` — cover image. If yes, note the file will need to be dropped into
  the project's asset folder, referenced by relative path (e.g. `./cover.jpg`).
- `gallery` — array of `{ src, alt }`. For each image, ask both for the file
  (same relative-path note as `cover`) **and** real alt text describing what
  it shows — this isn't optional per-item, and it isn't a project-wide
  fallback: it's what the lightbox displays as that image's caption, so it
  needs to actually describe that specific photo.
- `preview` — a 2-4 second silent hover-loop video: `{ src, poster }`.
  `poster` is an image, relative path like `cover`. `src` is **not** an
  image — see the "video paths" note below before writing it.
- `videos` — array, each one of:
  - `{ provider: 'youtube' | 'vimeo', id, title }` — ask for the real video
    ID (from the video's URL, e.g. `youtube.com/watch?v=`**`<id>`**). Don't
    accept a placeholder like "TODO" or "REPLACE_ME" — an invalid ID doesn't
    fail the build, it just silently 404s the thumbnail in the browser.
  - `{ provider: 'local', src, poster, title, duration, caption? }` — `src`
    needs the video-paths note below. `duration` is required, authored as
    `"m:ss"` (e.g. `"2:14"`), not measured from the file.
- `links` — `{ github?, demo?, docs? }`, all full URLs (`https://...`).
- `downloads` — array of `{ label, url, size }`. `size` is display text
  (e.g. `"4 KB"`), not computed. For `url`, ask which case this is — the
  answer changes where the file goes, not just what you type:
  - Small text-format file (a BOM CSV, a pinout table): goes in
    `public/downloads/`, `url` is the absolute site path, e.g.
    `/downloads/<slug>-bom.csv`.
  - Anything larger or binary (STEP files, firmware, zips): goes up as a
    GitHub Release asset instead; `url` is that asset's direct download
    link. Don't put files like this in `public/`.
- `accent` — hex color string, e.g. `#7C5CFF`, overriding the project's
  accent color. Validate it matches `^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`
  before writing it — this is the same regex the build enforces, so an
  invalid value here would fail the build later.

### Video paths (`preview.src`, local `videos[].src`)

These two fields are plain strings, not images — Astro's asset pipeline
doesn't resolve them the way it does `cover`/`gallery`/poster fields. A
relative path here (`./clip.mp4`) will silently 404 in the browser instead
of failing the build. They must be an **absolute** path served from
`public/`: put the file at `public/videos/<slug>/<file>.mp4` (and ideally a
matching `.webm` — see `VideoEmbed.astro`) and reference it in frontmatter
as `/videos/<slug>/<file>.mp4`. This is a different location from the
image assets below — don't put video files in the content folder.

## 2. Create the files

Given `slug`, create:

- `src/content/projects/<slug>/index.mdx` — frontmatter with every field
  gathered above (omit optional fields that were skipped), followed by a
  short body written from what the user told you about the project. Do not
  invent technical details not provided by the user.
- `src/content/projects/<slug>/` as the asset folder for any *images*
  referenced above (`cover`, `gallery[].src`, `preview.poster`, video
  `poster` files). Reference them from frontmatter as relative paths (e.g.
  `./cover.jpg`) — don't create placeholder image files, just leave the
  folder ready for the user to drop real assets into, and tell them which
  filenames the frontmatter expects.
- `public/videos/<slug>/` if `preview` or any local `videos[]` entry was
  requested — this is where those video files go (see above), separate
  from the content folder.

## 3. Verify

Run `npx astro build` (or `astro sync` if a faster check is preferred) and
confirm the new entry passes schema validation. If it fails, the error will
name the offending field in plain language — relay it to the user rather
than silently altering their answer to make it pass.
