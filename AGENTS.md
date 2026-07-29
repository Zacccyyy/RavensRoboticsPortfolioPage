# Portfolio site template

## Purpose

An open-source personal-portfolio template: a clinical, technical visual
language for showcasing robotics/hardware/software projects, forkable by
anyone. Built with Astro 7, TypeScript (strict), and Tailwind CSS 4. See
README.md for the fork quickstart and CONTENT.md for the content schema —
this file is developer/AI-assistant guidance on the codebase itself, not
end-user documentation.

## Architecture

- `src/layouts/` — page shells (`BaseLayout.astro`). Structure only.
- `src/components/` — reusable UI pieces (buttons, cards, status pills,
  nav). Structure only.
- `src/pages/` — routes. Structure only. (`src/studio/` is the one
  exception to the src/pages convention — see "Pages & navigation" below
  for why it lives outside it.)
- `src/content/` — content collections: projects, about copy, links —
  all actual personal/portfolio content lives here. See "Content
  collections" below for the exact layout.
- `site.config.ts` — site-wide personal data (name, socials, contact,
  copyright) that components/layouts read from. **Committed** — this repo
  is a live site first and a fork template second (see README.md), so the
  real config and real content collection ship in the repo, not a
  gitignored/generated placeholder. `site.config.example.ts` is reference
  documentation only (every field, with an example value and comment) —
  nothing reads it at build or run time; don't copy it over the real file.
- `src/styles/tokens.css` — design tokens, wired into Tailwind 4 via
  `@theme` (CSS-first config, no `tailwind.config.js`).
- `src/styles/global.css` — Tailwind entrypoint, base resets, blueprint
  grid utility.

**Hard rule:** nothing under `src/components/`, `src/layouts/`, or
`src/pages/` may hard-code personal content (name, bio, project
descriptions, links, dates, etc.). All of that lives in
`site.config.ts` or `src/content/` and is passed in as props/data. This
keeps the visual system reusable/forkable independent of the content
that fills it.

## Content collections

- Schema lives at `src/content.config.ts` — **not**
  `src/content/config.ts`. Astro 7 moved the content config to the src
  root; a file at the old `src/content/config.ts` path fails the build
  with a message telling you to move it.
- Each project is a colocated folder:
  `src/content/projects/<slug>/index.mdx`, with every image asset that
  entry references (`cover`, `gallery[].src`, `preview.poster`, video
  posters) sitting in that same `<slug>/` folder and referenced by
  relative path (e.g. `./cover.jpg`). There is no separate
  `src/assets/projects/<slug>/` tree — assets travel with the content
  file that uses them.
- `gallery` is `{ src, alt }[]`, not a bare array of images. `alt` is
  required per item and is what the Lightbox displays as that image's
  caption — it needs to describe that specific photo, not repeat the
  project's tagline six times.
- Local `videos[]` entries require a `duration` field (`"m:ss"`, e.g.
  `"2:14"`) — authored, not measured from the file, for the same reason
  `downloads[].size` is authored rather than computed: it keeps the
  schema dependency-free (no ffprobe) for anyone forking this repo.
  `youtube`/`vimeo` entries don't need one — the platform's own player
  shows its duration once opened.
- Entries are `.mdx`, not `.md`, via `@astrojs/mdx` (configured in
  `astro.config.mjs`). Body content can drop into inline components —
  a mid-article image, an embedded video — rather than staying
  plain-markdown-only.
- `preview.src` and local `videos[].src` are plain strings, **not**
  `image()`-resolved — Astro's content-layer asset pipeline only
  transforms fields wrapped in `image()`, and video isn't a supported
  asset type there. A relative path (`./clip.mp4`) will silently 404 in
  the browser, because it never gets rewritten to a real built path the
  way `cover`/`gallery`/poster fields do. These fields must be an
  absolute path served from `public/`: `public/videos/<slug>/<file>.mp4`,
  referenced in frontmatter as `/videos/<slug>/<file>.mp4`.
- `public/` in general is for anything that must be served verbatim at a
  stable, predictable path: video clips under ~5MB (the video src case
  above) and small text-format downloads (a BOM CSV, a pinout table).
  Anything larger, or anything binary and sizeable — firmware builds,
  STEP files, zips — belongs on GitHub Releases and gets linked via
  `downloads[].url` instead. The rule is the file's size and type, not
  "downloads go here, videos go there" as a directory convention.
