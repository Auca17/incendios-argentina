'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadProvinciaMes } from '../lib/data';
import { MESES, MESES_L, fmt } from '../lib/fire';
import { MORE_PROVINCES, TOUR_EVENTS } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import { openDialog } from '../lib/storyDialog';
import pod from './StoryPod.module.css';
import styles from './MoreSection.module.css';

type PM = Record<string, Record<string, number>>;
type Row = { name: string; total: number; rank: number; share: number; peakYear: string; peak: number; months: number[] };

/** Provinces that have a story (the Delta's three and the five others). */
const STORY_PROVS = new Set<string>(TOUR_EVENTS.flatMap((e) => e.provs));
const pct = (x: number) => x.toLocaleString('es-AR', { maximumFractionDigits: 1 });

/**
 * "Dónde más ardió", the change of scale after the six regions. A national opening first: the camera
 * holds the whole country while its cells light up strongest first, and the ranking of provinces by
 * foci 2012-2026 shows that the one with the most has no story (Formosa). Then the four provinces with
 * the most foci outside the stories, each with its rank, its share of the national total (the
 * denominator is stated) and its monthly signature. Every figure is computed from the project's NASA
 * FIRMS data (provincia-mes.json); no cause and no burnt area is claimed. Fixed over the map like the
 * regions' text, it fades in as the smoke of the last region clears.
 */
export default function MoreSection() {
  const [pm, setPm] = useState<PM | null>(null);
  const [i, setI] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    loadProvinciaMes().then((d) => { if (live) setPm(d); }, () => {});
    return () => { live = false; };
  }, []);
  useEffect(() => subscribe(({ st }) => {
    if (st.chapter === 8) setI((o) => (o === st.more ? o : st.more));
    const el = ref.current;
    if (!el) return;
    const on = st.chapter === 8 && st.veil < 0.999;
    el.style.opacity = on ? (Math.min(1, st.pod) * (1 - st.veil)).toFixed(3) : '0';
    if (el.dataset.on !== (on ? '1' : '0')) { el.dataset.on = on ? '1' : '0'; el.inert = !on; }
  }), []);

  const data = useMemo(() => {
    if (!pm) return null;
    const totals = Object.entries(pm).map(([name, o]) => [name, Object.values(o).reduce((a, b) => a + b, 0)] as [string, number]);
    totals.sort((a, b) => b[1] - a[1]);
    const national = totals.reduce((a, [, n]) => a + n, 0);
    const row = (name: string): Row => {
      const byYear: Record<string, number> = {};
      const months = new Array(12).fill(0);
      for (const [k, v] of Object.entries(pm[name] || {})) {
        byYear[k.slice(0, 4)] = (byYear[k.slice(0, 4)] || 0) + v;
        months[+k.slice(5, 7) - 1] += v;
      }
      const total = Object.values(byYear).reduce((a, b) => a + b, 0);
      const [peakYear, peak] = Object.entries(byYear).sort((a, b) => b[1] - a[1])[0] || ['', 0];
      return { name, total, rank: totals.findIndex(([n]) => n === name) + 1, share: (100 * total) / national, peakYear, peak, months };
    };
    return { national, top: totals.slice(0, 6), rows: MORE_PROVINCES.map(row) };
  }, [pm]);

  const info = (
    <button ref={btn} type="button" className={pod.more} aria-haspopup="dialog" onClick={() => openDialog('more', btn.current)}>
      Cómo se calculó
      <span aria-hidden="true" className={pod.chev}>+</span>
    </button>
  );

  let body: React.ReactNode;
  if (i < 0 || !data) {
    const max = data ? data.top[0][1] : 1;
    body = (
      <article className={styles.pod} aria-labelledby="more-h" aria-live="polite">
        <p className={pod.label}>Fuera de las seis historias</p>
        <h2 className={pod.title} id="more-h">Dónde más ardió</h2>
        {data && (
          <>
            <p className={styles.lead}>
              Entre 2012 y 2026 el satélite registró <b>{fmt(data.national)} focos</b> en el país.
              {!STORY_PROVS.has(data.top[0][0]) && <> La provincia con más no tiene una historia en este recorrido: es <b>{data.top[0][0]}</b>.</>}
            </p>
            <ol className={styles.rank} aria-label="Provincias con más focos, 2012 a 2026">
              {data.top.map(([name, n], k) => (
                <li key={name} className={STORY_PROVS.has(name) ? styles.told : styles.untold}>
                  <span className={styles.rankName}>{k + 1}. {name}</span>
                  <span className={styles.bar}><i style={{ width: `${(100 * n) / max}%` }} /></span>
                  <span className={styles.rankN}>{pct((100 * n) / data.national)} %</span>
                </li>
              ))}
            </ol>
            <p className={styles.note}>
              <span className={styles.keyUntold} /> sin historia en este recorrido · <span className={styles.keyTold} /> con historia ·
              porcentaje del total del país
            </p>
            {info}
          </>
        )}
      </article>
    );
  } else {
    const r = data.rows[i];
    const mx = Math.max(...r.months) || 1;
    const order = r.months.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0]);
    body = (
      <article className={styles.pod} aria-labelledby="more-h" aria-live="polite">
        <p className={pod.label}>
          <span className={pod.count}>{i + 1}/{MORE_PROVINCES.length}</span> Dónde más ardió
        </p>
        <h2 className={pod.title} id="more-h">{r.name}</h2>
        <div className={styles.figure}>
          <p className={pod.num}>{fmt(r.total)} <span className={pod.unit}>focos</span></p>
          <p className={pod.figLabel}>
            {r.rank}.ª del país, con el {pct(r.share)} % de todos los focos. Su peor año: {r.peakYear} ({fmt(r.peak)}).
          </p>
          <span className={pod.total}>2012–2026 · NASA FIRMS</span>
        </div>
        <figure className={styles.months}>
          <figcaption>
            Arde sobre todo en {MESES_L[Math.min(order[0][1], order[1][1])]} y {MESES_L[Math.max(order[0][1], order[1][1])]}
          </figcaption>
          <svg viewBox="0 0 288 70" role="img" aria-label={`Focos por mes en ${r.name}, 2012 a 2026`}>
            {r.months.map((v, k) => {
              const bh = Math.max(1, (v / mx) * 48);
              return (
                <g key={k}>
                  <rect x={k * 24 + 2} y={54 - bh} width={18} height={bh} rx={2} className={v === mx ? styles.peak : styles.mbar}>
                    <title>{`${MESES_L[k]}: ${fmt(v)} focos`}</title>
                  </rect>
                  <text x={k * 24 + 11} y={67} textAnchor="middle">{MESES[k]}</text>
                </g>
              );
            })}
          </svg>
        </figure>
        {info}
      </article>
    );
  }

  return <div ref={ref} className={styles.wrap} data-on="0">{body}</div>;
}
