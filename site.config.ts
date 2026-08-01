// Site-wide identity data. Nothing under src/components, src/layouts, or
// src/pages should hard-code any of this — it all flows in from here so the
// visual system stays forkable independent of whose portfolio it holds.
// Replace every value below with your own before publishing.

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
  /** Absolute base URL, no trailing slash, used to build canonical/OG URLs. */
  siteUrl: string;
  /** Path to the default social share image, relative to `public/`. */
  ogImage: string;
  twitterHandle?: string;
}

export interface ThemeOverrides {
  /** Overrides `--color-accent-a` from tokens.css. Structural use only. */
  accentA?: string;
  /** Overrides `--color-accent-b` from tokens.css. */
  accentB?: string;
  /** Overrides `--color-signal` from tokens.css. */
  signal?: string;
}

export interface AboutStackGroup {
  /** Mono section label rendered above the group's chips, e.g. "HARDWARE". */
  label: string;
  /** Short capability/tool phrases, rendered as TagChip tags beneath the label. */
  items: string[];
}

export interface AboutConfig {
  /** Page headline, rendered at the display type scale. */
  heading: string;
  /** 2-3 paragraphs of bio copy, rendered left-aligned at reading measure. */
  intro: string[];
  /** Short "what I work on" phrases, rendered as tags under the heading. */
  focus: string[];
  /** Grouped capabilities -- mono section label + tag chips per group. */
  stack: AboutStackGroup[];
  /** One line on what's on the bench right now, rendered as a mono callout. */
  currently: string;
  /** Prose inviting contact -- not a raw email address, that's rendered separately. */
  contact: string;
}

export interface SiteConfig {
  name: string;
  shortName: string;
  tagline: string;
  bio: string;
  location: string;
  email: string;
  social: SocialLink[];
  seo: SeoDefaults;
  theme: ThemeOverrides;
  about: AboutConfig;
  copyrightHolder: string;
  foundedYear: number;
}

const siteConfig: SiteConfig = {
  name: 'Ravens Robotics',
  shortName: 'RavensRobotics',
  tagline: 'Hardware, software, and everything in between.',
  bio: 'I build sensor-driven hardware and the software that runs it — hydroponics automation, autonomous drones, embedded control systems, and whatever project is currently taking over the workbench.',
  location: 'Earth',
  email: 'you@example.com',
  social: [
    { label: 'GitHub', url: 'https://github.com/your-handle', icon: 'github' },
    { label: 'YouTube', url: 'https://youtube.com/@your-handle', icon: 'youtube' },
    { label: 'Email', url: 'mailto:you@example.com', icon: 'email' },
  ],
  seo: {
    title: 'Ravens Robotics — Hardware & Software Projects',
    description:
      'A portfolio of robotics, hardware, and software builds: sensor systems, autonomous drones, embedded control loops, and more.',
    siteUrl: 'https://ravensrobotics.pages.dev',
    ogImage: '/og-default.png',
  },
  theme: {},
  about: {
    heading: 'About',
    intro: [
      'PLACEHOLDER -- replace with your own bio. This paragraph introduces who you are and what you build.',
      'PLACEHOLDER -- a second paragraph: background, how you got into this work, or your general approach.',
    ],
    focus: ['PLACEHOLDER FOCUS AREA', 'PLACEHOLDER FOCUS AREA'],
    stack: [
      { label: 'HARDWARE', items: ['PLACEHOLDER TOOL'] },
      { label: 'SOFTWARE', items: ['PLACEHOLDER TOOL'] },
    ],
    currently: 'PLACEHOLDER -- one line on what is actively on the bench right now.',
    contact: 'PLACEHOLDER -- a sentence inviting contact, e.g. reach out to collaborate or talk shop.',
  },
  copyrightHolder: 'Ravens Robotics',
  foundedYear: 2024,
};

export default siteConfig;
