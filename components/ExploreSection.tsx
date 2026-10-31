'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadMeta, loadProvinciaMes } from '../lib/data';
import { MESES_L, fmt } from '../lib/fire';
import { YEARS, getExplore, setExplore, subscribeExplore, type Explore } from '../lib/exploreState';
import styles from './ExploreSection.module.css';

type PM = Record<string, Record<string, number>>;

/** Foci per year of one province (or of the whole country when prov is null), summed from provincia-mes.json. */
function perYear(pm: PM, prov: string | null): number[] {
  return YEARS.map((y) => {
    let s = 0;
    for (const [p, months] of Object.entries(pm)) {
      if (prov && p !== prov) continue;
      for (let m = 1; m <= 12; m++) s += months[`${y}-${m < 10 ? '0' : ''}${m}`] || 0;
    }
    return s;
  });
}

/**
 * "Explorá": the map shows the foci of one year (0.25-degree cells); the panel offers a year player,
 * the year series of the country or of a province (click on the map or pick it from the list) and the
 * province ranking of the year. The choice lives in the address (?y=&p=) so it can be shared.
 */
export default function ExploreSection() {
  const [ex, setEx] = useState<Explore>(getExplore());
  const [pm, setPm] = useState<PM | null>(null);
  const [national, setNational] = useState<Record<string, number> | null>(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(0);

  useEffect(() => subscribeExplore(setEx), []);
  useEffect(() => {
    let live = true;
    loadProvinciaMes().then((d) => { if (live) setPm(d); }, () => {});
    loadMeta().then((m) => { if (live) setNational(m.por_anio); }, () => {});
    return () => { live = false; };
  }, []);

  // player: one year per second, stops at the last year or on any other choice
  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      const y = getExplore().year;
      if (y >= YEARS[YEARS.length - 1]) { setPlaying(false); return; }
      setExplore({ year: y + 1 });
    }, 1000);
    return () => window.clearInterval(timer.current);
  }, [playing]);

  const provinces = useMemo(() => (pm ? Object.keys(pm).sort((a, b) => a.localeCompare(b, 'es')) : []), [pm]);
  const prov = ex.prov && provinces.includes(ex.prov) ? ex.prov : null;
  const series = useMemo(() => {
    if (prov && pm) return perYear(pm, prov);
    if (national) return YEARS.map((y) => national[y] || 0);
    return null;
  }, [pm, prov, national]);
  const ranking = useMemo(() => {
    if (!pm) return [];
    return provinces
      .map((p) => ({ p, n: perYear({ [p]: pm[p] }, p)[YEARS.indexOf(ex.year)] }))
      .sort((a, b) => b.n - a.n);
  }, [pm, provinces, ex.year]);
  const max = series ? Math.max(...series, 1) : 1;
  const yi = YEARS.indexOf(ex.year);
  const place = prov ? ranking.findIndex((r) => r.p === prov) + 1 : 0;

  const pick = (year: number) => { setPlaying(false); setExplore({ year }); };

  // Esc takes the map back from a province to the whole country
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && getExplore().prov) setExplore({ prov: null }); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /*
   * One line of context for a province's year, no more: its month with most foci, and how the year
   * compares with its usual one (the mean of the complete years 2013 to 2025; 2012 and 2026 are partial).
   */
  const context = useMemo(() => {
    if (!prov || !pm || !series) return null;
    const months = Array.from({ length: 12 }, (_, m) => pm[prov][`${ex.year}-${m < 9 ? '0' : ''}${m + 1}`] || 0);
    const top = months.indexOf(Math.max(...months));
    const full = YEARS.map((y, i) => [y, series[i]] as const).filter(([y]) => y >= 2013 && y <= 2025);
    const mean = full.reduce((a, [, v]) => a + v, 0) / full.length;
    const r = series[yi] / Math.max(1, mean);
    const vs = r >= 1.15 ? `Tuvo ${r.toLocaleString('es-AR', { maximumFractionDigits: 1 })} veces su promedio anual.` : r <= 0.85 ? 'Quedó por debajo de su promedio anual.' : 'Estuvo cerca de su promedio anual.';
    return { month: months[top] > 0 ? MESES_L[top] : null, vs };
  }, [prov, pm, series, ex.year, yi]);

  return (
    <div className={styles.panel}>
      <p className={styles.kicker}>Explorá</p>
      <h2 className={styles.title}>Año por año <span className={styles.titleYears}>2012–2026</span></h2>
      <p className={styles.help}>Elegí un año o tocá ▶ para verlos pasar. Tocá una provincia para acercarte y pasá el cursor por el mapa para ver cada zona.</p>

      <div className={styles.player}>
        <button type="button" className={styles.step} onClick={() => pick(Math.max(YEARS[0], ex.year - 1))} aria-label="Año anterior" disabled={yi <= 0}>◀</button>
        <output className={styles.year} aria-live="polite">{ex.year}</output>
        <button type="button" className={styles.step} onClick={() => pick(Math.min(YEARS[YEARS.length - 1], ex.year + 1))} aria-label="Año siguiente" disabled={yi >= YEARS.length - 1}>▶</button>
        <button
          type="button"
          className={styles.play}
          aria-pressed={playing}
          onClick={() => {
            if (!playing && ex.year >= YEARS[YEARS.length - 1]) setExplore({ year: YEARS[0] });
            setPlaying((p) => !p);
          }}
        >
          {playing ? 'Pausa' : 'Ver todos'}
        </button>
      </div>

      <label className={styles.field}>
        <span>Provincia</span>
        <select value={prov || ''} onChange={(e) => { setPlaying(false); setExplore({ prov: e.target.value || null }); }}>
          <option value="">Todo el país</option>
          {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      {prov && (
        <button type="button" className={styles.country} onClick={() => setExplore({ prov: null })}>
          <span aria-hidden="true">←</span> Ver todo el país <kbd>Esc</kbd>
        </button>
      )}

      {series && (
        <figure className={styles.chart}>
          <figcaption className={styles.chartTitle}>Focos de calor por año · {prov || 'todo el país'}</figcaption>
          <div className={styles.bars}>
            {series.map((v, i) => (
              <button
                key={YEARS[i]}
                type="button"
                className={i === yi ? `${styles.bar} ${styles.barOn}` : styles.bar}
                style={{ ['--h' as string]: (v / max).toFixed(3) }}
                onClick={() => pick(YEARS[i])}
                aria-label={`${YEARS[i]}: ${fmt(v)} focos`}
                aria-pressed={i === yi}
              >
                <i aria-hidden="true" />
                <span aria-hidden="true">{String(YEARS[i]).slice(2)}</span>
              </button>
            ))}
          </div>
          <p className={styles.reading}>
            {prov
              ? <><b>{fmt(series[yi])}</b> focos en {prov} en {ex.year}{place > 0 && <>, puesto {place} de {ranking.length}</>}.</>
              : <><b>{fmt(series[yi])}</b> focos en todo el país en {ex.year}.</>}
            {ex.year === 2012 && ' Los datos empiezan el 20 de enero.'}
            {ex.year === 2026 && ' Los datos llegan hasta el 14 de octubre.'}
          </p>
          {context && (
            <p className={styles.context}>
              {context.month && <>Ardió más en {context.month}. </>}
              {ex.year >= 2013 && ex.year <= 2025 ? context.vs : null}
            </p>
          )}
        </figure>
      )}

      {ranking.length > 0 && !prov && (
        <div className={styles.rank}>
          <h3 className={styles.h3}>Las provincias con más focos en {ex.year}</h3>
          <ol>
            {ranking.slice(0, 5).map((r) => (
              <li key={r.p}>
                <button type="button" onClick={() => setExplore({ prov: r.p })}>{r.p}</button>
                <b>{fmt(r.n)}</b>
              </li>
            ))}
          </ol>
        </div>
      )}

    </div>
  );
}
