// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { studioDev } from './src/integrations/studio-dev.ts';
import siteConfig from './site.config.ts';

// https://astro.build/config
export default defineConfig({
  site: siteConfig.seo.siteUrl,
  integrations: [
    mdx(),
    studioDev(),
    // /studio is never in the build output to begin with (see
    // studio-dev.ts), so it needs no filter entry here. /styleguide is a
    // real built page but a dev/design reference, not public-facing
    // content — excluded so the sitemap only lists home + project pages.
    sitemap({
      filter: (page) => !page.endsWith('/styleguide/') && !page.endsWith('/styleguide'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    // Explicit, not just relying on Vite's default: a sourcemap bakes in
    // absolute build-machine paths (/Users/<name>/...), which for a build
    // run on a personal laptop means a real name in public build output.
    // Verified clean without this (grep -ril "/Users/" dist/ finds
    // nothing) because the default is already false — this pins it so a
    // later `sourcemap: true` added for debugging some other issue can't
    // silently reintroduce the leak.
    build: {
      sourcemap: false,
    },
  }
});