# Argentina arde: descripción metodológica

**Datos.** Focos de calor del sensor VIIRS (satélite Suomi NPP) de [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/), archivo estándar y tiempo casi real, del 20/01/2012 al 14/10/2026. Se conservaron los focos de vegetación con confianza nominal o alta, se asignaron a provincias con límites de [Natural Earth](https://www.naturalearthdata.com/) y se agruparon por provincia y mes, y en celdas de 0,25° por año.

**Diseño.** Un mapa permite filtrar por año y provincia (serie anual, estacionalidad y ranking) y comparar dos años con una escala divergente apta para daltonismo. El estado se guarda en la URL. Seis incendios se cuentan con una ilustración esquemática que avanza con el scroll: cómo empezó, el punto máximo y el combate, con los medios que nombra cada fuente.

**Limitaciones.** Un foco de calor no equivale a una hectárea quemada ni a un incendio forestal: incluye quemas agrícolas. El satélite pierde fuegos breves o cubiertos por nubes. 2012 y 2026 son años incompletos. Las hectáreas y causas provienen de informes oficiales y prensa citados en cada pantalla.

**IA.** El código se escribió con asistencia de IA (Claude Code) bajo supervisión humana. Todas las ilustraciones y gráficos son código; no hay imágenes generadas por IA. Detalle en `IA-declaracion.md`.
