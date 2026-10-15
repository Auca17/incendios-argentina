'use client';
import { memo, useEffect, useRef, useState } from 'react';
import { loadProvinciaMes } from '../lib/data';
import { ALT, CHAPTERS, STAGE_NAMES, factsFor, monthSeries, type Fact } from '../lib/fire';
import { getStoryPhoto, type StoryPhoto } from '../lib/photos';
import CountUp from './CountUp';
import MonthChart from './MonthChart';
import styles from './FireSidebar.module.css';

/** Sticky three-stage bar: the active stage and the progress line follow the scene position s. */
export function StageBar({ s, stage }: { s: number; stage: number }) {
  return (
    <div className={styles.stages} aria-label="Etapas de la historia">
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

function PhotoCard({
  photo,
  stepLabel,
  onOpen,
}: {
  photo: StoryPhoto;
  stepLabel: string;
  onOpen: (p: StoryPhoto) => void;
}) {
  return (
    <figure className={`${styles.docPhoto} ${styles.blk}`} data-blk>
      <div className={styles.photoHeader}>
        <span className={styles.photoStepBadge}>{stepLabel}</span>
        <button
          type="button"
          className={styles.photoZoomBtn}
          onClick={() => onOpen(photo)}
          aria-label="Ampliar fotografía documental"
        >
          🔍 Ampliar
        </button>
      </div>
      <div className={styles.photoWrap} onClick={() => onOpen(photo)}>
        <img
          src={photo.src}
          alt={photo.caption}
          loading="lazy"
          className={styles.photoImg}
        />
      </div>
      <figcaption className={styles.photoCaption}>
        <p className={styles.photoText}>{photo.caption}</p>
        <div className={styles.photoMeta}>
          <span className={styles.photoCredit}>
            {photo.sourceUrl ? (
              <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">
                {photo.credit}
              </a>
            ) : (
              photo.credit
            )}
          </span>
          <span className={styles.photoLicense}>· {photo.license}</span>
        </div>
      </figcaption>
    </figure>
  );
}

type BodyProps = { ev: any; index: number; total: number; nextName: string | null; onNext: () => void };

/** The three chapters of one fire. Memoised: it does not re-render while p changes. */
const FireBody = memo(function FireBody({ ev, index, total, nextName, onNext }: BodyProps) {
  const root = useRef<HTMLDivElement>(null);
  const [series, setSeries] = useState<number[] | null>(null);
  const [modalPhoto, setModalPhoto] = useState<StoryPhoto | null>(null);

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

  // Close modal on Escape
  useEffect(() => {
    if (!modalPhoto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalPhoto(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalPhoto]);

  const alt = ALT[ev.id];
  const unitCap = ev.hero.unit.charAt(0).toUpperCase() + ev.hero.unit.slice(1);
  const start = factsFor(ev, 0), fire = factsFor(ev, 1), fight = factsFor(ev, 2);

  const photo0 = getStoryPhoto(ev.id, 0);
  const photo1 = getStoryPhoto(ev.id, 1);
  const photo2 = getStoryPhoto(ev.id, 2);

  const head = (i: number) => (
    <h3 className={styles.chh}><span aria-hidden="true">{i + 1}</span>{CHAPTERS[i]}</h3>
  );

  return (
    <div ref={root}>
      <p className={styles.kicker}>{index} de {total} · {ev.region} · {ev.when}</p>
      <h2 className={styles.title}>{ev.title}</h2>

      {/* Act 1: Cómo empezó */}
      <section className={styles.ch} id="ch-start">
        {head(0)}
        <blockquote className={`${styles.quote} ${styles.blk}`} data-blk>
          <p>{ev.cause.text}</p>
        </blockquote>

        {photo0 && (
          <PhotoCard
            photo={photo0}
            stepLabel="Registro inicial · Cómo empezó"
            onOpen={setModalPhoto}
          />
        )}

        {start.length > 0 && (
          <div className={`${styles.factsBlock} ${styles.blk}`} data-blk>
            <h4 className={styles.subHead}>Claves del origen y contexto</h4>
            <Facts facts={start} />
          </div>
        )}
      </section>

      {/* Act 2: El fuego y su magnitud */}
      <section className={styles.ch} id="ch-fire">
        {head(1)}
        <div className={`${styles.heroCard} ${styles.blk}`} data-blk>
          <span className={styles.heroBadge}>SUPERFICIE AFECTADA REGISTRADA</span>
          <div className={styles.hero}>
            <CountUp value={ev.hero.value} className={styles.num} />
            <span className={styles.unit}>{ev.hero.unit}</span>
          </div>
          <p className={styles.herolabel}>
            {unitCap} {ev.hero.label}
          </p>
          <div className={styles.heroSource}>
            <span className={styles.verifiedCheck}>✓ Fuente oficial:</span> {ev.hero.src}
          </div>
        </div>

        {alt && (
          <div className={`${styles.chips} ${styles.blk}`} data-blk>
            {alt.map((a) => <span key={a[0]}><b>{a[0]}</b> · {a[1]}</span>)}
          </div>
        )}

        {photo1 && (
          <PhotoCard
            photo={photo1}
            stepLabel="Punto máximo · El avance del fuego"
            onOpen={setModalPhoto}
          />
        )}

        <div className={`${styles.factsBlock} ${styles.blk}`} data-blk>
          <h4 className={styles.subHead}>Magnitud e impacto documentado</h4>
          {ev.hero.note && (
            <div className={styles.officialNote}>
              <b>Nota de registro:</b> {ev.hero.note}
            </div>
          )}
          <Facts facts={fire} />
        </div>
      </section>

      {/* Act 3: Cómo se combatió */}
      <section className={`${styles.ch} ${styles.last}`} id="ch-fight">
        {head(2)}
        <p className={`${styles.lead} ${styles.blk}`} data-blk>{ev.response}</p>

        {photo2 && (
          <PhotoCard
            photo={photo2}
            stepLabel="Operativo de combate · En el terreno"
            onOpen={setModalPhoto}
          />
        )}

        {fight.length > 0 && (
          <div className={`${styles.factsBlock} ${styles.blk}`} data-blk>
            <h4 className={styles.subHead}>Medios y operativo de control</h4>
            <Facts facts={fight} />
          </div>
        )}

        <div className={`${styles.chartSlot} ${styles.blk}`} data-blk>
          <h4 className={styles.subHead}>Evolución mensual de focos de calor</h4>
          {series && (
            <MonthChart series={series} provs={ev.months.prov} year={ev.months.year} from={ev.months.from} to={ev.months.to} />
          )}
        </div>

        {/* Respaldo de fuentes verificado */}
        <div className={`${styles.sourcesCard} ${styles.blk}`} data-blk>
          <h4 className={styles.sourcesHead}>
            <span className={styles.verifiedIcon}>✓</span> Fuentes de respaldo verificadas
          </h4>
          <ul className={styles.sourcesList}>
            {ev.sources.map((src: { t: string; u: string }) => (
              <li key={src.u}>
                <a href={src.u} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                  <span>{src.t}</span>
                  <span className={styles.extIcon}>↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {nextName && (
          <button className={`${styles.nextbtn} ${styles.blk}`} data-blk onClick={onNext}>
            Siguiente historia: {nextName} →
          </button>
        )}
      </section>

      {/* Lightbox Modal */}
      {modalPhoto && (
        <div
          className={styles.modalOverlay}
          onClick={() => setModalPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Fotografía en alta resolución"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setModalPhoto(null)}
              aria-label="Cerrar fotografía"
            >
              ✕
            </button>
            <img src={modalPhoto.src} alt={modalPhoto.caption} className={styles.modalImg} />
            <div className={styles.modalFooter}>
              <p className={styles.modalCaption}>{modalPhoto.caption}</p>
              <p className={styles.modalMeta}>
                <b>Crédito:</b> {modalPhoto.credit} · <b>Licencia:</b> {modalPhoto.license}
                {modalPhoto.sourceUrl && (
                  <> · <a href={modalPhoto.sourceUrl} target="_blank" rel="noopener noreferrer">Ver fuente original ↗</a></>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default FireBody;
