// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import { studioDev } from './src/integrations/studio-dev.ts';

// https://astro.build/config
export default defineConfig({
  integrations: [mdx(), studioDev()],
  vite: {
    plugins: [tailwindcss()]
  }
});