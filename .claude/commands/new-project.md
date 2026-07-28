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
  confirm it with the user rather than asking from scratch.
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
  the project's asset folder.
- `gallery` — array of images. Same note as `cover`.
- `preview` — a 2-4 second silent hover-loop video: `{ src, poster }`. Ask
  whether they want one; if yes, ask for the poster description only — the
  actual video/poster files are dropped in later, this just wires the field.
- `videos` — array, each one either:
  - `{ provider: 'youtube' | 'vimeo', id, title }`, or
  - `{ provider: 'local', src, poster, title, caption? }`
  Ask how many videos, then the fields for each one at a time.
- `links` — `{ github?, demo?, docs? }`, all full URLs.
- `downloads` — array of `{ label, url, size }`.
- `accent` — hex color string, e.g. `#7C5CFF`, overriding the project's
  accent color. Validate it matches `^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`
  before writing it — this is the same regex the build enforces, so an
  invalid value here would fail the build later.

## 2. Create the files

Given `slug`, create:

- `src/content/projects/<slug>/index.mdx` — frontmatter with every field
  gathered above (omit optional fields that were skipped), followed by a
  short body written from what the user told you about the project. Do not
  invent technical details not provided by the user.
- `src/content/projects/<slug>/` as the asset folder for any images/videos
  referenced above (`cover`, `gallery`, `preview.poster`, video `poster`
  files). Reference them from frontmatter as relative paths (e.g.
  `./cover.jpg`) — don't create placeholder image files, just leave the
  folder ready for the user to drop real assets into, and tell them which
  filenames the frontmatter expects.

## 3. Verify

Run `npx astro build` (or `astro sync` if a faster check is preferred) and
confirm the new entry passes schema validation. If it fails, the error will
name the offending field in plain language — relay it to the user rather
than silently altering their answer to make it pass.
