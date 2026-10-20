# Catálogo de Alternativas y Banco de Ideas de Diseño

Este documento registra todas las propuestas de diseño, arquitecturas y conceptos estéticos explorados durante las sesiones de trabajo para el proyecto **"Lo que el fuego se llevó: 15 años, 6 historias"**. Sirve como bitácora permanente y resguardo para consulta o pivots futuros.

---

## 1. Orden Narrativo de las Historias

### Opción A (Seleccionada): Descenso Geográfico Norte a Sur
- **Secuencia**: Misiones (27° S) → Corrientes (28° S) → Córdoba (31° S) → Delta del Paraná (33° S) → Mendoza (33° S) → Chubut (42° S).
- **Justificación**: Mapea en una relación 1:1 el gesto físico del scroll vertical hacia abajo con el desplazamiento geográfico hacia el sur por el mapa argentino. La cámara viaja desde la selva paranaense en el norte hasta los bosques andino-patagónicos en el sur.

### Opción B (En Reserva): Crescendo de Gravedad e Impacto
- **Secuencia**: De menor escala a catástrofe territorial máxima (ej. Misiones / Mendoza → Córdoba / Delta → Chubut → Corrientes con su 12% provincial consumido).
- **Efecto**: Construcción de clímax dramático creciente. La cámara del mapa realiza saltos no lineales entre regiones.

### Opción C (En Reserva): Cronológico Lineal Estricto
- **Secuencia**: Córdoba (2020) → Delta (2020) → Corrientes (2022) → Mendoza (2023) → Misiones (2024) → Chubut (2026).
- **Efecto**: Énfasis en la línea temporal histórica reciente.

---

## 2. Identidad Visual y Estilo del Fuego

### Opción A (Seleccionada): Novela Gráfica Editorial / Térmico Oscuro
- **Tratamiento**: Fuego vectorial estilizado de alto impacto con gradientes cálidos incandescentes, partículas sutiles de humo y ascuas flotantes.
- **Tratamiento fotográfico**: Fotos testimoniales de archivo con bordes chamuscados / viñeta térmica de hollín y resplandor ámbar en CSS, evocando documentos rescatados de las llamas sin alterar la imagen documental original en la vista ampliada.
- **Tono**: Madura, cinematográfica, respetuosa de la tragedia humana y ambiental.

### Opción B (En Reserva): Estilo Neo-Ilustrado / Caricatura Pop
- **Tratamiento**: Fuego y paisajes con trazos negros marcados y redondeados tipo historieta / cómic gráfico, paletas saturadas y formas caricaturescas.
- **Nota**: Aporta gran identidad lúdica, pero debe calibrarse con cuidado para no restar gravedad al rigor periodístico y a las pérdidas humanas/ambientales.

### Opción C (En Reserva): Fotoperiodismo Técnico Puro
- **Tratamiento**: Fotografías limpias sin ningún marco ni filtro CSS, y escenas esquemáticas puramente funcionales estilo infografía de diario tradicional.

---

## 3. Apertura de Cámara y Zoom Inicial

### Opción A (Seleccionada): Fly-In Cinemático desde la Estratósfera
- **Comportamiento**: En la portada, el mapa muestra la República Argentina completa con sus 2.620.568 focos históricos titilando como un mapa de calor continental. Al scrollear, la cámara vuela suavemente en picada (`FLY_MS = 800`) directamente hacia la provincia de Misiones en el extremo norte, iniciando el descenso.

### Opción B (En Reserva): Barrido Térmico de Apertura
- **Comportamiento**: Un shader WebGL de distorsión de calor o barrido ígneo atraviesa la pantalla antes de fijar el foco en el primer incendio.

### Opción C (En Reserva): Fundido a Negro Directo
- **Comportamiento**: Un corte limpio con disolución rápida hacia las coordenadas provinciales.

---

## 4. Efectos para Fotografías de Archivo al Scrollear

### Opción A (Seleccionada): Fotografía Testimonial Chamuscada
- **Efecto**: Viñeta de ceniza/hollín oscuro en los bordes (`box-shadow: inset 0 0 25px rgba(0,0,0,0.9)`), ligero resplandor térmico en las esquinas y revelado progresivo al entrar al viewport. Al hacer clic para ampliar, la fotografía se presenta limpia en alta definición con sus créditos oficiales.

### Opción B (En Reserva): Línea de Ignición Animada
- **Efecto**: Un borde o trazo dinámico con animación CSS que recorre el contorno de la fotografía como si una chispa recorriera un papel antes de estabilizarse.

### Opción C (En Reserva): Polaroid de Archivo Carbonizada
- **Efecto**: Marco simulado de papel fotográfico antiguo con esquinas quemadas y textura de calor.

---

## 5. Arquitectura Alternativa: Full-Screen 3D Map-Centric (Estilo 649 Héroes)
- **Concepto**: Lienzo 3D/Canvas único que ocupa el 100% de la ventana sin scroll de página, con HUD flotante perimetral (timeline temporal abajo, buscador y filtros en esquinas, tarjetas de detalle al posarse sobre cada foco).
- **Ventaja**: Potencia analítica y libertad interactiva del explorador.
- **Razón de no elección**: El jurado cuenta con 60 segundos de atención; el scrollytelling vertical con storytelling guiado asegura que todo jurado experimente el arco dramático completo de inicio a fin sin perderse.
