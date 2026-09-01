// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static', 
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  trailingSlash: 'never', // 👈 Restored
  build: {
    format: 'file',       // 👈 Restored
    assets: 'assets'
  },
  integrations: [
    react()
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});