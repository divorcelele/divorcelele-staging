// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static', // 👈 This is mandatory for Better Auth & Middleware routing
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  build: {
    assets: 'assets'
  },
  integrations: [
    react()
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});