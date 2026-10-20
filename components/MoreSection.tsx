'use client';
import { useEffect, useMemo, useState } from 'react';
import { loadProvinciaMes } from '../lib/data';
import { fmt } from '../lib/fire';
import { MORE_PROVINCES } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import styles from './StoryPod.module.css';

type PM = Record<string, Record<string, number>>;
type Row = { name: string; total: number; peakYear: string; peak: number; share: number };

/**
 * "Dónde más ardió": the provinces with the most foci in 2012-2026 that are not among the six stories.
 * Every figure is computed from the project's NASA FIRMS data (provincia-mes.json); no cause and no
 * burnt area is claimed.
 */
export default function MoreSection() {
  const [pm, setPm] = useState<PM | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    let live = true;
    loadProvinciaMes().then((d) => { if (live) setPm(d); }, () => {});
    return () => { live = false; };
  }, []);
  useEffect(() => subscribe(({ st }) => { if (st.more >= 0) setI((o) => (o === st.more ? o : st.more)); }), []);

  const rows = useMemo<Row[] | null>(() => {
    if (!pm) return null;
    const national = Object.values(pm).reduce((a, o) => a + Object.values(o).reduce((x, y) => x + y, 0), 0);
    return MORE_PROVINCES.map((name) => {
      const byYear: Record<string, number> = {};
      for (const [k, v] of Object.entries(pm[name] || {})) byYear[k.slice(0, 4)] = (byYear[k.slice(0, 4)] || 0) + v;
      const total = Object.values(byYear).reduce((a, b) => a + b, 0);
      const [peakYear, peak] = Object.entries(byYear).sort((a, b) => b[1] - a[1])[0] || ['', 0];
      return { name, total, peakYear, peak, share: (100 * total) / national };
    });
  }, [pm]);

  const r = rows?.[i];
  return (
    <article className={styles.pod} aria-labelledby="more-h" aria-live="polite">
      <p className={styles.label}>
        <span className={styles.count}>{i + 1}/{MORE_PROVINCES.length}</span> Fuera de las seis historias
      </p>
      <h2 className={styles.title} id="more-h">Dónde más ardió: {MORE_PROVINCES[i]}</h2>
      {r && (
        <>
          <div className={styles.figure}>
            <p className={styles.num}>{fmt(r.total)} <span className={styles.unit}>focos</span></p>
            <span className={styles.total}>entre 2012 y 2026, según NASA FIRMS</span>
            <p className={styles.figLabel}>
              El {r.share.toLocaleString('es-AR', { maximumFractionDigits: 1 })} % de todos los focos del país. El año con
              más focos fue {r.peakYear}, con {fmt(r.peak)}.
            </p>
          </div>
          <p className={styles.figLabel}>
            Son puntos calientes que vio el satélite: no dicen cuántas hectáreas se quemaron ni por qué. Incluyen incendios
            y quemas agrícolas.
          </p>
        </>
      )}
    </article>
  );
}
