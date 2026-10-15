import styles from './Prose.module.css';

/** Last screen, text column (legacy 'method' slide): data, limits, AI note and base cartography. */
export default function MethodSidebar({ children }: { children?: React.ReactNode }) {
  return (
    <div className={styles.text}>
      <p className={styles.kicker}>Rigor y metodología</p>
      <h2 className={styles.title}>Datos, límites y fuentes abiertas</h2>
      <h3 className={styles.h}>1. Datos satelitales primarios (NASA)</h3>
      <p>
        La base espacial proviene del sensor <b>VIIRS</b> (Visible Infrared Imaging Radiometer Suite) a bordo del satélite Suomi NPP,
        provista por el sistema <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener noreferrer">NASA FIRMS</a>.
        Cubre del <b>20 de enero de 2012 al 14 de octubre de 2026</b> con resolución espacial de 375 metros a nadir. Se filtraron
        únicamente detecciones de vegetación con nivel de confianza nominal o alto, excluyendo fuentes térmicas industriales estáticas.
      </p>
      <h3 className={styles.h}>2. Límites y advertencias metodológicas</h3>
      <ul className={styles.plain}>
        <li><b>Foco ≠ hectárea quemada:</b> Un foco satelital señala una anomalía térmica instantánea de ~375 m; no cuantifica el perímetro total ni la severidad.</li>
        <li><b>Quemas agropecuarias:</b> El satélite no distingue incendios forestales destructivos de quemas de pastizal o rastrojo.</li>
        <li><b>Cobertura temporal:</b> Los años 2012 (inicio 20/01) y 2026 (corte al 14/10) son incompletos. La comparativa de dos años computa exclusivamente meses enteros en común para no sesgar deltas.</li>
      </ul>
      <h3 className={styles.h}>3. Uso de Inteligencia Artificial (Anexo A)</h3>
      <p>
        Conforme al Anexo A de las bases del concurso, se declara que la IA fue empleada bajo supervisión humana exclusiva como asistente
        de programación y estructuración de código (JavaScript, Canvas, SVG). <b>No se utilizaron modelos de IA generativa de imágenes
        (Midjourney, DALL-E)</b>: todos los gráficos, mapas e ilustraciones son vectores y código nativo abierto.
      </p>
      <h3 className={styles.h}>4. Cartografía base</h3>
      <p>
        Geometrías provinciales de <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth Data</a> a
        escala 1:10m (Dominio Público).
      </p>
      {children && <div className={styles.slot}>{children}</div>}
    </div>
  );
}
