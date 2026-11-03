# Enoturismo Biobío — prototipo de la Home

Prototipo estático de la portada del catálogo de Enoturismo Biobío. Astro 5 + Tailwind 4, sin React.
Es una vitrina de revisión: `noindex`, datos de ejemplo y sujeto a cambios.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
```

Se publica en GitHub Pages con cada push a `main` (`.github/workflows/pages.yml`).
Los assets originales del cliente no se versionan; `npm run assets` los regenera desde la carpeta indicada en `ENOTURISMO_ORIGEN`.
