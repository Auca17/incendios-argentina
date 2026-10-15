# Lo que el fuego se llevó: 15 años, 6 historias

Seis incendios argentinos contados con sus fuentes y los focos de calor detectados por satélite (NASA FIRMS, VIIRS S-NPP) entre 2012 y 2026, con un mapa para explorar los datos.

**Sitio:** [auca17.github.io/incendios-argentina](https://auca17.github.io/incendios-argentina/)

Sitio estático: HTML, CSS y JavaScript sin compilación ni dependencias externas. Se publica con GitHub Pages desde la raíz de la rama `main`.

## Autor

**Augustus Rufino** · [augurufino@gmail.com](mailto:augurufino@gmail.com) · GitHub: [@Auca17](https://github.com/Auca17)

Idea, investigación, verificación de fuentes y dirección del proyecto. El código se escribió con asistencia de IA bajo supervisión del autor; el detalle está en `IA-declaracion.md`.

## Cómo verlo localmente

El sitio carga los datos con `<script>`, pero conviene servirlo por HTTP en lugar de abrir el archivo directamente:

```sh
python -m http.server 8000
```

Después abrir `http://localhost:8000`.

## Cómo está organizado el código

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura de la página: sidebar (`#side`), mapa (`#mapwrap` con `canvas#map`), escena (`#scenewrap`), cápsula del aviso metodológico (`#caveat`) y navegación (`#nav`). |
| `style.css` | Layout de tres columnas en escritorio. En móvil (menos de 900 px), el mapa y la escena quedan fijos arriba y el texto va debajo. |
| `app.js` | Todo el comportamiento. Arriba están `EVENTS` (cifras, causas, fuentes y atribuciones de cada incendio: no se editan sin revisar `VERIFICACION.md`) y las funciones de datos. Después vienen el mapa en canvas (cámara con zoom a la provincia, focos semanales), la exploración por año y provincia, la comparación de dos años y el render de cada pantalla. |
| `scene.js` | `FireScene.create(opciones)` devuelve la ilustración SVG esquemática. `update(s)` la lleva a un estado entre 0 y 1: cómo empezó, el fuego y el combate. Solo dibuja los medios de combate que nombran las fuentes (`means` en `EVENTS`). |
| `data/data.js` | `window.DATA`: provincias (Natural Earth), focos por provincia y mes, y celdas de 0,25° por año. |
| `data/ev/<id>.js` | `window.EV_FOCI[id]`: focos de cada incendio por semana en celdas de 0,05°. Se cargan solo al abrir ese incendio. |
| `img/fotos/<id>-N.jpg` | Tres fotos documentales por incendio (registro testimonial). Las atribuciones están en `app.js`. Los originales sin normalizar no se suben (ver `.gitignore`). |
| `scripts/process.py` | Genera `data/data.js`, `data/meta.json` y `data/ev/*.js`. |
| `scripts/events.json` | Provincias, año y meses de cada incendio para los archivos semanales. |

### Cómo se mueve la página

En cada incendio, el avance del scroll del sidebar (`p`, entre 0 y 1) mueve los tres paneles a la vez:

- En el centro, el mapa suma los focos semana a semana. Arranca en la primera semana con focos y muestra la línea "semana N de M · focos · hasta el …".
- A la derecha, la escena avanza (`toScene` en `app.js`, alineada con los títulos de los tres capítulos).
- Si el scroll vuelve atrás, todo se revierte.

Con `prefers-reduced-motion`, la escena muestra un cuadro fijo por etapa y el mapa no anima la cámara.

## Cómo se regeneran los datos

1. Descargar de [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/download/) el archivo de VIIRS S-NPP para Argentina: los `fire_archive_*.csv` y los `fire_nrt_*.csv`. Guardarlos en `data-raw/`. Pesan más de 200 MB y no se suben al repositorio (ver `.gitignore`).
2. Descargar los límites provinciales de Natural Earth (`ne_10m_admin_1_states_provinces.geojson`, dominio público).
3. Correr:

   ```sh
   python scripts/process.py data-raw <ruta/al/geojson> data
   ```

   Requiere `pandas`, `numpy` y `shapely>=2`.

El script descarta los puntos de confianza baja y los que no son fuego de vegetación. Si existe `scripts/events.json`, también genera los archivos semanales de `data/ev/`.

## Documentos

- `VERIFICACION.md`: compara cada cifra y causa con su fuente. Los puntos marcados los decide la persona autora.
- `DESCRIPCION.md`: descripción metodológica para la presentación.
- `VIDEO.md`: guion del video de 60 segundos.
- `IA-declaracion.md`: uso de IA en el proyecto.
- `INSPIRACION.md`: referencias de diseño.

## Versiones

- Tag `estable-pre-final`: estado anterior a la pasada final de diseño.
- Tag `estable-foco-cero-pantalla-completa`: el diseño de escenario a pantalla completa, reemplazado por el layout actual de tres columnas.
