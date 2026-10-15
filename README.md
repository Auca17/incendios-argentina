# Lo que el fuego se llevó: 15 años, 6 historias

Seis incendios argentinos contados con sus fuentes y con los focos de calor detectados por satélite (NASA FIRMS, VIIRS S-NPP) entre 2012 y 2026, más una exploración por año, provincia y período. Esta rama (`next`) es la versión en Next.js (exportación estática, TypeScript).

## Versión presentada

| Dato | Valor |
|---|---|
| Tag congelado | `entrega-v1-2026-10-15` |
| Commit | `8d664bb` |
| URL pública | <https://auca17.github.io/incendios-argentina/> |

`main` y GitHub Pages no se tocan hasta que los organizadores confirmen cómo se actualiza la versión presentada. Esa versión es el sitio estático original, que se conserva en `legacy/` para comparar.

## Cómo está organizado el código

| Carpeta | Contenido |
|---|---|
| `app/` | Next.js (App Router): `layout.tsx`, `page.tsx`, estilos globales y variables de diseño en `globals.css`. |
| `components/` | Interfaz en React con CSS Modules: barra superior, navegación, tres paneles (texto, mapa, escena), exploración, gráficos, aviso metodológico y transición entre capítulos. |
| `lib/` | Lógica sin interfaz (ver tabla siguiente). |
| `public/data/` | Datos en JSON, cargados bajo demanda. |
| `legacy/` | Sitio estático original (HTML, CSS, JS), ejecutable tal cual. Es la referencia de las pruebas. |
| `scripts/` | Procesamiento de datos y verificaciones. |

Módulos principales de `lib/`:

| Módulo | Qué hace |
|---|---|
| `events.ts` | `EVENTS`: cifras, causas, fuentes y atribuciones de cada incendio. Copia literal del original; no se edita sin revisar `VERIFICACION.md`. |
| `router.ts` | Estado de la vista en la URL (`#0`…`#7`, `&y=`, `&p=`, `&c=`, `&m=`). |
| `progress.ts` | Avance del scroll del texto (`p`, entre 0 y 1) que mueve a la vez el mapa y la escena. |
| `data.ts` | Carga perezosa de `public/data/*.json` con caché; soporta `NEXT_PUBLIC_BASE_PATH`. |
| `firemap.ts` | Mapa en canvas: cámara con zoom a la provincia, celdas anuales y focos semanales. |
| `scene.ts` | Ilustración SVG esquemática, hecha en código. Solo dibuja los medios de combate que nombran las fuentes (`means` en `EVENTS`). |
| `fire.ts` | Auxiliares de cada capítulo: hechos por etapa, mapa de `p` a escena y línea "semana N de M · focos · hasta el …". |
| `explore.ts` | Exploración: ranking y serie por provincia, filtro por mes o trimestre, comparación de dos años y frase de lectura. |

## De dónde salen los datos

- **Focos de calor:** [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/), sensor VIIRS S-NPP, archivo estándar y tiempo casi real. Se conservan los focos de vegetación (`type == 0` en el archivo estándar) con confianza nominal o alta.
- **Límites provinciales:** [Natural Earth](https://www.naturalearthdata.com/) (`ne_10m_admin_1_states_provinces`, dominio público).
- **Cifras y causas de cada incendio:** informes oficiales y prensa citados en el sitio y comparados en `VERIFICACION.md`. No provienen del satélite.

## Cómo se regeneran los datos

1. Descargar de FIRMS los `fire_archive_*.csv` y `fire_nrt_*.csv` de VIIRS S-NPP para Argentina y guardarlos en `data-raw/`. Esa carpeta nunca se sube al repositorio (pesa más de 200 MB; ver `.gitignore`).
2. Descargar el GeoJSON de Natural Earth.
3. Correr (requiere `pandas`, `numpy` y `shapely>=2`):

   ```sh
   python scripts/process.py data-raw <ruta/al/geojson> legacy/data
   ```

   El script escribe los archivos del sitio original en `legacy/data/` y los mismos datos en JSON en `public/data/`. Si existe `scripts/events.json`, también genera los archivos semanales de cada incendio.
4. Alternativa sin los CSV: `node scripts/to-json.mjs` convierte `legacy/data/*.js` a `public/data/*.json`.

## Cómo ejecutarlo

Requiere Node.js y npm.

```sh
npm ci            # instala las versiones del package-lock.json
npm run dev       # servidor de desarrollo en http://localhost:3000
npm run build     # exportación estática en out/
```

El sitio original se mira con cualquier servidor estático, por ejemplo `python -m http.server 8000 --directory legacy`.

## Cómo correr las verificaciones

| Comando | Qué comprueba |
|---|---|
| `npm run test:events` | `EVENTS` de `lib/events.ts` es idéntico al de `legacy/app.js` (`deepStrictEqual`). |
| `npm run check:data` | Los 24 JSON de `public/data/` son idénticos a los datos originales, el total es 2.620.568 focos y la lectura de Chubut en `p = 0` es "semana 1 de 44 · 1.122 focos · hasta el 7 de enero de 2026". |
| `node scripts/contrast.mjs` | Contraste AA de los pares de colores de la interfaz. |
| `node scripts/shots.mjs …` | Capturas y control de salud (errores de consola, pedidos fallidos, desborde horizontal) con Chrome, sin dependencias de npm. |

Ejemplo de `shots.mjs`, con el sitio exportado servido localmente:

```sh
npm run build
python -m http.server 8770 --directory out
node scripts/shots.mjs --url "http://localhost:8770/#6" --w 1440 --h 900 --out shots --prefix chubut_desk
```

Los resultados de la migración están en `VERIFICACION.md`.

## Cómo se publica

- **Vercel (previsto):** proyecto conectado a la rama `next`, con exportación estática (`output: 'export'`). En los documentos del concurso usar solo el alias de producción, porque las URL de vista previa incluyen el nombre de la cuenta o del equipo.
- **GitHub Pages (alternativa):** necesita un repositorio aparte; si se usara el mismo, reemplazaría el sitio presentado. Si el sitio queda en una subruta, compilar con `NEXT_PUBLIC_BASE_PATH=/<repositorio> npm run build` (lo leen `next.config.mjs` y `lib/data.ts`).

## Dependencias

- Solo npm. Versiones exactas (`.npmrc` con `save-exact=true`) y publicadas hace al menos dos semanas.
- Next.js, React y TypeScript; sin otras dependencias de ejecución.

## Fotos

El sitio no incluye fotos. Las 18 que había se retiraron por no tener licencia verificada; el registro y la política para incorporar nuevas están en `FOTOS.md`.

## Documentos

- `VERIFICACION.md`: compara cada cifra y causa con su fuente y registra las verificaciones de la migración. Los puntos marcados los decide la persona autora.
- `DESCRIPCION.md`: descripción metodológica para la presentación.
- `VIDEO.md`: guion del video de 60 segundos.
- `IA-declaracion.md`: uso de IA en el proyecto.
- `FOTOS.md`: registro de fotos retiradas y política de fotos.
- `CHECKLIST-ENVIO.md`: pasos previos a actualizar la versión presentada.
- `INSPIRACION.md`: referencias de diseño.
