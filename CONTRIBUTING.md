# Contributing

This is a personal-portfolio **template** — most people who use it should
just fork it (see README.md's Quickstart), not open a PR here. Contributions
to the template itself (the visual system, the studio editor, the schema,
the docs) are welcome; contributions that are really "here's my own
portfolio content" belong in your own fork, not this repo.

## Before you open a PR

- **Bug fixes / docs fixes**: just open the PR, no need to file an issue first.
- **New features or behavior changes**: open an issue first describing what
  and why. This is a template other people fork and rely on staying stable —
  a feature that's a great fit for your own site might not be a good default
  for everyone else's.
- Run the checks locally before pushing — the same ones CI runs on every PR:
  ```
  npm run check:cms-config  # public/admin/config.yml matches the schema
  npm run check              # astro check — type errors
  npm run build               # full production build
  npm run check:links          # internal link integrity, against the built dist/
  ```

## Ground rules (see AGENTS.md for the full detail)

- **Nothing under `src/components/`, `src/layouts/`, or `src/pages/` hard-codes
  personal content.** Names, bios, links, project data — all of it flows in
  from `site.config.ts` or `src/content/`. This is the one rule that, if
  broken, makes the template genuinely worse for every other fork — please
  don't introduce a regression here even to fix something else quickly.
- **The studio editor and the content schema share one source of truth**
  (`src/content.config.ts`). If you add a schema field, the studio's form
  should generate its constraints from the schema, not duplicate them by hand.
- **The studio must stay structurally absent from production builds** — not
  cleaned up after the fact. See the comments in
  `src/integrations/studio-dev.ts` before touching how `/studio` is routed.
- **Large binaries don't belong in git history.** The pre-commit hook enforces
  size limits; don't work around it by amending past the check — if you're
  hitting the limit, the file belongs on GitHub Releases or needs
  re-encoding, not a force-add.

## Reporting a bug vs. asking a question

Use the issue templates — "Bug report" for something that's actually broken
in the template itself, "Question" for "how do I..." (CONTENT.md and
README.md's troubleshooting section answer most of these already, so check
there first).
