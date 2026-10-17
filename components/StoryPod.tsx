'use client';
import { useEffect, useId, useState } from 'react';
import { loadProvinciaMes } from '../lib/data';
import { ALT, fmt, monthSeries } from '../lib/fire';
import { CAUSE_BY } from '../lib/tour';
import { remeasure } from '../lib/scrollDriver';
import MonthChart from './MonthChart';
import SourcesLink from './SourcesLink';
import styles from './StoryPod.module.css';

type Props = { ev: any; index: number; total: number };

/**
 * Reading pod of one fire. Closed: place and date, headline, the cause quoted with its source, the
 * hero figure with its source and "Ver más". Open (in place, 250 ms): how it was fought according to
 * the source, the monthly satellite chart and the second figure when the sources differ.
 */
export default function StoryPod({ ev, index, total }: Props) {
  const [open, setOpen] = useState(false);
  const [series, setSeries] = useState<number[] | null>(null);
  const id = useId();
  const alt = ALT[ev.id];

  useEffect(() => {
    if (!open || series) return;
    let live = true;
    loadProvinciaMes().then((pm) => { if (live) setSeries(monthSeries(pm, ev.months.prov, ev.months.year)); }, () => {});
    return () => { live = false; };
  }, [open, series, ev]);

  return (
    <article className={styles.pod} aria-labelledby={id + 'h'}>
      <p className={styles.label}>
        <span className={styles.count}>{index + 1}/{total}</span> {ev.region} · {ev.when}
      </p>
      <h2 className={styles.title} id={id + 'h'}>{ev.title}</h2>

      <blockquote className={styles.quote}>
        <p>{ev.cause.text}</p>
        <footer>{CAUSE_BY[ev.id]}</footer>
      </blockquote>

      <div className={styles.figure}>
        <p className={styles.num}>
          {fmt(ev.hero.value)} <span className={styles.unit}>{ev.hero.unit === 'hectáreas' ? 'ha' : ev.hero.unit}</span>
        </p>
        <p className={styles.figLabel}>
          {ev.hero.label} <span className={styles.src}>Según {ev.hero.src}.</span>
        </p>
      </div>

      <button
        type="button"
        className={styles.more}
        aria-expanded={open}
        aria-controls={id + 'm'}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Ver menos' : 'Ver más'}
        <span aria-hidden="true" className={styles.chev}>{open ? '−' : '+'}</span>
      </button>

      <div
        id={id + 'm'}
        className={open ? `${styles.drawer} ${styles.drawerOpen}` : styles.drawer}
        onTransitionEnd={remeasure}
        inert={!open}
      >
        <div className={styles.drawerInner}>
          <h3 className={styles.h3}>Cómo se combatió</h3>
          <p className={styles.body}>{ev.response}</p>

          {alt && (
            <>
              <h3 className={styles.h3}>Las fuentes no coinciden</h3>
              <ul className={styles.alt}>
                {alt.map((a) => (
                  <li key={a[0]}><b>{a[0]}</b><span>{a[1]}</span></li>
                ))}
              </ul>
            </>
          )}

          <div className={styles.chart}>
            {series && (
              <MonthChart series={series} provs={ev.months.prov} year={ev.months.year} from={ev.months.from} to={ev.months.to} />
            )}
            <p className={styles.chartNote}>
              Focos de calor detectados por satélite (NASA FIRMS, VIIRS S-NPP). No son hectáreas quemadas ni
              incendios forestales: incluyen quemas agrícolas.
            </p>
          </div>

          <SourcesLink className={styles.sources} />
        </div>
      </div>
    </article>
  );
}
