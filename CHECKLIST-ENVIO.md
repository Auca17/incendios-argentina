# Lista de pasos antes de actualizar la entrega

Fecha límite: 31/10/2026 a las 23:59. Estado al 31/10/2026.

## Publicación

- [x] `main` se publica sola en GitHub Pages con GitHub Actions (uno o dos minutos después de cada push).
- [ ] Elegir la URL que va al formulario y al video. La de GitHub Pages incluye el usuario de GitHub; usarla solo si ese usuario es el seudónimo. Si no, usar un alias de Vercel con un nombre neutro.
- [ ] Abrir esa URL en una ventana de incógnito a 1440 × 900 y a 390 × 844, y recorrer la portada, los seis incendios, "Dónde más ardió", el epílogo, `/explorar` y las fuentes.

## Verificaciones

- [x] `npm run test:events` (6 eventos idénticos)
- [x] `npm run check:data` (2.620.568 focos y Chubut sem 1 = 1.122 focos)
- [x] `node scripts/contrast.mjs` (30/30 pares AA)
- [x] `node scripts/shots.mjs` (capturas automáticas sin errores de consola ni desbordes)

## Documentos

- [x] `DESCRIPCION.md` no pasa de 200 palabras: 187 sin el título, 196 con el título.
- [x] `FOTOS.md` al día: cinco imágenes con licencia abierta, verificadas el 31/10/2026 en Wikimedia Commons.
- [x] `IA-declaracion.md` cubre todas las sesiones hasta el 31/10/2026. Falta que la persona autora la relea antes de pegarla en el formulario.
- [x] `VIDEO.md`: texto de la voz, independiente de la grabación de la página.
- [x] Ningún documento nombra al autor ni incluye su correo.
- [ ] Grabar la pasada por la página y la voz por separado, montarlas (como máximo 1 minuto) y subir el video como "no listado".

## Formulario

- [ ] Categoría: Historia visual.
- [ ] Título: "Lo que el fuego se llevó: 15 años, 6 historias".
- [ ] Descripción metodológica: el texto de `DESCRIPCION.md`, sin el título.
- [ ] Fuente de los datos: NASA FIRMS (VIIRS S-NPP), Natural Earth, y los informes y notas citados en la sección Fuentes del sitio, con sus enlaces.
- [ ] Uso de IA: el resumen de `IA-declaracion.md` (herramientas, etapas y finalidad).
- [ ] Enlace al video y enlace al sitio.
- [ ] Seudónimo, y aceptar las bases y la declaración de propiedad intelectual.
- [ ] Informar que el nombre de usuario y el correo figuran en el historial del repositorio (decisión tomada antes).
