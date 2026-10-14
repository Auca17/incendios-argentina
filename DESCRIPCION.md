# Foco Cero: descripción metodológica

**Datos.** Focos de calor del sensor VIIRS (satélite Suomi NPP) de [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/), archivo estándar y tiempo casi real, del 20/01/2012 al 14/10/2026. Se conservaron los focos de vegetación con confianza nominal o alta, se asignaron a provincias con límites de [Natural Earth](https://www.naturalearthdata.com/) y se agruparon por provincia y mes, en celdas de 0,25° por año y, para cada incendio, en celdas de 0,05° por semana.

**Diseño.** Un escenario fijo cuenta seis incendios con el scroll: los focos reales se acumulan semana a semana y una ilustración esquemática muestra el inicio, el fuego y el combate con los medios que nombra cada fuente. Un capítulo de exploración filtra por año y provincia, compara dos años con escala apta para daltonismo y guarda la vista en la URL.

**Limitaciones.** Un foco de calor no equivale a una hectárea quemada ni a un incendio forestal. El satélite pierde fuegos breves o nublados. 2012 y 2026 son años incompletos. Hectáreas y causas provienen de informes oficiales y prensa citados.

**IA.** El código se escribió con asistencia de IA (Claude Code) bajo supervisión humana. Ilustraciones y gráficos son código; no hay imágenes generadas por IA. Detalle en `IA-declaracion.md`.
