// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  site: 'https://learntinker.com',
  integrations: [
    svelte(),
    mdx(),
    sitemap({
      // Dev routes and auth/me/admin pages don't belong in the sitemap; they
      // either require auth, return JSON, or are internal QA fixtures.
      filter: (page) =>
        !page.includes('/dev/') &&
        !page.includes('/examples/') &&
        !page.includes('/admin') &&
        !page.includes('/api/') &&
        !page.includes('/me') &&
        !page.includes('/auth') &&
        !page.includes('/signin') &&
        !page.includes('/signup') &&
        !page.includes('/welcome'),
    }),
  ],
  adapter: cloudflare(),
  output: 'server',
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
