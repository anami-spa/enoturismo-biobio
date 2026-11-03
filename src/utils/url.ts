/** Antepone el `base` de Astro (vacío en local, /enoturismo-biobio en GitHub Pages). */
const base = import.meta.env.BASE_URL.replace(/\/$/, '')

export const url = (ruta = '/') => `${base}${ruta.startsWith('/') ? ruta : `/${ruta}`}`
