/**
 * INDEXAR=true habilita buscadores y agentes de IA (meta robots, robots.txt, sitemap).
 * Por defecto false: el prototipo vive en una URL temporal con datos de ejemplo.
 * El freno que impide indexar datos de ejemplo está en astro.config.mjs.
 */
export const INDEXAR = process.env.INDEXAR === 'true'
