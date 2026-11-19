import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { readFileSync } from 'node:fs';

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

// INDEXAR=true abre el sitio a buscadores y agentes de IA. Por defecto false (prototipo con datos de ejemplo).
const INDEXAR = process.env.INDEXAR === 'true';

// Freno: no se puede indexar mientras queden datos de ejemplo.
if (INDEXAR) {
  const leer = (f) => JSON.parse(readFileSync(new URL(`./src/data/${f}`, import.meta.url), 'utf8'));
  const { iniciativas } = leer('iniciativas.json');
  const { articulos } = leer('articulos.json');
  const pendientes = [
    ...iniciativas.filter((i) => i.ejemplo || i.contenido_ejemplo || i.coords_aprox).map((i) => `iniciativa:${i.slug}`),
    ...articulos.filter((a) => a.ejemplo).map((a) => `articulo:${a.slug}`),
  ];
  if (pendientes.length) {
    throw new Error(`INDEXAR=true bloqueado: ${pendientes.length} entradas con datos de ejemplo (${pendientes.slice(0, 5).join(', ')}…). Reemplazar por datos reales antes de indexar.`);
  }
}

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
    ...(INDEXAR ? [sitemap()] : []),
  ],

  build: {
    inlineStylesheets: 'auto',
  },

  compressHTML: true,

  devToolbar: {
    enabled: false,
  },
});
