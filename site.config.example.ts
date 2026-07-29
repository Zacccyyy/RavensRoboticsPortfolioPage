// Site-wide identity data. Nothing under src/components, src/layouts, or
// src/pages hard-codes any of this — it all flows in from here so the
// visual system stays forkable independent of whose portfolio it holds.
//
// This file is reference documentation, not something a script reads —
// the real, live config is `site.config.ts` (a committed file, edited
// directly). This file exists purely so every field is documented with a
// placeholder example in one place, without cluttering the real config's
// comments. Copy a field's shape from here into `site.config.ts` if you're
// ever unsure of one; don't copy this whole file over it.
//
// After editing name/tagline in the real `site.config.ts`, re-run
// `node scripts/generate-og-default.mjs` (or `npm run setup`, which runs it
// for you) — the social-share image is a generated PNG, not computed at
// request time, so it won't reflect a change until you regenerate it.

export interface SocialLink {
  /** Platform name shown in UI, e.g. "GitHub". */
  label: string;
  url: string;
  /** Icon identifier resolved by whatever icon component the UI uses. */
  icon: 'github' | 'youtube' | 'linkedin' | 'instagram' | 'x' | 'email' | 'rss';
}

export interface SeoDefaults {
  /** Used as the `<title>` template default and OG title fallback. */
  title: string;
  description: string;
  /** Absolute base URL, no trailing slash, used to build canonical/OG URLs.
   * Must match your real deploy URL — Cloudflare Pages gives you one at
   * `<project>.pages.dev` by default, or your own domain if you attach one. */
  siteUrl: string;
  /** Path to the default social share image, relative to `public/`. Generated
   * by scripts/generate-og-default.mjs from `name` and `tagline` below — see
   * the note at the top of this file. */
  ogImage: string;
  /** e.g. "@yourhandle" — omit the field entirely if you don't want a
   * twitter:site meta tag at all. */
  twitterHandle?: string;
}

export interface ThemeOverrides {
  /** Overrides `--color-accent-a` from tokens.css. Structural use only —
   * focus rings, gradients, borders — never text (see tokens.css for why). */
  accentA?: string;
  /** Overrides `--color-accent-b` from tokens.css. */
  accentB?: string;
  /** Overrides `--color-signal` from tokens.css. */
  signal?: string;
}

export interface SiteConfig {
  /** Full display name — footer wordmark, header logo, OG title, JSON-LD Person.name. */
  name: string;
  /** Compact form for tight spaces — the studio's top bar, browser tab contexts. */
  shortName: string;
  /** One sentence, shown large in the homepage hero. */
  tagline: string;
  /** A paragraph, shown under the tagline and used as the JSON-LD Person.description. */
  bio: string;
  /** Free text, shown nowhere critical yet — kept for a future About page. */
  location: string;
  /** Real address if you want the "Email" social link and JSON-LD Person.email
   * to work — used as-is in a `mailto:` href, so this must be an address you
   * actually check, not a placeholder. */
  email: string;
  /** Rendered in SiteHeader and SiteFooter, in this order. Add or remove
   * entries freely — nothing else hard-codes a fixed count or set of icons. */
  social: SocialLink[];
  seo: SeoDefaults;
  /** Leave as `{}` to use tokens.css's own values unmodified — this is an
   * escape hatch for forks that want their own accent colours without
   * editing tokens.css directly, not something you need to fill in. */
  theme: ThemeOverrides;
  /** Footer copyright line: "© {foundedYear}–{current year} {copyrightHolder}". */
  copyrightHolder: string;
  /** First year this site (or the work it showcases) existed — drives the
   * footer's copyright year range. */
  foundedYear: number;
}

const siteConfig: SiteConfig = {
  name: 'Your Name',
  shortName: 'YourName',
  tagline: 'One sentence describing what you build.',
  bio: 'A paragraph about you: what you build, what tools/stack you favor, what kind of projects show up here. This renders directly on the homepage, so write it for a visitor, not for yourself.',
  location: 'Your City',
  email: 'you@example.com',
  social: [
    { label: 'GitHub', url: 'https://github.com/your-handle', icon: 'github' },
    { label: 'YouTube', url: 'https://youtube.com/@your-handle', icon: 'youtube' },
    { label: 'Email', url: 'mailto:you@example.com', icon: 'email' },
  ],
  seo: {
    title: 'Your Name — Project Portfolio',
    description: 'A portfolio of hardware, software, and robotics builds.',
    siteUrl: 'https://example.com',
    ogImage: '/og-default.png',
  },
  theme: {},
  copyrightHolder: 'Your Name',
  foundedYear: new Date().getFullYear(),
};

export default siteConfig;
