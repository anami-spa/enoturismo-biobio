/**
 * Builders de JSON-LD (schema.org). Funciones puras: reciben URLs ya resueltas con `url()` y el origen del sitio.
 * Los nombres de tipo y campos se replican 1:1 en los partials Blade de anami-cms.
 */
import type { Iniciativa } from './iniciativas'
import type { Articulo } from './articulos'

export const NOMBRE_SITIO = 'Enoturismo Biobío'
export const CONTEXTO = 'https://schema.org'

type Json = Record<string, unknown>

/** Ruta (ya con base) -> URL absoluta. */
export const abs = (ruta: string, origen: string) => new URL(ruta, origen).toString()

const limpiar = <T extends Json>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) as T

export const organizacion = (origen: string, rutaInicio: string, logo: string): Json => ({
  '@context': CONTEXTO,
  '@type': 'Organization',
  '@id': `${abs(rutaInicio, origen)}#organizacion`,
  name: NOMBRE_SITIO,
  alternateName: 'Enoturismo Biobío · Herencia viva',
  url: abs(rutaInicio, origen),
  logo,
})

export const sitioWeb = (origen: string, rutaInicio: string, rutaExplorar: string): Json => ({
  '@context': CONTEXTO,
  '@type': 'WebSite',
  name: NOMBRE_SITIO,
  url: abs(rutaInicio, origen),
  inLanguage: 'es-CL',
  publisher: { '@id': `${abs(rutaInicio, origen)}#organizacion` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${abs(rutaExplorar, origen)}?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
})

export const destino = (origen: string, rutaInicio: string, atracciones: { nombre: string; ruta: string }[]): Json => ({
  '@context': CONTEXTO,
  '@type': 'TouristDestination',
  name: 'Enoturismo en el Biobío',
  description: 'Viñas, gastronomía, alojamiento y experiencias para conocer el Biobío a través de sus vinos, paisajes y personas.',
  url: abs(rutaInicio, origen),
  touristType: 'Enoturismo',
  containedInPlace: { '@type': 'AdministrativeArea', name: 'Región del Biobío, Chile' },
  includesAttraction: atracciones.map((a) => ({ '@type': 'TouristAttraction', name: a.nombre, url: abs(a.ruta, origen) })),
})

export const migas = (origen: string, items: { nombre: string; ruta: string }[]): Json => ({
  '@context': CONTEXTO,
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, n) => ({ '@type': 'ListItem', position: n + 1, name: it.nombre, item: abs(it.ruta, origen) })),
})

export const listado = (origen: string, tipoPagina: 'CollectionPage' | 'AboutPage' | 'ContactPage', nombre: string, descripcion: string, ruta: string, items?: { nombre: string; ruta: string }[]): Json =>
  limpiar({
    '@context': CONTEXTO,
    '@type': tipoPagina,
    name: nombre,
    description: descripcion,
    url: abs(ruta, origen),
    inLanguage: 'es-CL',
    isPartOf: { '@type': 'WebSite', name: NOMBRE_SITIO },
    mainEntity: items
      ? {
          '@type': 'ItemList',
          numberOfItems: items.length,
          itemListElement: items.map((it, n) => ({ '@type': 'ListItem', position: n + 1, name: it.nombre, url: abs(it.ruta, origen) })),
        }
      : undefined,
  })

export const preguntas = (faqs: { pregunta: string; respuesta: string }[]): Json => ({
  '@context': CONTEXTO,
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.pregunta, acceptedAnswer: { '@type': 'Answer', text: f.respuesta } })),
})

const TIPO_POR_CATEGORIA: Record<string, string> = {
  vina: 'Winery',
  gastronomia: 'Restaurant',
  alojamiento: 'LodgingBusiness',
  'tour-operador': 'TravelAgency',
}
export const tipoNegocio = (categoria: string) => TIPO_POR_CATEGORIA[categoria] ?? 'LocalBusiness'

export const ficha = (origen: string, i: Iniciativa, comuna: string, ruta: string, imagen: string): Json => {
  const c = i.contacto
  const sameAs = [c.web, c.instagram?.startsWith('http') ? c.instagram : null].filter(Boolean)
  return limpiar({
    '@context': CONTEXTO,
    '@type': tipoNegocio(i.categoria),
    name: i.nombre,
    description: i.descripcion,
    url: abs(ruta, origen),
    image: imagen,
    telephone: c.telefono ?? undefined,
    email: c.email ?? undefined,
    address: { '@type': 'PostalAddress', streetAddress: i.direccion, addressLocality: comuna, addressRegion: 'Biobío', addressCountry: 'CL' },
    geo: { '@type': 'GeoCoordinates', latitude: i.lat, longitude: i.lng },
    sameAs: sameAs.length ? sameAs : undefined,
  })
}

export const articulo = (origen: string, a: Articulo, ruta: string, rutaInicio: string, imagen: string, relacionadas: { nombre: string; ruta: string }[]): Json =>
  limpiar({
    '@context': CONTEXTO,
    '@type': 'Article',
    headline: a.titulo,
    description: a.extracto,
    image: imagen,
    datePublished: a.fecha,
    dateModified: a.fecha,
    inLanguage: 'es-CL',
    mainEntityOfPage: abs(ruta, origen),
    author: { '@id': `${abs(rutaInicio, origen)}#organizacion` },
    publisher: { '@id': `${abs(rutaInicio, origen)}#organizacion` },
    mentions: relacionadas.length ? relacionadas.map((r) => ({ '@type': 'LocalBusiness', name: r.nombre, url: abs(r.ruta, origen) })) : undefined,
  })
