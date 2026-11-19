#!/usr/bin/env node
/**
 * Verifica dist/ tras `npm run build`: enlaces internos y anclas, metadatos, JSON-LD, robots coherente con INDEXAR y presupuestos de peso.
 * Sin dependencias. Uso: npm run build && npm run verificar   (con el mismo BASE_PATH / INDEXAR que el build)
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, relative } from 'node:path'

const DIST = new URL('../dist/', import.meta.url).pathname
const BASE = (process.env.BASE_PATH || '/').replace(/\/$/, '')
const INDEXAR = process.env.INDEXAR === 'true'

const PRESUPUESTO = { html: 60 * 1024, jsGzip: 2 * 1024, jsonLd: 3 * 1024 }
const JS_GZIP_POR_RUTA = { '/explorar/': 4 * 1024 } // Explorar: filtros + mapa (Leaflet va aparte, con import())

const fallos = []
const avisos = new Set()
const falla = (pagina, msg) => fallos.push(`${pagina}: ${msg}`)

const html = []
const recorrer = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) recorrer(p)
    else if (f.endsWith('.html')) html.push(p)
  }
}
recorrer(DIST)

const rutaDe = (archivo) => '/' + relative(DIST, archivo).replace(/index\.html$/, '').replace(/\\/g, '/')

const quitarBase = (href) => (BASE && href.startsWith(BASE) ? href.slice(BASE.length) || '/' : href)
const existe = (ruta) => {
  const limpia = decodeURIComponent(ruta.split('#')[0].split('?')[0])
  return [join(DIST, limpia), join(DIST, limpia, 'index.html'), join(DIST, limpia + '.html')].some((p) => existsSync(p) && statSync(p).isFile())
}

const idsDe = (src) => new Set([...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
const cacheIds = new Map()
const idsPagina = (ruta) => {
  if (!cacheIds.has(ruta)) {
    const p = [join(DIST, ruta, 'index.html'), join(DIST, ruta)].find((x) => existsSync(x) && statSync(x).isFile())
    cacheIds.set(ruta, p ? idsDe(readFileSync(p, 'utf8')) : new Set())
  }
  return cacheIds.get(ruta)
}

const pesoJs = (src, ruta) => {
  const vistos = new Set()
  let total = 0
  const sumar = (codigo) => (total += gzipSync(codigo).length)
  const cargar = (archivoRel) => {
    if (vistos.has(archivoRel)) return
    vistos.add(archivoRel)
    const p = join(DIST, archivoRel)
    if (!existsSync(p)) return
    const codigo = readFileSync(p, 'utf8')
    sumar(codigo)
    for (const m of codigo.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) cargar(join(archivoRel, '..', m[1]))
  }
  for (const m of src.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) cargar(quitarBase(m[1]).replace(/^\//, ''))
  for (const m of src.matchAll(/<script(?![^>]*(?:src=|type="application\/(?:ld\+)?json"))[^>]*>([\s\S]*?)<\/script>/g)) sumar(m[1])
  return total
}

for (const archivo of html) {
  const ruta = rutaDe(archivo)
  const pagina = BASE + ruta
  const src = readFileSync(archivo, 'utf8')
  const esHome = ruta === '/'

  // Peso
  const bytes = Buffer.byteLength(src)
  if (bytes > PRESUPUESTO.html) falla(pagina, `HTML ${Math.round(bytes / 1024)} KB > ${PRESUPUESTO.html / 1024} KB`)
  const js = pesoJs(src, ruta)
  const tope = JS_GZIP_POR_RUTA[ruta] ?? PRESUPUESTO.jsGzip
  if (js > tope) falla(pagina, `JS inicial ${js} B gzip > ${tope} B`)

  // Metadatos
  if (!/<title>[^<]+<\/title>/.test(src)) falla(pagina, 'sin <title>')
  if (!/<meta name="description" content="[^"]{20,}"/.test(src)) falla(pagina, 'sin meta description (o muy corta)')
  if (!/<link rel="canonical" href="https?:\/\//.test(src)) falla(pagina, 'sin canonical absoluto')
  if ((src.match(/<h1[\s>]/g) ?? []).length !== 1) falla(pagina, 'debe tener exactamente un <h1>')
  const robots = /<meta name="robots" content="([^"]+)"/.exec(src)?.[1] ?? ''
  if (INDEXAR && /noindex/.test(robots)) falla(pagina, 'INDEXAR=true pero la página dice noindex')
  if (!INDEXAR && !/noindex/.test(robots)) falla(pagina, 'INDEXAR=false pero la página no dice noindex')

  // Imágenes con alt
  for (const m of src.matchAll(/<img\b[^>]*>/g)) if (!/\salt(=|\s|\/?>)/.test(m[0])) falla(pagina, `<img> sin alt: ${m[0].slice(0, 80)}`)

  // JSON-LD
  const bloques = [...src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])
  const tipos = []
  let bytesLd = 0
  for (const b of bloques) {
    bytesLd += Buffer.byteLength(b)
    try {
      const j = JSON.parse(b)
      if (!j['@context'] || !j['@type']) falla(pagina, 'JSON-LD sin @context o @type')
      tipos.push(j['@type'])
    } catch {
      falla(pagina, 'JSON-LD no es JSON válido')
    }
  }
  if (bytesLd > PRESUPUESTO.jsonLd) falla(pagina, `JSON-LD ${bytesLd} B > ${PRESUPUESTO.jsonLd} B`)
  if (!tipos.length) falla(pagina, 'sin JSON-LD')
  if (esHome && !(tipos.includes('Organization') && tipos.includes('WebSite'))) falla(pagina, 'Home sin Organization + WebSite')
  if (!esHome && !tipos.includes('BreadcrumbList')) falla(pagina, 'sin BreadcrumbList')

  // Enlaces internos y anclas
  for (const m of src.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)) {
    const href = m[1].replace(/&amp;/g, '&')
    if (/^(https?:|mailto:|tel:|javascript:)/.test(href)) continue
    if (/\/#(rutas|sobre|contacto)$/.test(href)) falla(pagina, `ancla obsoleta: ${href}`)
    if (href === '#') { avisos.add('enlace placeholder href="#" (Instagram del footer: falta la URL oficial)'); continue }
    if (href.startsWith('#')) {
      if (!idsDe(src).has(href.slice(1))) falla(pagina, `ancla inexistente: ${href}`)
      continue
    }
    const interno = quitarBase(href)
    if (!interno.startsWith('/')) continue
    if (!existe(interno)) falla(pagina, `enlace roto: ${href}`)
    const frag = interno.split('#')[1]
    if (frag && existe(interno)) {
      const destino = interno.split('#')[0].split('?')[0]
      if (!idsPagina(destino).has(frag)) falla(pagina, `ancla inexistente en destino: ${href}`)
    }
  }
}

// robots.txt y sitemap
const robotsTxt = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : ''
if (!robotsTxt) falla('robots.txt', 'no existe')
if (INDEXAR && /Disallow:\s*\/\s*$/m.test(robotsTxt)) falla('robots.txt', 'INDEXAR=true pero bloquea todo')
if (!INDEXAR && !/Disallow:\s*\/\s*$/m.test(robotsTxt)) falla('robots.txt', 'INDEXAR=false pero no bloquea')
if (INDEXAR && !/Sitemap:/.test(robotsTxt)) falla('robots.txt', 'sin línea Sitemap')
if (INDEXAR !== existsSync(join(DIST, 'sitemap-index.xml'))) falla('sitemap', INDEXAR ? 'falta sitemap-index.xml' : 'hay sitemap con INDEXAR=false')
if (!existsSync(join(DIST, 'llms.txt'))) falla('llms.txt', 'no existe')

if (fallos.length) {
  console.error(`✗ ${fallos.length} problema(s) en ${html.length} páginas:\n` + fallos.map((f) => `  - ${f}`).join('\n'))
  process.exit(1)
}
for (const a of avisos) console.warn(`⚠ aviso (no bloquea): ${a}`)
console.log(`✓ ${html.length} páginas verificadas (INDEXAR=${INDEXAR}, base="${BASE || '/'}"): enlaces, metadatos, JSON-LD, robots y presupuestos OK`)
