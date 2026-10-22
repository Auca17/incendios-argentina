'use client';
import { useEffect, useId, useState } from 'react';
import { loadProvinciaMes } from '../lib/data';
import { ALT, fmt, monthSeries, type Fact } from '../lib/fire';
import { CAUSE_BY } from '../lib/tour';
import { remeasure } from '../lib/scrollDriver';
import { STORY_PHOTOS } from '../lib/photos';
import MonthChart from './MonthChart';
import styles from './StoryPod.module.css';

type Props = { ev: any; index: number; total: number };

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** All the facts of a fire, as EVENTS lists them (figure + text, both from the cited source). */
const facts = (ev: any): Fact[] => (ev.facts as string[][]).map((f) => ({ figure: f[0], text: f[1] }));

/**
 * Reading pod of one fire. Closed: place and date, headline, the cause quoted with its source, the
 * hero figure as a fixed total with its source and "Ver más". Open (in place, 250 ms): how it was
 * fought and the facts, as the cited sources give them, the second figure when the sources differ and
 * the monthly satellite chart.
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
        {/* the region only when the title does not already name it */}
        <span className={styles.count}>{index + 1}/{total}</span> {ev.title.includes(ev.region) ? ev.when : `${ev.region} · ${ev.when}`}
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
        <p className={styles.figLabel}>{cap(ev.hero.unit)} {ev.hero.label}</p>
        <span className={styles.total}>Fuente: {ev.hero.src}</span>
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

          <h3 className={styles.h3}>Lo que dicen las fuentes</h3>
          <ul className={styles.facts}>
            {facts(ev).map((f) => (
              <li key={f.figure}><b>{f.figure}</b><span>{f.text}</span></li>
            ))}
          </ul>

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
              Focos de calor por mes. NASA FIRMS, satélite VIIRS S-NPP.
            </p>
          </div>

          {/* the first photo of a fire is shown next to the map; the others live here */}
          {STORY_PHOTOS[ev.id] && STORY_PHOTOS[ev.id].length > 1 && (
            <div className={styles.photos}>
              {STORY_PHOTOS[ev.id].slice(1).map((p) => (
                <figure key={p.src} className={styles.photo}>
                  <img
                    src={(process.env.NEXT_PUBLIC_BASE_PATH || '') + p.src}
                    alt={p.alt}
                    width={p.width}
                    height={p.height}
                    loading="lazy"
                    onLoad={remeasure}
                  />
                  <figcaption>
                    {p.credit}
                    {p.licenseUrl && p.licenseText && (
                      <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer">
                        {p.licenseText}
                      </a>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

        </div>
      </div>
    </article>
  );
}
