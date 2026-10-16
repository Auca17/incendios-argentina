'use client';
import styles from './Epilogue.module.css';

/**
 * Editorial Epilogue for the journey's conclusion.
 * Calm, reflective, comprehensive:
 *  - Synthesis of 15 years and 2.620.568 satellite fire detections.
 *  - Environmental consequences & biodiversity recovery.
 *  - Verified open data sources & methodology.
 *  - Official credits.
 */
export default function Epilogue() {
  return (
    <section className={styles.epilogueRoot} aria-label="Epílogo y fuentes">
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <span className={styles.kicker}>Epílogo · Memoria y Futuro</span>
          <h2 className={styles.title}>La huella que deja el fuego</h2>
          <p className={styles.subtitle}>
            Quince años de monitoreo satelital continuo documentan una transformación profunda en los ecosistemas de Argentina.
          </p>
        </header>

        {/* 1. Synthesis & Macro Stats */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.statBig}>2.620.568</span>
            <span className={styles.statLabel}>Focos de calor detectados (2012–2026)</span>
            <p className={styles.statDesc}>
              Registrados por el sensor VIIRS a bordo del satélite Suomi NPP de la NASA, con resolución espacial de 375 metros a nadir.
            </p>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.statBig}>6 Regiones</span>
            <span className={styles.statLabel}>Ecosistemas en primera línea</span>
            <p className={styles.statDesc}>
              Desde la selva paranaense en Misiones hasta los bosques milenarios de lenga y alerce en la Patagonia andina.
            </p>
          </div>
        </div>

        {/* 2. Environmental & Biodiversity Impact */}
        <div className={styles.editorialSection}>
          <h3 className={styles.sectionHead}>Consecuencias ambientales y pérdida de biodiversidad</h3>
          <div className={styles.proseColumns}>
            <p>
              El fuego no sólo destruye la cobertura vegetal visible: calcina el horizonte superficial del suelo, 
              destruye el banco de semillas nativas y acelera la erosión hídrica y eólica. En zonas de pendiente como 
              las Sierras de Córdoba o las laderas de Chubut, las lluvias posteriores arrastran cenizas hacia las cuencas 
              hídricas, comprometiendo la provisión de agua potable para poblaciones enteras.
            </p>
            <p>
              Para la fauna, el impacto es inmediato y duradero. Especies con baja movilidad sufren pérdidas directas, 
              mientras que los grandes mamíferos —como el ciervo de los pantanos en los Esteros del Iberá o el huemul en 
              los bosques andinos— pierden corredores biológicos vitales. La recuperación de un bosque nativo maduro 
              puede demandar entre 50 y 150 años, dependiendo de la recurrencia de las quemas.
            </p>
          </div>
        </div>

        {/* 3. Prevention & Forest Management */}
        <div className={styles.editorialSection}>
          <h3 className={styles.sectionHead}>Prevención, alerta temprana y manejo del fuego</h3>
          <p className={styles.proseSingle}>
            El Servicio Nacional de Manejo del Fuego (SNMF), junto con las brigadas provinciales y el sistema de Parques 
            Nacionales, destacan tres factores determinantes para reducir la catástrofe: el fortalecimiento de la alerta temprana 
            mediante índices de peligro meteorológico (FWI), la prohibición efectiva de quemas en épocas de sequía extrema o eventos 
            La Niña, y el ordenamiento territorial con cortafuegos biológicos y guardias de cenizas permanentes.
          </p>
        </div>

        {/* 4. Open Data & Methodology */}
        <div className={styles.sourcesBox}>
          <h3 className={styles.sourcesHead}>Metodología y fuentes de datos abiertos</h3>
          <ul className={styles.sourcesList}>
            <li>
              <b>NASA FIRMS (Fire Information for Resource Management System):</b> Detecciones térmicas satelitales del sensor VIIRS 375m (S-NPP y NOAA-20), filtradas para territorio argentino entre el 20 de enero de 2012 y el 14 de octubre de 2026.
            </li>
            <li>
              <b>Instituto Nacional de Tecnología Agropecuaria (INTA):</b> Informes de evolución de áreas quemadas e impacto en coberturas vegetales en Corrientes y Chaco.
            </li>
            <li>
              <b>Secretaría de Ambiente de la Provincia de Córdoba:</b> Informe oficial de incendios forestales 2020.
            </li>
            <li>
              <b>Ministerio de Ambiente y Cambio Climático de Santa Fe / PIECAS:</b> Registro de focos y superficie quemada en el Delta del Paraná.
            </li>
            <li>
              <b>Ministerio de Producción de Chubut & SNMF:</b> Partes diarios de combate en Epuyén, El Hoyo y Parque Nacional Los Alerces.
            </li>
          </ul>
        </div>

        {/* 5. Credits */}
        <footer className={styles.creditsFooter}>
          <p className={styles.creditsNote}>
            <b>Lo que el fuego se llevó: 15 años, 6 historias</b> · Proyecto de periodismo de datos y cartografía visual interactiva.
          </p>
          <p className={styles.creditsMeta}>
            Datos abiertos bajo licencia pública · Diseñado y desarrollado con rigor documental y accesibilidad WCAG 2.2 AA.
          </p>
        </footer>
      </div>
    </section>
  );
}
