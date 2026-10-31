# Lo que el fuego se llevó: descripción metodológica

**Datos.** Focos de calor del sensor VIIRS (Suomi NPP) de NASA FIRMS, del 20/1/2012 al 14/10/2026: 2.620.568 focos. Se conservaron los de vegetación con confianza nominal o alta, asignados a provincias con límites de Natural Earth y agrupados por provincia y mes, en celdas de 0,25° por año y, por incendio, de 0,05° por semana. Hectáreas, causas y medios de combate vienen de informes oficiales y prensa citados.

**Diseño.** Un recorrido por scroll se abre entre nubes, revela Argentina y baja de norte a sur por seis incendios. En cada uno, el mapa suma los focos reales semana a semana y una ilustración hecha en código muestra inicio, fuego y combate según la fuente. Cierran las provincias donde más ardió, la del lector y un explorador por año y provincia.

**Limitaciones.** Un foco no equivale a una hectárea quemada ni a un incendio, e incluye quemas agrícolas. El satélite no ve fuegos breves ni bajo nubes.

**IA.** Claude Code (Anthropic) y, en una etapa, Gemini (Google) se usaron para escribir el código y revisar textos, bajo dirección y revisión humana. No hay imágenes generadas por IA: las ilustraciones son código.
