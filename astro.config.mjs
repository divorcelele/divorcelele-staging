// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare'; // 👈 Import Cloudflare adapter

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    platformProxy: {
      enabled: true, // Enables local D1/KV bindings in dev mode
    },
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