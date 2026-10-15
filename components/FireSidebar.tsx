'use client';
import { memo, useEffect, useRef, useState } from 'react';
import { loadProvinciaMes } from '../lib/data';
import { ALT, CHAPTERS, STAGE_NAMES, factsFor, monthSeries, type Fact } from '../lib/fire';
import CountUp from './CountUp';
import MonthChart from './MonthChart';
import styles from './FireSidebar.module.css';

/** Sticky three-stage bar: the active stage and the progress line follow the scene position s. */
export function StageBar({ s, stage }: { s: number; stage: number }) {
  return (
    <div className={styles.stages} aria-label="Etapas de la ilustración">
      <ol className={styles.pills}>
        {STAGE_NAMES.map((t, i) => (
          <li key={t} className={styles.pillItem}>
            {i > 0 && <i aria-hidden="true" className={styles.arrow}>→</i>}
            <span
              className={i === stage ? `${styles.pill} ${styles.on}` : i < stage ? `${styles.pill} ${styles.done}` : styles.pill}
              aria-current={i === stage ? 'step' : undefined}
            >
              {i + 1} {t}
            </span>
          </li>
        ))}
      </ol>
      <div className={styles.bar} aria-hidden="true">
        <i style={{ transform: `scaleX(${s.toFixed(4)})` }} />
      </div>
    </div>
  );
}

function More({ children }: { children: React.ReactNode }) {
  return (
    <details className={`${styles.more} ${styles.blk}`} data-blk>
      <summary>Ver más</summary>
      <div className={styles.moreBody}>{children}</div>
    </details>
  );
}

function Facts({ facts }: { facts: Fact[] }) {
  if (!facts.length) return null;
  return (
    <ul className={styles.facts}>
      {facts.map((f) => (
        <li key={f.figure}>
          <b>{f.figure}</b>
          <span>
            {f.text}
            {f.tag && <em className={styles.tag}> {f.tag}</em>}
          </span>
        </li>
      ))}
    </ul>
  );
}

type BodyProps = { ev: any; index: number; total: number; nextName: string | null; onNext: () => void };

/** The three chapters of one fire. Memoised: it does not re-render while p changes. */
const FireBody = memo(function FireBody({ ev, index, total, nextName, onNext }: BodyProps) {
  const root = useRef<HTMLDivElement>(null);
  const [series, setSeries] = useState<number[] | null>(null);

  useEffect(() => {
    let live = true;
    setSeries(null);
    loadProvinciaMes().then(
      (pm) => { if (live) setSeries(monthSeries(pm, ev.months.prov, ev.months.year)); },
      () => { /* chart simply stays out; the text carries the story */ },
    );
    return () => { live = false; };
  }, [ev]);

  /* each text block fades in once (200 ms) when it first enters the reading area */
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) { (e.target as HTMLElement).removeAttribute('data-reveal'); io.unobserve(e.target); }
      }),
      { root: el.closest('aside'), threshold: 0.05 },
    );
    el.querySelectorAll('[data-blk]').forEach((n) => { n.setAttribute('data-reveal', 'pre'); io.observe(n); });
    return () => io.disconnect();
  }, [ev]);

interface VerifiedPhoto {
  src: string;
  caption: string;
  credit: string;
  license: string;
  sourceUrl: string;
}

