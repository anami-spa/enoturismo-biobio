import datos from '../data/iniciativas.json'

export interface Contacto {
  whatsapp: string | null
  telefono: string | null
  email: string | null
  web: string | null
  instagram: string | null
}

export interface Iniciativa {
  nombre: string
  slug: string
  comuna: string
  categoria: string
  imagen: string
  galeria: string[]
  descripcion: string
  direccion: string
  lat: number
  lng: number
  horario: string
  servicios: string[]
  reserva: boolean
  contacto: Contacto
  ejemplo: boolean
  coords_aprox: boolean
  contenido_ejemplo: boolean
}

const fotos = import.meta.glob<{ default: ImageMetadata }>('../assets/fotos/*.webp', { eager: true })

export const foto = (nombre: string): ImageMetadata => {
  const f = fotos[`../assets/fotos/${nombre}.webp`]
  if (!f) throw new Error(`Foto no encontrada en src/assets/fotos: ${nombre}`)
  return f.default
}

export const categorias = datos.categorias
export const comunas = datos.comunas
export const iniciativas: Iniciativa[] = datos.iniciativas
export const totalRegistradas = datos.total_registradas

export const nombreCategoria = (slug: string) => categorias.find((c) => c.slug === slug)?.nombre ?? slug
export const nombreComuna = (slug: string) => comunas.find((c) => c.slug === slug)?.nombre ?? slug

/** Quita tildes y pasa a minúsculas: base de la búsqueda por nombre (servidor y cliente deben coincidir). */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Otras iniciativas de la misma comuna (para "También en {comuna}"). */
export const cercanas = (i: Iniciativa, max = 3) =>
  iniciativas.filter((o) => o.comuna === i.comuna && o.slug !== i.slug).slice(0, max)

/** "{nombre} es {esto} en {comuna}": primera frase factual de la ficha (la citan buscadores y agentes de IA). */
const ARTICULO_CATEGORIA: Record<string, string> = {
  vina: 'una viña',
  gastronomia: 'una iniciativa gastronómica',
  alojamiento: 'un alojamiento',
  'tour-operador': 'un tour operador',
  transporte: 'un servicio de transporte',
  otro: 'una iniciativa de enoturismo',
}
export const queEs = (i: Iniciativa) => `${i.nombre} es ${ARTICULO_CATEGORIA[i.categoria] ?? 'una iniciativa de enoturismo'} en ${nombreComuna(i.comuna)}, Región del Biobío.`

/** Plural de cada categoría para títulos de las páginas de listado. */
export const PLURAL_CATEGORIA: Record<string, string> = {
  vina: 'Viñas',
  gastronomia: 'Gastronomía',
  alojamiento: 'Alojamiento',
  'tour-operador': 'Tour operadores',
  transporte: 'Transporte',
  otro: 'Otras iniciativas',
}
