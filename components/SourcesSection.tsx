'use client';
import { useState } from 'react';
import { EVIDENCE, TOUR_EVENTS } from '../lib/tour';
import { fmt } from '../lib/fire';
import { takeReturnPoint } from '../lib/returnPoint';
import styles from './SourcesSection.module.css';

/** Window of each fire in the weekly foci files (public/data/semanas-<id>.json). */
const WINDOWS: Record<string, string> = {
  misiones: 'mayo a diciembre de 2020, Misiones',
  corrientes: 'enero a diciembre de 2022, Corrientes',
  cordoba: 'mayo a noviembre de 2020, Córdoba',
  delta: 'enero a diciembre de 2020, Santa Fe, Entre Ríos y Buenos Aires',
  mendoza: 'enero a diciembre de 2023, Mendoza',
  chubut: '1 de enero al 10 de octubre de 2026, Chubut',
};

/**
 * Technical sources, as plain reading: no map, no drawings. Statuses are copied from VERIFICACION.md
 * (review of 14/10/2026); nothing is marked as verified here that the file does not record.
 */
export default function SourcesSection() {
  const [back, setBack] = useState<number | null>(null);

  return (
    <section id="fuentes" className={styles.sources} tabIndex={-1} aria-labelledby="fuentes-h"
      onFocus={() => { const p = takeReturnPoint(); if (p !== null) setBack(p); }}>
      <div className={styles.inner}>
        <p className={styles.kicker}>Fuentes técnicas</p>
        <h2 id="fuentes-h" className={styles.h2}>Cómo se hizo y de dónde sale cada cifra</h2>

        <h3 className={styles.h3}>1. Datos de focos de calor</h3>
        <ul className={styles.list}>
          <li>
            <b>Fuente:</b> NASA FIRMS (Fire Information for Resource Management System), instrumento VIIRS a bordo
            del satélite Suomi NPP (S-NPP), archivo estándar más datos casi en tiempo real (NRT). Resolución de
            375 m en el nadir.
          </li>
          <li><b>Período:</b> del 20 de enero de 2012 al 14 de octubre de 2026 (fecha de corte registrada en los datos del proyecto).</li>
          <li>
            <b>Filtros:</b> en el archivo estándar, solo detecciones de tipo 0 (vegetación, <code>type == 0</code>); en
            todos los datos se descartan las detecciones de confianza baja (<code>confidence != &apos;l&apos;</code>). Los
            datos NRT no traen el campo de tipo, así que no se filtran por él.
          </li>
          <li>
            <b>Provincias:</b> cada foco se asigna a una provincia por punto en polígono con los límites de Natural
            Earth 10m admin-1 (dominio público), simplificados para el mapa.
          </li>
          <li>
            <b>Agregaciones:</b> por provincia y mes; por año en una grilla de 0,25°; y, para cada incendio, por
            semana en celdas de 0,05° dentro de sus provincias y meses. Total: 2.620.568 focos.
          </li>
          <li>
            <b>Licencia y cita:</b> los datos de NASA FIRMS son de uso libre y se citan como &ldquo;NASA FIRMS, VIIRS
            S-NPP 375 m&rdquo; con la fecha de descarga. Natural Earth es de dominio público.
          </li>
        </ul>

        <h3 className={styles.h3}>2. Cifras de cada incendio</h3>
        <p className={styles.note}>
          Estado tomado de <code>VERIFICACION.md</code> (revisión del 14/10/2026, con la fuente abierta y el texto
          buscado en ella). &ldquo;Parcial&rdquo; quiere decir que la fuente lo dice con un matiz. Cuando dos fuentes
          dan cifras distintas, se muestran las dos sin elegir.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Incendio</th>
                <th scope="col">Cifra o dato</th>
                <th scope="col">Texto de la fuente</th>
                <th scope="col">Fuente</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {TOUR_EVENTS.flatMap((ev) =>
                EVIDENCE[ev.id].map((r, i) => (
                  <tr key={ev.id + i}>
                    {i === 0 && (
                      <th scope="row" rowSpan={EVIDENCE[ev.id].length}>
                        {ev.region}
                        <span className={styles.year}>{ev.year}</span>
                      </th>
                    )}
                    <td>{r.what}</td>
                    <td className={styles.quote}>{r.quote}</td>
                    <td>
                      <a href={r.url} target="_blank" rel="noopener noreferrer">{r.source}</a>
                      <span className={styles.access}>Consultada el 14/10/2026</span>
                    </td>
                    <td><span className={r.status === 'Verificado' ? styles.ok : styles.partial}>{r.status}</span></td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>

        <h3 className={styles.h3}>Ventanas de los focos semanales</h3>
        <ul className={styles.list}>
          {TOUR_EVENTS.map((ev) => (
            <li key={ev.id}><b>{ev.region}:</b> {WINDOWS[ev.id]}.</li>
          ))}
        </ul>

        <h3 className={styles.h3}>3. Límites</h3>
        <ul className={styles.list}>
          <li>Un foco de calor no es una hectárea quemada ni un incendio forestal. Las superficies vienen de las fuentes citadas, no del satélite.</li>
          <li>Cada detección marca un píxel de unos 375 m con anomalía térmica: un incendio grande suma muchos focos y uno chico puede no aparecer (nubes, humo, horario de paso).</li>
          <li>Hay falsos positivos (superficies muy calientes, industrias) y muchas detecciones son quemas agrícolas o de pastizales.</li>
          <li>Las escenas son ilustraciones esquemáticas hechas en código: dibujan solo los medios de combate que nombran las fuentes.</li>
          <li>El recorrido va en orden geográfico, de norte a sur, no cronológico.</li>
          <li>El territorio se pinta con un color neutro: el proyecto no tiene datos de cobertura del suelo ni de biomas.</li>
        </ul>

        <h3 className={styles.h3}>4. Cómo reproducir los datos</h3>
        <ol className={styles.list}>
          <li>Descargar de NASA FIRMS los archivos de VIIRS S-NPP para Argentina: archivo estándar y NRT para todo el período.</li>
          <li>Descargar los límites de Natural Earth 10m admin-1 y quedarse con las provincias argentinas.</li>
          <li>Aplicar los filtros de tipo y de confianza, asignar cada foco a su provincia por punto en polígono y descartar los que caen fuera.</li>
          <li>Agregar por provincia y mes, por año en celdas de 0,25° y, por incendio, por semana en celdas de 0,05°.</li>
          <li>Comprobar que la suma anual dé {fmt(2620568)} focos y que la primera semana de Chubut dé 1.122 focos.</li>
        </ol>

        <h3 className={styles.h3}>5. Herramientas e IA</h3>
        <p className={styles.para}>
          Se usaron asistentes de IA para escribir y depurar código. Las ilustraciones, las nubes, el mapa y las
          animaciones están escritas en código: no son imágenes generadas por IA. El sitio no usa fotos.
        </p>

        <button
            type="button"
            className={styles.back}
            onClick={() => {
              const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              window.scrollTo({ top: back ?? 0, behavior: reduced ? 'auto' : 'smooth' });
              history.replaceState(null, '', location.pathname + location.search);
              setBack(null);
            }}
          >
            {back !== null ? '← Volver al punto del recorrido' : '↑ Ir al inicio del recorrido'}
          </button>
      </div>
    </section>
  );
}