- `npm run build` runs `scripts/check-video-sizes.mjs` first, which warns
  (doesn't fail the build) if any `preview.src` exceeds 500KB or any
  `videos[].src` exceeds 5MB, printing the offending file and an `ffmpeg`
  command to re-encode it. Run it on its own with `npm run check:videos`.
  Local video should have a WebM alongside the MP4 (see `VideoEmbed.astro`)
  — re-encode both when a file trips this warning.
- **WebM siblings are derived by extension rewrite, not stored in
  frontmatter.** For a local `videos[]` entry, `VideoEmbed.astro` computes
  the WebM path as `video.src.replace(/\.mp4$/, '.webm')` — there is no
  `videos[].webm` field; the sibling is only ever a same-directory file that
  happens to share the MP4's basename. `VideoEmbed.astro` checks the
  sibling's existence at build time (`fs.existsSync`) and only emits the
  WebM `<source>` when it's actually there, so a video added via the studio
  editor — which uploads a single MP4 — degrades to MP4-only rather than
  shipping a `<source>` that 404s for every WebM-capable browser.
  `scripts/check-video-sizes.mjs` reports a missing sibling too, as an
  informational notice (not a warning) alongside the `ffmpeg` command to
  generate one.

  This convention is **not** symmetric with the hover-preview loop:
  `ProjectCard.astro`'s `<video data-preview-video>` only ever emits an MP4
  `<source>` for `preview.src` — it has no WebM handling at all. A stray
  `preview-loop.webm` sitting next to `preview-loop.mp4` is a genuine
  orphan today, not a missed optimisation, and the studio's orphan detector
  (`computeOrphans` in `src/integrations/studio-save.ts`) correctly flags it
  as one — it only exempts a `.webm` sibling of a `videos[]` entry's `.mp4`,
  not of `preview.src`. If `ProjectCard.astro` ever grows the same
  WebM-source handling `VideoEmbed.astro` has, that exemption and the
  missing-sibling notice in `check-video-sizes.mjs` (currently scoped to
  `kind: 'video'` only) both need to be extended to cover `preview.src` too
  — three independent places that each have to know this convention exists,
  because none of them can read it off the schema.
- `videos[].provider: 'vimeo'` is implemented in `VideoEmbed.astro`
  (`lite-vimeo-embed`, same lazy-loading treatment as the YouTube branch)
  and was manually verified during development, but no committed project
  currently has a vimeo entry — the YouTube and local branches are the
  only ones exercised by real content. Re-test the vimeo branch by hand
  before relying on it when this repo is prepared as a fork-friendly
  template.

## Pages & navigation

- `/` — home (`src/pages/index.astro`): hero, filter chips, project grid,
  footer.
- `/projects/<slug>/` — project detail route (`src/pages/projects/[slug].astro`).
  Per-project OG image, JSON-LD `CreativeWork`, gallery/lightbox, video embeds.
- `/styleguide` — design token reference. Excluded from the sitemap
  (`astro.config.mjs`'s `sitemap()` filter) — it's a dev/design reference,
  not public-facing content.
- `/robots.txt`, `/sitemap-index.xml` — generated; see `src/pages/robots.txt.ts`
  and the `sitemap()` integration.
- `/studio`, `/studio/<slug>` — the local content editor. Lives at
  `src/studio/` (**not** `src/pages/studio/`) specifically so it's
  structurally absent from production: `src/integrations/studio-dev.ts`
  injects these routes via `injectRoute()` only when `command === 'dev'`,
  so a production build never generates them at all — there's nothing to
  clean up after the fact. Never move these files into `src/pages/` "for
  consistency"; that would make them real routes that ship. See
  CONTENT.md for what the editor does from a content-author's perspective.
- The nav has no ABOUT or CONTACT link — neither page exists yet (a dead
  link is worse than an absent one), though the bio/social copy this
  template already collects in `site.config.ts` would make an About page
  mostly a layout job, not a content one, whenever someone adds it. "WORK"
  in the nav is a same-page anchor (`#work`) down to the grid section, not
  a route, so it doesn't need to match the `/projects/` URL it links into.

## Accessibility notes

- `CardGrid.astro`'s mobile featured-rail (`.featured-rail` / `.rail-item`)
  uses `display: contents` to collapse into the desktop bento grid at `md:`
  without duplicating any card markup — see the comment at the top of that
  file for why. Verified via Playwright `ariaSnapshot()` on `#project-grid`
  at both a mobile viewport (390×844, `.featured-rail` is a real flex
  container) and a desktop viewport (1280×900, collapsed via `display:
  contents`), across **Chromium, current WebKit, and current Firefox**:
  identical heading/link/img counts and byte-identical snapshot in all
  three, at both viewports — no elements dropped, tab order matches DOM
  order. **Still not covered:** Playwright's WebKit build tracks *current*
  WebKit, not the specific pre-15.4 Safari releases the historical
  `display: contents` a11y-tree bug shipped in — no vendor distributes old
  WebKit/Gecko builds for automated testing, so that gap can only be closed
  by a manual VoiceOver pass on an actual pre-15.4 Safari (or BrowserStack
  equivalent), not by more automation. Old Firefox is the same situation.
  Current-engine coverage is as complete as tooling allows; the
  historical-engine risk itself is unchanged from before this pass.

## Design tokens

Defined in `src/styles/tokens.css`, consumed as Tailwind utility
classes (e.g. `bg-surface`, `text-ink-muted`, `font-display`,
`text-h2`).

**Colours**

| Token | Value | Use |
|---|---|---|
| `bg-void` | `#0B0D0F` | page background |
| `surface` | `#14181C` | cards, panels |
| `surface-raised` | `#1C2229` | hover elevation |
| `ink` | `#E8EAED` | primary text; also link/nav **hover** state |
| `ink-muted` | `#8A939B` | secondary text, metadata; also link/nav **rest** state |
| `accent-a` | `#7C5CFF` | **structural only** — focus rings, gradients, borders. 4.48:1 on `bg-void`, fails WCAG AA. Never use as text colour (not links, not nav, not the footer wordmark) |
| `accent-b` | `#00E0C6` | iridescent gradient end (teal) |
| `signal` | `#FF6B35` | CTAs, IN PROGRESS status |
| `hairline` | `rgba(232,234,237,0.08)` | default border, everywhere |
| `hairline-bright` | `rgba(232,234,237,0.20)` | CAD corner brackets, deliberate accent edges — still translucent, never a solid border colour |
| `grid-line` | `rgba(232,234,237,0.04)` | blueprint grid background |

**Layout**

| Token | Value | Utility |
|---|---|---|
| `max-width` | `1440px` | `max-w-max-width` |
| `margin-desktop` | `64px` | `px-margin-desktop`, etc. |
| `margin-mobile` | `20px` | `px-margin-mobile`, etc. |
| `gutter` | `24px` | `gap-gutter`, etc. |

**Type scale** (`font-{family}` + `text-{size}` utilities)

| Token | Family / weight | Size / line-height / tracking |
|---|---|---|
| `display-xl` | Space Grotesk Bold | 80px / 0.95 / -0.04em |
| `display-lg` | Space Grotesk Bold | 48px / 1.1 / -0.04em |
| `h2` | Space Grotesk SemiBold | 32px / 1.2 / -0.02em |
| `h3` | Space Grotesk SemiBold | 24px / 1.2 / -0.02em |
| `body-lg` | Inter Regular | 18px / 1.6 |
| `body` | Inter Regular | 16px / 1.6 |
| `body-sm` | Inter Regular | 15px / 1.6 |
| `caption` | Inter Regular | 13px / 1.5 |
| `mono` | JetBrains Mono Medium | 12px / 1.0 / 0.12em |
| `mono-xs` | JetBrains Mono Regular | 10px / 1.0 / 0.08em |

**Other rules**

- Border radius: 2px maximum, everywhere (`rounded-full` is the only
  exception, reserved for circular dots/avatars — that's roundness,
  not a "rounded corner").
- No box-shadows anywhere — `shadow-*` utilities are disabled at the
  token layer. Depth comes from surface elevation + hairlines only.
- Fonts are self-hosted via `@fontsource-variable` (Space Grotesk,
  Inter, JetBrains Mono) — no Google Fonts network request.

Full token reference rendered live at `/styleguide`.

## Performance budget

- Under 100KB client-side JS, shipped.
- Lighthouse 95+ on all four axes (Performance, Accessibility, Best
  Practices, SEO).
- Prefer Astro's zero-JS-by-default islands; only hydrate a component
  (`client:*`) when it needs actual interactivity.

## Development

First time in this repo (or any fresh clone): `npm install`. `site.config.ts`
and `src/content/projects/` are real, committed files (see "Architecture"
above) — `npm run build` works immediately, no setup step required.
`npm run setup` is optional: it regenerates `public/og-default.png` from
the current `site.config.ts` and prints a reminder checklist for anyone
setting this up as their own fork (see README.md's Quickstart) — it never
overwrites or deletes anything.

Start the dev server in background mode:

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Full documentation: https://docs.astro.build

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
