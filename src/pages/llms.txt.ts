import type { APIRoute } from 'astro'
import { iniciativas, nombreCategoria, nombreComuna, totalRegistradas } from '../utils/iniciativas'
import { articulos, nombreTema } from '../utils/articulos'
import { url } from '../utils/url'

export const GET: APIRoute = ({ site }) => {
  const a = (ruta: string) => new URL(url(ruta), site).toString()
  const lineas = [
    '# Enoturismo Biobío · Herencia viva',
    '',
    `> Catálogo de iniciativas de enoturismo de la Región del Biobío, Chile: viñas, gastronomía, alojamiento, tour operadores y transporte. ${totalRegistradas} iniciativas registradas en el programa PTI Enoturismo del Biobío.`,
    '',
    '## Páginas principales',
    `- [Explorar el catálogo](${a('/explorar/')}): filtros por comuna y categoría, lista y mapa`,
    `- [Rutas y experiencias](${a('/rutas/')}): historias editoriales sobre vino, gastronomía y naturaleza`,
    `- [Sobre el proyecto](${a('/sobre/')}): qué es Enoturismo Biobío y preguntas frecuentes`,
    `- [Contacto](${a('/contacto/')}): consultas sobre el catálogo`,
    '',
    '## Iniciativas',
    ...iniciativas.map((i) => `- [${i.nombre}](${a(`/explorar/${i.slug}/`)}): ${nombreCategoria(i.categoria)} en ${nombreComuna(i.comuna)}`),
    '',
    '## Historias',
    ...articulos.map((r) => `- [${r.titulo}](${a(`/rutas/${r.slug}/`)}): ${nombreTema(r.tema)}. ${r.extracto}`),
    '',
  ]
  return new Response(lineas.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
