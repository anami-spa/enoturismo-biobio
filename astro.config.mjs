import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

// loadEnv lee el .env antes de que Vite inicialice — evita que el canonical
// muestre https://ejemplo.cl/ en producción cuando SITE_URL está en .env
const env = loadEnv('', process.cwd(), '');

// ============================================================
// CONFIGURAR POR PROYECTO: cambiar solo el fallback
// ============================================================
const SITE_URL = env.SITE_URL || process.env.SITE_URL || 'http://localhost:4321';
// Subdirectorio cuando se sirve en GitHub Pages de proyecto (ej. /enoturismo-biobio). Local: '/'.
const BASE_PATH = process.env.BASE_PATH || '/';
// ============================================================

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  output: 'static',

  // Tailwind 4 via plugin nativo de Vite (NO @astrojs/tailwind)
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    // IMPORTANTE: sitemap DEBE estar en integrations[] (error conocido: solo en package.json no funciona)
    sitemap(),
  ],

  build: {
    inlineStylesheets: 'auto',
  },

  compressHTML: true,

  devToolbar: {
    enabled: false,
  },
});
