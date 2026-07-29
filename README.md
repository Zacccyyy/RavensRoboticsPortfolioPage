# Portfolio Site Template

A personal-portfolio template for people who build things: a clinical,
technical visual language for robotics/hardware/software projects, a
content schema that actually fits how those projects differ from each
other (a gallery for a physical build, a video for a drone flight, a
downloads section for a BOM), and a local-only editor so you never have to
hand-write frontmatter YAML if you don't want to.

![Screenshot of the homepage, showing the project grid with several demo projects](docs/screenshot.png)

## Features

- **Astro 7 + Tailwind CSS 4**, static output — no server to run, no
  database, deploys as plain files.
- **A real content schema**, not a loose collection of Markdown files:
  status/category enums the build enforces, a gallery type with required
  per-image alt text, a discriminated union for video (YouTube / Vimeo /
  local file), authored file sizes for downloads. Get a field wrong and the
  build tells you exactly what's valid instead of silently doing the wrong
  thing.
- **A local content editor** (`/studio` in dev only — see below) generated
  from that same schema, so the editor's dropdowns and the build's
  validation can never drift apart. Drag-and-drop image uploads with
  automatic resizing, live validation, orphaned-file detection.
- **The studio never ships.** It's not gated behind a login or hidden by
  a redirect — the route structurally doesn't exist in a production build.
  Verified by grepping the built output for studio-only strings; see
  AGENTS.md if you're curious how.
- **Real performance/accessibility defaults**: responsive AVIF/WebP images
  throughout, lazy-loaded everything below the fold, keyboard-navigable
  galleries and dropdowns, `prefers-reduced-motion` respected everywhere
  including hover-preview video, WCAG AA contrast. Lighthouse 95+ on all
  four axes out of the box.
- **SEO that's actually wired up**: per-project Open Graph images (your
  cover photo, auto-cropped), JSON-LD structured data, a sitemap that
  excludes the dev-only/reference pages, `robots.txt`.
- **A two-tier media policy** that keeps the git repo small: small images
  colocated with their content, short video clips self-hosted, everything
  else on GitHub Releases — enforced by a pre-commit hook, not just a
  suggestion in a doc. See CONTENT.md.

## Quickstart

This repo's `main` branch is a real, working site — `site.config.ts` and
`src/content/projects/` are committed, real files, not placeholders you
need to generate. That's deliberate: a fresh clone has to build and deploy
correctly with zero setup, because that's also how *this* site deploys.
Forking it means replacing that real content with your own.

1. **Fork this repo** on GitHub (the button in the top right), then clone
   your fork and install:
   ```
   git clone https://github.com/<you>/<your-fork>.git
   cd <your-fork>
   npm install
   ```
2. **Edit `site.config.ts`** with your own name, bio, and links.
   `site.config.example.ts` documents every field if you want the reference,
   but the file you actually edit is `site.config.ts` itself.
3. **Delete the example projects.** This is the one step that's easy to
   forget — if you skip it, someone else's projects publish on your site:
   ```
   rm -rf src/content/projects/avian-visitors src/content/projects/lyric-panel \
          src/content/projects/pid-controller src/content/projects/skywarden \
          src/content/projects/terrapod public/videos/terrapod
   ```
   (Keep one of them around a little longer if you want a working reference
   while you learn the schema — TERRAPOD shows a raster cover + gallery +
   video, PID CONTROLLER shows the bare text-only card. Just don't ship them.)
4. **Add your own projects** — run `npm run dev` and use `/studio`, or (if
   you're using Claude Code) the `/new-project` command, or hand-write
   `index.mdx` files. See CONTENT.md for the schema and a full walkthrough.
5. **Regenerate the social-share image** from your new name/tagline:
   ```
   node scripts/generate-og-default.mjs
   ```
6. **Deploy:**

   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-handle/your-repo-name)

   *(replace `your-handle/your-repo-name` in that link with your actual
   fork before this button will work — GitHub doesn't let a README know
   its own repo URL)*. Or connect the repo manually in the Cloudflare Pages
   dashboard: build command `npm run build`, output directory `dist`.

## Local development

```
npm run dev            # dev server at localhost:4321, includes /studio
npm run build           # production build to dist/ — /studio is not in it
npm run preview          # serve the production build locally
npm run setup            # regenerate the OG image + print a fork checklist — optional, never destructive
npm run check            # astro check — type errors
npm run check:videos      # warns about oversized/missing-WebM-sibling video assets
npm run check:links       # broken internal links, run against dist/ after a build
```

## Troubleshooting

**My deployed site still shows someone else's projects/name.** You skipped
Quickstart step 3 (delete the example projects) or step 2 (edit
`site.config.ts`) — both are real committed content, not placeholders, so
the build has no way to know you meant to replace them.

**`npm run build`/`npm run dev` prints "The collection 'projects' does not
exist or is empty."** Expected and harmless if you're between Quickstart
steps 3 and 4 — you deleted the example projects and haven't added your own
yet. The build still succeeds; the homepage just has an empty grid until
you add at least one project.

**I edited `site.config.ts` but the social-share image still shows the old
name.** `public/og-default.png` is a generated file, not computed at
request time — re-run `node scripts/generate-og-default.mjs` (or
`npm run setup`, which does the same thing plus a couple of sanity checks)
after any change to `name`/`tagline` in `site.config.ts`.

**My pre-commit hook rejected a file.** That's the media-size policy
working as intended — see CONTENT.md's "Media policy" section for what to
do instead of force-committing it.

**`git push` is rejected / husky isn't running.** Run `npm install` again —
the pre-commit hook installs via the `prepare` script, which only fires on
`npm install`, not on every command.

**I want to see the design tokens.** `/styleguide`, in dev or in your
deployed site (it's a real page, just excluded from the sitemap).

## License

The template code (everything except your own content once you add it) is
MIT-licensed — see LICENSE. That covers the Astro components, the studio
editor, the build tooling; it says nothing about whatever you personally
publish through it, which is yours.

## Contributing

Fixing a bug in the template itself, or improving these docs? See
CONTRIBUTING.md. Most people who use this repo should fork it, not open a
PR against it — see the Quickstart above.
