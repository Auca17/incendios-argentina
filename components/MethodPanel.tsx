import styles from './MethodPanel.module.css';

const URL_CBA = 'https://ambiente.cba.gov.ar/wp-content/uploads/2024/11/INFORME-INCENDIOS-2020-Provincia-de-Cordoba.pdf';

/** Last screen, side cards: open data sources and the legend of the accumulated national map. */
export default function MethodPanel() {
  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <h3>Panel integral de fuentes de datos abiertos</h3>
        <div className={styles.group}>
          <div className={styles.item}>
            <span className={styles.badge}>Datos espaciales</span>
            <h4>NASA FIRMS · VIIRS S-NPP</h4>
            <p>Registro histórico y tiempo casi real (NRT) de focos térmicos en Argentina (2012–2026). Datos abiertos.</p>
            <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener noreferrer">firms.modaps.eosdis.nasa.gov →</a>
          </div>
          <div className={styles.item}>
            <span className={styles.badge}>Límites oficiales</span>
            <h4>Natural Earth Vector</h4>
            <p>Capa vectorial Admin 1 de provincias de Argentina. Dominio público (CC0).</p>
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">naturalearthdata.com →</a>
          </div>
          <div className={styles.item}>
            <span className={styles.badge}>Informes de gobierno</span>
            <h4>Provincias y Nación</h4>
            <p>Informes técnicos de Córdoba (Ambiente), Santa Fe (Ambiente), Misiones (Gobierno), INTA Corrientes, Mendoza (PPMF), Chubut (Bosques) y SNMF.</p>
            <a href={URL_CBA} target="_blank" rel="noopener noreferrer">Informe Ambiental Córdoba 2020 (PDF) →</a>
          </div>
          <div className={styles.item}>
            <span className={styles.badge}>Ciencia y Monitoreo</span>
            <h4>Museo Scasso / PIECAS &amp; CONICET</h4>
            <p>Monitoreo de focos en humedales del Delta (PIECAS) e impacto biológico documentado por investigadores de CONICET.</p>
          </div>
          <div className={styles.item}>
            <span className={styles.badge}>Periodismo de datos</span>
            <h4>Archivo documental de prensa</h4>
            <p>Cobertura y peritajes citados: National Geographic LA, La Capital (Rosario), Los Andes, El Sol, Infobae, Misiones Online, Diario de Cuyo.</p>
          </div>
        </div>
      </div>
      <div className={styles.card}>
        <h3>Acumulado histórico nacional (2012–2026)</h3>
        <p>Densidad acumulada de focos en la grilla nacional de 0,25°. El norte y litoral concentran la mayor recurrencia por quemas y sequías extremas.</p>
        <div className={styles.legend}><span>pocos focos</span><div className={styles.bar} /><span>muchos</span></div>
      </div>
    </div>
  );
}
