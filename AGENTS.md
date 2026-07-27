# RavensRobotics

## Purpose

RavensRobotics is an open-source personal portfolio site: a clinical,
technical visual language for showcasing robotics/hardware/software
projects. Built with Astro 7, TypeScript (strict), and Tailwind CSS 4.

## Architecture

- `src/layouts/` — page shells (`BaseLayout.astro`). Structure only.
- `src/components/` — reusable UI pieces (buttons, cards, status pills,
  nav). Structure only.
- `src/pages/` — routes. Structure only.
- `src/content/` — content collections: projects, about copy, links —
  all actual personal/portfolio content lives here.
- `site.config.ts` — site-wide personal data (name, socials, contact,
  copyright) that components/layouts read from.
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
