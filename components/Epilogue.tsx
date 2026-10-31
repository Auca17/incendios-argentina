'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadProvinciaMes } from '../lib/data';
import { YEARS } from '../lib/exploreState';
import { subscribe } from '../lib/scrollDriver';
import { MESES_L, fmt } from '../lib/fire';
import SourcesLink from './SourcesLink';
import Locator from './Locator';
import ExploreLink from './ExploreLink';
import { setHomeProvince, useHomeProvince } from '../lib/homeProvince';
import styles from './Epilogue.module.css';

/**
 * Epilogue, read on the closed clouds (the shader keeps a flat bright column behind it). It fades out
 * before the clouds turn to smoke. Figures come from the project's own processing of NASA FIRMS data
 * (public/data/meta.json and semanas-<id>.json).
 */
export default function Epilogue() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => subscribe(({ st }) => {
    if (ref.current) ref.current.style.opacity = st.epi.toFixed(3);
  }), []);

  return (
    <article ref={ref} className={styles.epi} aria-labelledby="epi-h">
      <h2 id="epi-h" className={styles.title}>Lo que queda en el mapa</h2>
      <p className={styles.summary}>
        De la selva misionera al bosque de Chubut, seis incendios entre 2020 y 2026. El satélite marcó dónde y cuándo
        hubo fuego; cuánto se perdió y por qué lo cuentan las fuentes, que no siempre coinciden.
      </p>

      <ul className={styles.figures}>
        <li>
          <b>400.892</b>
          <span>focos en 2020, el año con más focos</span>
        </li>
        <li>
          <b>200.741</b>
          <span>focos en las provincias de las seis historias, en los meses de cada una</span>
        </li>
      </ul>
      <p className={styles.source}>NASA FIRMS, satélite VIIRS S-NPP.</p>

      <p className={styles.limits}>
        Un foco es un punto caliente visto desde el espacio: a veces un incendio, a veces una quema en el campo, a veces
        un error del satélite.
      </p>

      <HomeProvince />

      {/*
        The story ends here, the data does not: the way into /explorar comes first, as a card with the
        real foci of every year (provincia-mes.json, the same series /explorar draws), so it reads as
        a next chapter and not as a footnote. The sources follow as a quieter link.
      */}
      <div className={styles.actions}>
        <ExploreLink className={styles.explore}>
          <span className={styles.exploreText}>
            <span className={styles.exploreKicker}>Seguí explorando</span>
            <span className={styles.exploreTitle}>Año por año, provincia por provincia</span>
            <span className={styles.exploreSub}>15 años de focos en todo el país, en un mapa propio <span aria-hidden="true">→</span></span>
          </span>
          <YearBars />
        </ExploreLink>
        {/* "Volver al inicio" lives at the end of the sources (SourcesSection) */}
        <SourcesLink className={styles.secondary} label="Ver las fuentes" />
      </div>
    </article>
  );
}

/** The foci of the whole country per year, 2012-2026, as small bars (the busiest year lit). */
function YearBars() {
  const [ys, setYs] = useState<number[] | null>(null);
  useEffect(() => {
    let live = true;
    loadProvinciaMes().then((pm: Record<string, Record<string, number>>) => {
      if (!live) return;
      setYs(YEARS.map((y) => {
        let s = 0;
        for (const months of Object.values(pm)) for (let m = 1; m <= 12; m++) s += months[`${y}-${m < 10 ? '0' : ''}${m}`] || 0;
        return s;
      }));
    }, () => {});
    return () => { live = false; };
  }, []);
  if (!ys) return <span className={styles.exploreBars} aria-hidden="true" />;
  const max = Math.max(...ys);
  return (
    <span className={styles.exploreBars} aria-hidden="true">
      {ys.map((v, i) => <i key={YEARS[i]} style={{ height: `${Math.max(4, (100 * v) / max)}%` }} className={v === max ? styles.barTop : undefined} />)}
      <small>{YEARS[0]}</small><small>{YEARS[YEARS.length - 1]}</small>
    </span>
  );
}

/*
 * "¿De dónde sos?": the reader picks a province and the clouds open in a clearing onto it: the
 * province on the map with its neighbours (Locator), its worst year, its 2012-2026 total and place in
 * the country, and the month it burns most. Everything from provincia-mes.json, the same series
 * /explorar draws. One choice, a handful of figures: the rest is in /explorar.
 */
type PM = Record<string, Record<string, number>>;
function HomeProvince() {
  const [pm, setPm] = useState<PM | null>(null);
  // chosen here or already on the cover (lib/homeProvince.ts): then the clearing is open on arrival
  const home = useHomeProvince();
  const setHome = setHomeProvince;
  useEffect(() => {
    let live = true;
    loadProvinciaMes().then((d: PM) => { if (live) setPm(d); }, () => {});
    return () => { live = false; };
  }, []);
  const provinces = useMemo(() => (pm ? Object.keys(pm).sort((a, b) => a.localeCompare(b, 'es')) : []), [pm]);
  const data = useMemo(() => {
    if (!pm || !home || !pm[home]) return null;
    const totalOf = (p: string) => Object.values(pm[p]).reduce((a, v) => a + v, 0);
    const years = YEARS.map((y) => { let s = 0; for (let m = 1; m <= 12; m++) s += pm[home][`${y}-${m < 10 ? '0' : ''}${m}`] || 0; return s; });
    const peak = Math.max(...years);
    const months = Array.from({ length: 12 }, (_, m) => YEARS.reduce((a, y) => a + (pm[home][`${y}-${m < 9 ? '0' : ''}${m + 1}`] || 0), 0));
    const order = provinces.map((p) => [p, totalOf(p)] as const).sort((a, b) => b[1] - a[1]);
    return { peak, peakYear: YEARS[years.indexOf(peak)], total: totalOf(home), rank: order.findIndex(([p]) => p === home) + 1, of: order.length, month: MESES_L[months.indexOf(Math.max(...months))] };
  }, [pm, home, provinces]);

  return (
    <section className={styles.home} aria-labelledby="home-q">
      <label className={styles.homeAsk}>
        <span id="home-q">¿De dónde sos?</span>
        <select value={home} onChange={(e) => setHome(e.target.value)}>
          <option value="">Elegí tu provincia</option>
          {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <div className={data ? `${styles.clearing} ${styles.open}` : styles.clearing} aria-live="polite">
        {data && (
          <>
            <Locator key={home} provs={[home]} mode="region" label={`${home} y sus vecinas en el mapa`} className={styles.clearingMap} />
            <div className={styles.clearingText}>
              <p className={styles.clearingName}>{home}</p>
              <p className={styles.clearingBig}><b>{data.peakYear}</b> fue su peor año, con {fmt(data.peak)} focos.</p>
              <p>
                {fmt(data.total)} focos entre 2012 y 2026: el puesto {data.rank} de {data.of}. Arde más en {data.month}.
              </p>
              <p className={styles.clearingSource}>NASA FIRMS, VIIRS. Un foco no equivale a un incendio.</p>
            </div>
            <button type="button" className={styles.clearingClose} onClick={() => setHome('')} aria-label="Cerrar">×</button>
          </>
        )}
      </div>
    </section>
  );
}
