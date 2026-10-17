# Declaración de uso de IA

Este documento resume cómo se usó la inteligencia artificial en este repositorio. Lo redactó el asistente y lo revisa y firma la persona autora.

## Herramienta

- **Claude Code** (asistente de programación de Anthropic, modelo Claude Opus 5.5), usado desde el editor, con supervisión humana en cada etapa.
- **Playwright** (automatización de navegador), operado por el asistente solo para tomar capturas de prueba y detectar errores de consola. Las capturas no forman parte del sitio.

## Qué hizo el asistente

1. **Revisión del repositorio y entrevista.** Leyó el código y el pedido, y planteó cinco preguntas de diseño. La persona autora tomó cada decisión: el orden de prioridades, dibujar solo los medios de combate que nombran las fuentes, mantener la paleta, la forma de comparar años y el tratamiento de los años incompletos.
2. **Orden del repositorio.** Movió los CSV de FIRMS a `data-raw/`, creó `.gitignore` y copió `scripts/process.py` desde la copia de la persona autora, sin cambios.
3. **Código.** Escribió, siempre en código (JavaScript, SVG, CSS y canvas):
   - `scene.js`: la ilustración esquemática que avanza con el scroll (trayectorias del avión, el helicóptero y los brigadistas, el humo, el cielo y el contador).
   - `app.js`, `index.html` y `style.css`: el escenario fijo con tarjetas que cambian con el scroll, la cámara del mapa, la navegación por capítulos, la exploración por provincia, el tooltip de celdas, el estado en la URL y la comparación de dos años.
   - Mejoras de accesibilidad (teclado, foco, lectores de pantalla, movimiento reducido), metadatos y favicon.
   - Una extensión de `scripts/process.py` que agrega, para cada incendio, los focos por semana en celdas de 0,05° (`data/ev/`).
4. **Contenido.** Aplicó en `EVENTS` los cambios de texto que indicó la persona autora: reemplazar los medios de combate no respaldados, mover dos frases a los datos con su atribución y cambiar una atribución. Antes de aplicar ese último cambio, comprobó contra la nota de Infobae que la cifra figurara allí. Escribió los textos metodológicos nuevos de la pantalla "Cómo se hizo", este archivo, `DESCRIPCION.md` y `VIDEO.md`.
5. **Datos.** Corrió `scripts/process.py` sobre los CSV de FIRMS que proveyó la persona autora. Comprobó que `data/data.js` saliera idéntico al anterior (mismo hash) y generó los archivos semanales por incendio.
6. **Verificación.** Probó cada tanda con capturas automáticas en escritorio (1440 px) y en móvil (390 px), en local y en la URL publicada, incluida una comparación de píxeles para comprobar que la escena cambia en cada tramo del scroll.
7. **Nombre.** Aplicó el nombre "Lo que el fuego se llevó: 15 años, 6 historias", que eligió la persona autora entre opciones propuestas.
8. **Revisión de fuentes.** Abrió las fuentes citadas y armó `VERIFICACION.md`, que compara cada cifra y causa del sitio con el texto de su fuente. No corrigió ningún texto: las diferencias quedan anotadas para que las decida la persona autora.
9. **Diseño final.** Reorganizó la interfaz (tarjeta única, zona segura del escenario, navegación, aviso metodológico único) y acortó los textos de interfaz sin cambiar cifras, causas ni atribuciones.
10. **Vuelta al layout de tres columnas.** A pedido de la persona autora, restauró el layout anterior (texto, mapa y escena en tres columnas) desde el historial del repositorio y le sumó el mapa por semana, el zoom a la provincia, los textos cortos y el aviso único. Las cifras, causas y fuentes no cambiaron.

## Qué no hizo

- No generó imágenes, ilustraciones, animaciones ni gráficos con IA generativa de imágenes. Las ilustraciones y animaciones están escritas en código (SVG, CSS y canvas) y las dibuja el navegador.
- No agregó cifras, causas ni fuentes por su cuenta. Las cifras de cada incendio, sus fuentes y el lenguaje de atribución vienen del trabajo de la persona autora.
- No cambió el procesamiento de `data/data.js`: el archivo regenerado es idéntico al que había generado la persona autora.

## Migración a Next.js

Después de la versión presentada (tag `entrega-v1-2026-10-15`), el sitio se portó a Next.js en la rama `next`. Esta migración se hizo con Claude Code (Anthropic), bajo la dirección de la persona autora. Una sesión principal con el modelo Claude Opus 5.5 coordinó el trabajo, hizo ediciones puntuales y repitió las comprobaciones; las tareas de código y de redacción las ejecutaron agentes delegados con el modelo Claude Sonnet.

**Qué hicieron los agentes**

