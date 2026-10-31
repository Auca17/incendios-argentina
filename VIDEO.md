# Lo que el fuego se llevó: texto del video

Actualizado el 31/10/2026 para la versión publicada.

El video tiene dos partes que se graban por separado:

- **Imagen:** una pasada por toda la página (portada, los seis incendios, "Dónde más ardió", el epílogo y `/explorar`), en una ventana de incógnito a 1440 × 900. Si dura más de un minuto, se acelera hasta que entre.
- **Voz:** el texto de abajo, leído aparte y montado sobre la imagen. No depende de lo que se vea en cada momento.

El video final dura como máximo 1 minuto (bases, punto 11). El texto tiene 140 palabras: al ritmo de la última lectura (131 palabras en unos 49 segundos) son unos 52 segundos.

## Texto

Cada año, en algún lugar de Argentina, algo se prende fuego.

Selva, sierras, humedales, bosque.

Un satélite de la NASA lo mira todos los días. Entre 2012 y 2026 registró más de dos millones y medio de focos de calor.

Cada foco es un punto caliente que el satélite detecta desde el espacio. Puede ser un incendio o una quema en el campo, y un solo incendio puede dejar miles. No mide hectáreas quemadas: esas las cuentan las fuentes.

Pero un punto en un mapa no dice qué se perdió, ni quién estuvo ahí para apagarlo.

Lo que el fuego se llevó junta las dos cosas: los datos del satélite y la historia de seis incendios, con sus fuentes.

Para que la próxima vez que veas humo en las noticias, sepas lo que hay detrás.

Recorrelo. Y buscá tu provincia.

## Por qué el texto dice lo que dice

- "Más de dos millones y medio": 2.620.568 focos del sensor VIIRS (Suomi NPP) de NASA FIRMS (`npm run check:data`).
- "Un solo incendio puede dejar miles": Chubut sumó 1.122 focos solo en su primera semana (`npm run check:data`). La definición de foco es la misma que da el sitio en la portada y en "Más información".
- "Quién estuvo ahí para apagarlo": cada incendio cita quién lo combatió (brigadas, bomberos, medios aéreos) según sus fuentes.
