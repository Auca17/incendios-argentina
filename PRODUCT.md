# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos públicos con el mismo peso:

- **El jurado de Contar con Datos 2026**, que recorre varias entregas en desktop, con atención pero con tiempo limitado, y evalúa el rigor, la claridad metodológica y la calidad del relato.
- **Lectores argentinos en general**, que llegan por un enlace sin contexto previo sobre incendios ni sobre datos satelitales.

## Product Purpose

«Lo que el fuego se llevó» es un recorrido documental guiado por scroll sobre seis incendios argentinos, contados con sus fuentes y con los focos de calor detectados por satélite entre 2012 y 2026. Lo complementa una exploración por año y provincia (`/explorar`).

El visitante tiene que terminar el recorrido entendiendo lo que se pierde detrás de los datos: territorios, ecosistemas y lugares concretos afectados por el fuego. La emoción se apoya en descubrir la escala y la recurrencia de los incendios en Argentina a lo largo de 15 años. El recorrido también enseña a leer bien los datos satelitales: un foco detectado no equivale a un incendio ni a una hectárea quemada.

El éxito es que el visitante termine con asombro, con una comprensión más profunda del problema y con una reflexión sobre lo que permanece después del fuego.

## Positioning

Cada historia une tres capas que pocas piezas combinan: la detección satelital real, semana a semana (NASA FIRMS, VIIRS S-NPP); el lugar concreto que se perdió; y las fuentes oficiales y periodísticas de sus cifras. Ninguna cifra ni imagen se presenta sin su fuente, y la pieza explica lo que el satélite no ve.

## Operating Context

- Se presenta al concurso Contar con Datos 2026. La versión entregada el 15/10/2026 está congelada en el tag `entrega-v1-2026-10-15`. La actualización desktop tiene como fecha el 31/10/2026.
- El sitio se publica como exportación estática (GitHub Pages y previsualizaciones en Vercel).
- Se lee en desktop a 1440×900 como caso prioritario. El móvil debe seguir funcionando, pero no es la prioridad de esta etapa.
- El recorrido sigue este orden: apertura bajo las nubes, revelado de Argentina, seis regiones de norte a sur (Misiones, Corrientes, Córdoba, Delta del Paraná, Mendoza, Chubut), un interludio nacional («Dónde más ardió»), el epílogo y las fuentes.

## Capabilities and Constraints

- Stack existente: Next.js 16 (App Router, exportación estática), React, TypeScript, CSS Modules, Canvas 2D y WebGL2. No se agregan dependencias ni se reescribe la arquitectura.
- Datos: 2.620.568 focos VIIRS (20/01/2012 a 14/10/2026), de vegetación con confianza nominal o alta, asignados a provincias con los límites de Natural Earth. Los JSON originales y la metodología no se modifican.
- Las cifras de `EVENTS` (`lib/events.ts`) no se alteran sin revisar `VERIFICACION.md`.
- Términos obligatorios: foco de calor ≠ hectárea quemada ≠ incendio forestal. Las hectáreas y las causas vienen de los informes oficiales y de la prensa citados, nunca de los focos.
- Prohibido inventar focos, coordenadas, fechas, perímetros, superficies quemadas ni propagaciones.
- Todo el estado visible deriva de la posición del scroll y es reversible al subir.

## Brand Commitments

- Idioma: español de Argentina.
- Las escenas ilustradas hechas en código no se presentan como registro documental y llevan su aviso de ilustración.
- Referencias aprobadas por el autor: el cierre de nubes del epílogo, las nubes de la apertura, las escenas ilustradas y su profundidad 2.5D.
- Imágenes generadas por IA: nunca en lo publicado; la declaración de IA (`IA-declaracion.md`) debe seguir siendo verdadera. Sí se permiten como material interno de exploración (comps) que no se publica.

## Evidence on Hand

- Datos de focos: `public/data/*.json`.
- Cifras, causas y fuentes de los seis incendios: `lib/events.ts`, verificadas en `VERIFICACION.md`.
- Cuatro fotografías documentales y satelitales con licencia abierta verificada: `FOTOS.md`. Solo se suman fotos con licencia verificada.
- Descripción metodológica: `DESCRIPCION.md`.
- Ausencias que no se deben fabricar: perímetros quemados, superficie por foco, fuegos breves o bajo nubes (el satélite no los ve) y testimonios.

## Product Principles

1. El dato manda: lo visible sobre el mapa es siempre una detección real en su fecha real.
2. Del lugar a la cifra: cada número se ancla en un territorio concreto antes de volverse escala nacional.
3. Enseñar a leer el satélite: lo que muestra y lo que no muestra queda explícito en el recorrido.
4. Rigor y emoción se refuerzan mutuamente: el impacto emocional surge del descubrimiento de los datos y de los territorios concretos, nunca de exageraciones ni de decoración visual.
5. Todo es reversible: bajar y subir cuentan la misma historia.

## Accessibility & Inclusion

- Contraste verificado (`scripts/contrast.mjs`).
- Movimiento reducido (`prefers-reduced-motion`) sin viajes de cámara ni parallax.
- Navegación por teclado y foco visible en diálogos e interacciones.
