import type { APIRoute } from 'astro'
import { INDEXAR } from '../utils/config'
import { url } from '../utils/url'

// Buscadores y agentes de respuesta de IA (citan y enlazan al sitio).
const BOTS_BUSQUEDA = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot', 'Claude-User']

export const GET: APIRoute = ({ site }) => {
  if (!INDEXAR) {
    return new Response('# Prototipo con datos de ejemplo: no indexar.\nUser-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
  const sitemap = new URL(url('/sitemap-index.xml'), site).toString()
  const permitir = BOTS_BUSQUEDA.map((b) => `User-agent: ${b}\nAllow: /\n`).join('\n')
  const cuerpo = `# Producción. Entrenamiento de modelos (GPTBot, ClaudeBot, Google-Extended, CCBot): permitido por defecto; decisión del mandante.\n${permitir}\nUser-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`
  return new Response(cuerpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