const VERIFIED_PHOTOS: Record<string, VerifiedPhoto> = {
  cordoba: {
    src: '/img/verified/cordoba-fuego.jpg',
    caption: 'Columnas de humo y focos activos sobre las Sierras de Córdoba registrados por el satélite Terra (MODIS).',
    credit: 'NASA Worldview / Terra MODIS',
    license: 'Dominio público',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Wildfires_in_Cordoba_Province,_Argentina.jpg',
  },
  delta: {
    src: '/img/verified/delta-fuego.jpg',
    caption: 'Frente de fuego sobre los pastizales y humedales del Delta del Paraná durante el operativo de combate.',
    credit: 'Parques Nacionales / Min. de Ambiente',
    license: 'CC BY 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Incendio_en_delta_del_paran%C3%A1_2020_-_Parques_Nacionales.jpg',
  },
  corrientes: {
    src: '/img/verified/corrientes-fuego.jpg',
    caption: 'Vista satelital (Landsat 9) de los focos de calor y cicatrices de fuego en torno a los Esteros del Iberá.',
    credit: 'NASA Earth Observatory / USGS',
    license: 'Dominio público',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Wildfires_Ravage_Corrientes_as_seen_by_Landsat_9.jpg',
  },
};

  const alt = ALT[ev.id];
  const photo = VERIFIED_PHOTOS[ev.id];
  const unitCap = ev.hero.unit.charAt(0).toUpperCase() + ev.hero.unit.slice(1);
  const start = factsFor(ev, 0), fire = factsFor(ev, 1), fight = factsFor(ev, 2);
  const head = (i: number) => (
    <h3 className={styles.chh}><span aria-hidden="true">{i + 1}</span>{CHAPTERS[i]}</h3>
  );

  return (
    <div ref={root}>
      <p className={styles.kicker}>{index} de {total} · {ev.region} · {ev.when}</p>
      <h2 className={styles.title}>{ev.title}</h2>

      <section className={styles.ch} id="ch-start">
        {head(0)}
        <blockquote className={`${styles.quote} ${styles.blk}`} data-blk><p>{ev.cause.text}</p></blockquote>
        {start.length > 0 && <More><Facts facts={start} /></More>}
      </section>

      <section className={styles.ch} id="ch-fire">
        {head(1)}
        <div className={`${styles.hero} ${styles.blk}`} data-blk>
          <CountUp value={ev.hero.value} className={styles.num} />
          <span className={styles.unit}>{ev.hero.unit}</span>
        </div>
        <p className={`${styles.herolabel} ${styles.blk}`} data-blk>
          {unitCap} {ev.hero.label} Según {ev.hero.src}.
        </p>
        {alt && (
          <div className={`${styles.chips} ${styles.blk}`} data-blk>
            {alt.map((a) => <span key={a[0]}><b>{a[0]}</b> · {a[1]}</span>)}
          </div>
        )}
        {photo && (
          <figure className={`${styles.docPhoto} ${styles.blk}`} data-blk>
            <div className={styles.photoWrap}>
              <img src={photo.src} alt={photo.caption} loading="lazy" className={styles.photoImg} />
            </div>
            <figcaption className={styles.photoCaption}>
              <span className={styles.photoText}>{photo.caption}</span>
              <span className={styles.photoCredit}>
                Foto documental: <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.credit}</a> · {photo.license}
              </span>
            </figcaption>
          </figure>
        )}
        <More>
          <p>{ev.hero.note}</p>
          <Facts facts={fire} />
        </More>
      </section>

      <section className={`${styles.ch} ${styles.last}`} id="ch-fight">
        {head(2)}
        <p className={`${styles.lead} ${styles.blk}`} data-blk>{ev.response}</p>
        {fight.length > 0 && <More><Facts facts={fight} /></More>}
        <div className={`${styles.chartSlot} ${styles.blk}`} data-blk>
          {series && (
            <MonthChart series={series} provs={ev.months.prov} year={ev.months.year} from={ev.months.from} to={ev.months.to} />
          )}
        </div>
        <details className={`${styles.sources} ${styles.blk}`} data-blk>
          <summary>Fuentes</summary>
          <ul>
            {ev.sources.map((src: { t: string; u: string }) => (
              <li key={src.u}><a href={src.u} target="_blank" rel="noopener noreferrer">{src.t}</a></li>
            ))}
          </ul>
        </details>
        {nextName && (
          <button className={`${styles.nextbtn} ${styles.blk}`} data-blk onClick={onNext}>{nextName} →</button>
        )}
      </section>
    </div>
  );
});

export default FireBody;