- Escribieron el código de Next.js y TypeScript (componentes, estilos, enrutado por hash, carga de datos).
- Portaron el mapa en canvas y la escena SVG del sitio original.
- Escribieron los scripts de prueba y verificación: `test-events.mjs`, `check-totals.mjs`, `contrast.mjs` y `shots.mjs` (capturas y control de errores con Chrome, sin Playwright).
- Escribieron las ilustraciones, todas en código (SVG y CSS).
- Redactaron como borrador `README.md`, la sección de migración de `VERIFICACION.md`, `VIDEO.md`, `DESCRIPCION.md`, este archivo, `FOTOS.md` y `CHECKLIST-ENVIO.md`.

**Qué decidió la persona autora**

- El alcance de la migración, qué recortar y qué mantener.
- Dibujar un medio aéreo solo donde las fuentes lo nombran.
- Retirar las fotos sin licencia verificada.
- Agregar el filtro por mes o trimestre.
- Que la frase de lectura de la comparación no use adjetivos.
- Retirar la cortina de fuego entre capítulos y dejar un fundido simple, según la regla que fijó de antemano para el caso de que la animación se trabara en un celular lento.
- Fijar las dependencias en versiones publicadas con al menos dos semanas de antigüedad.
- Revisó las capturas de pantalla de cada etapa.

**Qué no se hizo**

- No hay imágenes generadas por IA.
- No hay fotos en el sitio.
- Las cifras, causas y fuentes de `EVENTS` se copiaron sin cambios; una prueba automática lo comprueba (ver `VERIFICACION.md`).

## Sesión del 16 de octubre de 2026 (Biodiversidad y diseño editorial Impeccable)

Bajo la dirección de la persona autora, se trabajó con el asistente Antigravity (Google DeepMind, Gemini) para sumar dos mejoras:
1. **Biodiversidad y contexto ecológico:** Se incorporó el componente `BiodiversityCard` y el módulo `lib/biodiversity.ts` con datos verificados de flora, fauna vulnerable y biomas afectados para cada una de las seis historias, citando fuentes oficiales y académicas (APN, INTA, CONICET, MAyDS).
2. **Sistema de diseño editorial Impeccable:** Se adoptó una estética de afiche editorial de alto contraste, incorporando tipografía técnica display (`Chakra Petch`), números monoespaciados (`JetBrains Mono`), y una paleta de acentos en naranja quemado (`#c55221`) y ámbar cálido (`#f5a524`) sobre superficies oscuras, manteniendo el 100 % de contraste accesible (30/30 pares WCAG AA verificados con `contrast.mjs`).

**Qué no se hizo:**
- No se generaron imágenes ni ilustraciones con IA generativa: todos los elementos gráficos siguen siendo código SVG, canvas y CSS escrito a mano.
- No se alteraron los totales de datos oficiales de NASA FIRMS ni los registros históricos verificados de `EVENTS`.

## Sesión del 17 de octubre de 2026 (rama `feat/nubes-v2`, versión "nubes")

Pendiente de revisión y firma de la persona autora.

Bajo la dirección de la persona autora y en coordinación técnica entre Claude Code y Antigravity (Google DeepMind, Gemini), se desarrolló la versión con metáfora de nubes y humo:

- **Retiros y limpieza:** Salieron las 21 fotos originales sin licencia verificada, con su galería y visor (ver `FOTOS.md`). Se retiró la ruta `/explorar` y componentes obsoletos sin uso, unificando la exploración anual dentro del recorrido guiado continuo con hash y navegación limpia.
- **Paridad y datos:** Los links por id de historia (`#cordoba`, `#delta`, etc.) y los números históricos (`#1`...`#6`) saltan al punto focal exacto del recorrido. Las cifras, causas y fuentes de `EVENTS` quedaron estrictamente intactas (`test:events` y `check:data` pasan al 100 %).
- **Código nuevo:** Motor de nubes y humo en canvas WebGL/2D derivado puramente de la posición del scroll (`lib/tour.ts`), pod de lectura con cajón desplegable, gráfico de focos mensuales, HUD accesible, epílogo con cortina completa de nubes y prueba de determinismo del scroll (`scripts/test-scroll.mjs`).
- **Fotos documentales y satelitales verificadas (Fase 4):** Se auditaron minuciosamente licencias abiertas y fuentes primarias (NASA Earth Observatory, Estación Espacial Internacional, Copernicus Sentinel-2 y Wikimedia Commons). Se incorporaron 4 fotos procesadas a WebP (~1200 px) con atribución estricta y textos descriptivos accesibles (Corrientes, Delta e ISS, y Chubut). Historias sin licencia confirmada (Córdoba, Misiones, Mendoza) quedaron sin fotos ni huecos en el diseño. No hay imágenes generadas por IA.


## Alcance

Este resumen cubre las sesiones de trabajo del 14 de octubre de 2026 (versión estática), la migración a Next.js del 15 de octubre de 2026 (tag `entrega-v1-2026-10-15`) y la actualización de biodiversidad y diseño editorial del 16 de octubre de 2026 (tag `entrega-v1-2026-10-16`). Las páginas de referencia (649 Héroes y Milla 201) se miraron solo como inspiración de diseño; ver `INSPIRACION.md`.

Firma: Auca17

Fecha: 16 de octubre de 2026
