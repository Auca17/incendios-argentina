# Declaración de uso de IA

Este documento resume cómo se usó la inteligencia artificial en este repositorio. Lo redactó el asistente y lo revisa y firma la persona autora.

## Herramienta

- **Claude Code** (asistente de programación de Anthropic, modelo Claude Opus 5.5), usado desde el editor, con supervisión humana en cada etapa.
- **Playwright** (automatización de navegador), operado por el asistente solo para tomar capturas de prueba y detectar errores de consola. Las capturas no forman parte del sitio.

## Qué hizo el asistente

1. **Revisión del repositorio y entrevista.** Leyó el código y el pedido, y planteó cinco preguntas de diseño. La persona autora tomó cada decisión: el orden de prioridades, dibujar solo los medios de combate que nombran las fuentes, mantener la paleta, la forma de comparar años y el tratamiento de los años incompletos.
2. **Orden del repositorio.** Movió los CSV de FIRMS a `data-raw/`, creó `.gitignore` y copió `scripts/process.py` desde la copia de la persona autora, sin cambios.
3. **Código.** Escribió, siempre en código (JavaScript, SVG, CSS y canvas):
   - `scene.js`: la ilustración esquemática que avanza con el scroll.
   - En `app.js`: la exploración por provincia, el tooltip de celdas, el estado en la URL y la comparación de dos años.
   - Mejoras de accesibilidad, metadatos y favicon.
4. **Contenido.** Aplicó en `EVENTS` los cambios de texto que indicó la persona autora: reemplazar los medios de combate no respaldados, mover dos frases a los datos con su atribución y cambiar una atribución. Antes de aplicar ese último cambio, comprobó contra la nota de Infobae que la cifra figurara allí. Escribió los textos metodológicos nuevos de la pantalla "Cómo se hizo", este archivo, `DESCRIPCION.md` y `VIDEO.md`.
5. **Verificación.** Probó cada tanda con capturas automáticas en escritorio (1440 px) y en móvil (390 px), en local y en la URL publicada.

## Qué no hizo

- No generó imágenes, ilustraciones ni gráficos con IA generativa de imágenes. Todo el dibujo es código escrito a mano y renderizado por el navegador.
- No agregó cifras, causas ni fuentes por su cuenta. Las cifras de cada incendio, sus fuentes y el lenguaje de atribución vienen del trabajo de la persona autora.
- No procesó de nuevo los datos satelitales: `data/data.js` es el que generó la persona autora con `scripts/process.py`.

## Alcance

Este resumen cubre la sesión de trabajo del 14 de octubre de 2026. No describe el trabajo hecho antes en el repositorio.
