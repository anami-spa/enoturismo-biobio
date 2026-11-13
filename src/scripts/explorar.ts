/**
 * Explorar: filtros combinables (comuna × categoría), búsqueda por nombre y vista Lista/Mapa.
 * El estado vive en la URL (?comuna=&categoria=&q=&vista=) para poder compartirlo.
 * Las tarjetas vienen renderizadas desde el servidor; aquí solo se muestran u ocultan.
 */
import type { Map as LeafletMap, LayerGroup, Marker } from 'leaflet'

interface Pin {
  slug: string
  nombre: string
  comuna: string
  comunaNombre: string
  categoria: string
  categoriaNombre: string
  lat: number
  lng: number
  foto: string
  href: string
}

interface Estado {
  comuna: string
  categoria: string
  q: string
  vista: 'lista' | 'mapa'
}

const CLAVE_VOLVER = 'explorar:consulta'
const COLOR_CATEGORIA: Record<string, string> = {
  vina: '#7c0f29',
  gastronomia: '#ef7d00',
  alojamiento: '#0eaaaa',
  'tour-operador': '#397c8c',
  transporte: '#4c2902',
  otro: '#240249',
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null

const controles = $('controles')
const lista = $('lista')
const contador = $('contador')
const vacio = $('vacio')
const limpiar = $<HTMLButtonElement>('limpiar')
const buscar = $<HTMLInputElement>('buscar')
const vistaMapa = $('vista-mapa')
const mapaError = $('mapa-error')
const pines: Pin[] = JSON.parse($('datos-pines')?.textContent ?? '[]')
const tarjetas = Array.from(lista?.querySelectorAll<HTMLElement>('li[data-slug]') ?? [])

const params = new URLSearchParams(location.search)
const estado: Estado = {
  comuna: params.get('comuna') ?? '',
  categoria: params.get('categoria') ?? '',
  q: params.get('q') ?? '',
  vista: params.get('vista') === 'mapa' ? 'mapa' : 'lista',
}

const coincide = (c: { comuna: string; categoria: string; nombre: string }, ignorar?: 'comuna' | 'categoria') =>
  (ignorar === 'comuna' || !estado.comuna || c.comuna === estado.comuna) &&
  (ignorar === 'categoria' || !estado.categoria || c.categoria === estado.categoria) &&
  (!estado.q || c.nombre.includes(normalizar(estado.q).trim()))

const datosTarjeta = (el: HTMLElement) => ({
  comuna: el.dataset.comuna ?? '',
  categoria: el.dataset.categoria ?? '',
  nombre: el.dataset.nombre ?? '',
})

function guardarUrl() {
  const p = new URLSearchParams()
  if (estado.comuna) p.set('comuna', estado.comuna)
  if (estado.categoria) p.set('categoria', estado.categoria)
  if (estado.q.trim()) p.set('q', estado.q.trim())
  if (estado.vista === 'mapa') p.set('vista', 'mapa')
  const consulta = p.toString() ? `?${p}` : ''
  history.replaceState(null, '', `${location.pathname}${consulta}`)
  try {
    sessionStorage.setItem(CLAVE_VOLVER, consulta)
  } catch {
    /* sin sessionStorage: "Volver a resultados" lleva a Explorar sin filtros */
  }
}

function pintarChips() {
  for (const grupo of ['comuna', 'categoria'] as const) {
    document.querySelectorAll<HTMLButtonElement>(`[data-filtro="${grupo}"] button[data-valor]`).forEach((b) => {
      const valor = b.dataset.valor ?? ''
      const activo = estado[grupo] === valor
      b.setAttribute('aria-pressed', String(activo))
      if (!valor) return
      // El conteo de cada chip respeta los otros filtros (no el de su propio grupo)
      const n = tarjetas.filter((t) => {
        const d = datosTarjeta(t)
        return d[grupo] === valor && coincide(d, grupo)
      }).length
      const cuenta = b.querySelector('[data-cuenta]')
      if (cuenta) cuenta.textContent = `(${n})`
      b.disabled = n === 0 && !activo
    })
  }
}

function aplicar() {
  let visibles = 0
  for (const t of tarjetas) {
    const ok = coincide(datosTarjeta(t))
    t.hidden = !ok
    if (ok) visibles++
  }
  pintarChips()

  const filtrado = Boolean(estado.comuna || estado.categoria || estado.q.trim())
  const nombreComuna = estado.comuna && document.querySelector(`[data-filtro="comuna"] [data-valor="${estado.comuna}"]`)?.firstChild?.textContent?.trim()
  const nombreCategoria = estado.categoria && document.querySelector(`[data-filtro="categoria"] [data-valor="${estado.categoria}"]`)?.firstChild?.textContent?.trim()
  const donde = [nombreComuna, nombreCategoria].filter(Boolean).join(' · ')
  if (contador) contador.textContent = `${visibles} ${visibles === 1 ? 'resultado' : 'resultados'}${donde ? ` — ${donde}` : ''}`
  if (limpiar) limpiar.hidden = !filtrado
  if (vacio) vacio.hidden = visibles !== 0

  document.querySelectorAll<HTMLButtonElement>('[data-vista]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vista === estado.vista)))
  if (lista) lista.hidden = estado.vista !== 'lista'
  if (vacio) vacio.hidden = visibles !== 0 || estado.vista !== 'lista'
  if (vistaMapa) vistaMapa.hidden = estado.vista !== 'mapa'
  if (estado.vista === 'mapa') void mostrarMapa()
  guardarUrl()
}

/* ---------- Mapa (Leaflet se descarga solo al abrir la vista) ---------- */

let mapa: LeafletMap | null = null
let capa: LayerGroup | null = null
let fallo = false
const marcadores = new Map<string, Marker>()

async function mostrarMapa() {
  if (fallo) return
  try {
    const L = (await import('leaflet')).default
    await import('leaflet/dist/leaflet.css')
    const contenedor = $('mapa')
    if (!contenedor) return
    if (!mapa) {
      mapa = L.map(contenedor, { scrollWheelZoom: false }).setView([-37.3, -72.4], 8)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapa)
      capa = L.layerGroup().addTo(mapa)
      for (const p of pines) {
        const color = COLOR_CATEGORIA[p.categoria] ?? '#240249'
        const icono = L.divIcon({
          className: '',
          // Área táctil de 44×44 (WCAG 2.5.8); el dibujo del pin queda centrado dentro
          iconSize: [44, 44],
          iconAnchor: [22, 40],
          popupAnchor: [0, -34],
          html: `<svg viewBox="0 0 30 38" width="30" height="38" style="display:block;margin:3px auto 0" aria-hidden="true"><path d="M15 37C15 37 2 24 2 14a13 13 0 0 1 26 0c0 10-13 23-13 23Z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="4.5" fill="#fff"/></svg>`,
        })
        const m = L.marker([p.lat, p.lng], { icon: icono, alt: p.nombre, title: p.nombre, keyboard: true })
        m.bindPopup(() => crearVistaPrevia(p), { minWidth: 220, maxWidth: 260 })
        marcadores.set(p.slug, m)
      }
    }
    mapa.invalidateSize()
    actualizarPines()
  } catch {
    fallo = true
    if (mapaError) mapaError.hidden = false
    if (vistaMapa) vistaMapa.hidden = true
  }
}

function actualizarPines() {
  if (!mapa || !capa) return
  capa.clearLayers()
  const visibles = pines.filter((p) => coincide({ comuna: p.comuna, categoria: p.categoria, nombre: normalizar(p.nombre) }))
  for (const p of visibles) marcadores.get(p.slug)?.addTo(capa)
  if (visibles.length === 0) return
  const puntos = visibles.map((p) => [p.lat, p.lng] as [number, number])
  mapa.fitBounds(puntos, { padding: [48, 48], maxZoom: estado.comuna || puntos.length === 1 ? 12 : 10 })
}

/** Vista previa del pin. Se arma con el DOM (textContent), nunca con innerHTML. */
function crearVistaPrevia(p: Pin): HTMLElement {
  const caja = document.createElement('div')
  caja.className = 'w-56 text-ciruela-oscuro'
  const img = document.createElement('img')
  img.src = p.foto
  img.alt = ''
  img.width = 240
  img.height = 160
  img.className = 'mb-2 aspect-[3/2] w-full rounded-lg object-cover'
  const titulo = document.createElement('strong')
  titulo.className = 'block text-base'
  titulo.textContent = p.nombre
  const meta = document.createElement('span')
  meta.className = 'block text-sm'
  meta.textContent = `${p.comunaNombre} · ${p.categoriaNombre}`
  const enlace = document.createElement('a')
  enlace.href = p.href
  enlace.textContent = 'Ver ficha →'
  enlace.className = 'mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4'
  caja.append(img, titulo, meta, enlace)
  return caja
}

/* ---------- Eventos ---------- */

controles?.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button')
  if (!b) return
  const grupo = b.closest<HTMLElement>('[data-filtro]')?.dataset.filtro as 'comuna' | 'categoria' | undefined
  if (grupo && b.dataset.valor !== undefined) {
    // Volver a pulsar el chip activo lo apaga
    estado[grupo] = estado[grupo] === b.dataset.valor ? '' : b.dataset.valor
    aplicar()
  } else if (b.dataset.vista) {
    estado.vista = b.dataset.vista === 'mapa' ? 'mapa' : 'lista'
    aplicar()
    // El mapa arranca bajo los filtros: se sube hasta él para que se vea completo
    if (estado.vista === 'mapa') vistaMapa?.scrollIntoView({ block: 'start' })
  }
})

buscar?.addEventListener('input', () => {
  estado.q = buscar.value
  aplicar()
})

limpiar?.addEventListener('click', () => {
  estado.comuna = ''
  estado.categoria = ''
  estado.q = ''
  if (buscar) buscar.value = ''
  aplicar()
})

if (buscar) {
  buscar.value = estado.q
  if (params.has('buscar')) buscar.focus()
}
aplicar()
