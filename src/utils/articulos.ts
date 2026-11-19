import datos from '../data/articulos.json'

export interface Articulo {
  titulo: string
  slug: string
  tema: string
  tipo: string
  extracto: string
  imagen: string
  alt: string
  fecha: string
  cuerpo: string[]
  cta: { texto: string; href: string }
  iniciativas_relacionadas: string[]
  ejemplo: boolean
}

export const temas = datos.temas
export const articulos: Articulo[] = datos.articulos

export const nombreTema = (slug: string) => temas.find((t) => t.slug === slug)?.nombre ?? slug
export const articulosDeTema = (slug: string) => articulos.filter((a) => a.tema === slug)

/** Otras historias para el pie del artículo: primero las del mismo tema, luego el resto. */
export const otrasHistorias = (a: Articulo, max = 2) =>
  [...articulos.filter((o) => o.slug !== a.slug)].sort((x, y) => Number(y.tema === a.tema) - Number(x.tema === a.tema)).slice(0, max)

export const fechaLarga = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
