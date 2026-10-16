'use client';
import { useEffect, useState } from 'react';
import { loadProvinciaMes } from '../lib/data';
import { ALT, factsFor, monthSeries, type Fact } from '../lib/fire';
import { getStoryPhoto, type StoryPhoto } from '../lib/photos';
import type { Slide } from '../lib/slides';
import ScenePanel from './ScenePanel';
import CountUp from './CountUp';
import MonthChart from './MonthChart';
import BiodiversityCard from './BiodiversityCard';
import styles from './StoryActSection.module.css';

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

function StatGrid({ items }: { items: { figure: string; label: string }[] }) {
  if (!items.length) return null;
  return (
    <div className={styles.statGrid}>
      {items.map((it) => (
        <div key={it.figure} className={styles.statBox}>
          <span className={styles.statFig}>{it.figure}</span>
          <span className={styles.statLbl}>{it.label}</span>
        </div>
      ))}
    </div>
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
    <figure className={styles.docPhoto}>
      <div className={styles.photoHeader}>
        <span className={styles.photoStepBadge}>{stepLabel}</span>
        <button
          type="button"
          className={styles.photoZoomBtn}
          onClick={() => onOpen(photo)}
          aria-label="Ampliar fotografía"
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
        <p className={styles.photoCredit}>
          Fuente: {photo.sourceUrl ? (
            <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.credit}</a>
          ) : (
            photo.credit
          )}
        </p>
      </figcaption>
    </figure>
  );
}

type Props = {
  ev: any;
  index: number;
  total: number;
  onOpenPhoto: (p: StoryPhoto) => void;
  s?: number;
  stage?: number;
  slide?: Slide;
};

export default function StoryActSection({
  ev,
  index,
  total,
  onOpenPhoto,
  s = 0,
  stage = 0,
  slide,
}: Props) {
  const [series, setSeries] = useState<any>(null);

  useEffect(() => {
    let live = true;
    loadProvinciaMes().then(
      (pm) => { if (live) setSeries(monthSeries(pm, ev.months.prov, ev.months.year)); },
      () => {},
    );
    return () => { live = false; };
  }, [ev]);

  const alt = ALT[ev.id];
  const unitCap = ev.hero.unit.charAt(0).toUpperCase() + ev.hero.unit.slice(1);
  const start = factsFor(ev, 0), fire = factsFor(ev, 1), fight = factsFor(ev, 2);

  const fireHighlights = fire
    .filter((f) => /^(\+?~?\d)/i.test(f.figure) && f.text.length < 85)
    .slice(0, 2)
    .map((f) => ({ figure: f.figure, label: f.text }));

  const fightHighlights = fight
    .filter((f) => /^(\+?~?\d)/i.test(f.figure) && f.text.length < 85)
    .slice(0, 2)
    .map((f) => ({ figure: f.figure, label: f.text }));

  const photo0 = getStoryPhoto(ev.id, 0);
  const photo1 = getStoryPhoto(ev.id, 1);
  const photo2 = getStoryPhoto(ev.id, 2);

  return (
    <section id={`story-${ev.id}`} className={styles.storySection} data-slide-index={index}>
      {/* ----------------- ACT 1: CÓMO EMPEZÓ ----------------- */}
      <article
        id={`story-${ev.id}-act-0`}
        className={styles.actCard}
        data-slide-index={index}
        data-act-index="0"
      >
        <header className={styles.cardHeader}>
          <div className={styles.kickerRow}>
            <span className={styles.kicker}>
              {index} DE {total} · {ev.region.toUpperCase()} · {ev.when.toUpperCase()}
            </span>
            <span className={`${styles.actBadge} ${styles.actBadge1}`}>
              1 · CÓMO EMPEZÓ
            </span>
          </div>
          <h2 className={styles.title}>{ev.title}</h2>
        </header>

        {photo0 && (
          <PhotoCard
            photo={photo0}
            stepLabel="Registro inicial"
            onOpen={onOpenPhoto}
          />
        )}

        <blockquote className={styles.causeQuote}>
          <p>{ev.cause.text}</p>
        </blockquote>

        {start.length > 0 && (
          <div className={styles.detailsBlock}>
            <h4 className={styles.subHead}>Detalles del hecho</h4>
            <Facts facts={start} />
          </div>
        )}

        <div className={styles.scrollDownPrompt} aria-hidden="true">
          <span>Seguí bajando: el fuego avanza</span>
          <span className={styles.arrowIcon}>↓</span>
        </div>
      </article>

      {/* ----------------- ACT 2: LA MAGNITUD DEL FUEGO ----------------- */}
      <article
        id={`story-${ev.id}-act-1`}
        className={styles.actCard}
        data-slide-index={index}
        data-act-index="1"
      >
        <header className={styles.cardHeader}>
          <div className={styles.kickerRow}>
            <span className={styles.kicker}>{ev.region.toUpperCase()} · MÁXIMO IMPACTO</span>
            <span className={`${styles.actBadge} ${styles.actBadge2}`}>
              2 · LA MAGNITUD
            </span>
          </div>
        </header>

        <div className={styles.heroCard}>
          <span className={styles.heroPre}>Superficie total afectada</span>
          <div className={styles.heroNumRow}>
            <CountUp value={ev.hero.value} className={styles.heroNum} />
            <span className={styles.heroUnit}>{ev.hero.unit}</span>
          </div>
          <p className={styles.heroLabel}>
            {unitCap} {ev.hero.label}
          </p>
          <div className={styles.heroSource}>
            <span>Fuente oficial:</span> <b>{ev.hero.src}</b>
          </div>
        </div>

        {/* Animated Ecosystem & Combat Scene */}
        {slide && (
          <div className={styles.embeddedSceneWrap}>
            <div className={styles.sceneHeader}>
              <span className={styles.sceneBadge}>Ecosistema y Combate</span>
              <span className={styles.sceneAct}>Acto {stage + 1} de 3</span>
            </div>
            <ScenePanel s={s} stage={stage} slide={slide} />
          </div>
        )}

        {alt && (
          <div className={styles.altCard}>
            <h4 className={styles.altHead}>Fuentes en contraste</h4>
            <div className={styles.altList}>
              {alt.map((a) => (
                <div key={a[0]} className={styles.altRow}>
                  <b className={styles.altFig}>{a[0]}</b>
                  <span className={styles.altSrc}>{a[1]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <StatGrid items={fireHighlights} />

        {photo1 && (
          <PhotoCard
            photo={photo1}
            stepLabel="Punto crítico"
            onOpen={onOpenPhoto}
          />
        )}

        <div className={styles.biodiversityWrap}>
          <BiodiversityCard storyId={ev.id} />
        </div>

        {ev.hero.note && (
          <div className={styles.officialNote}>
            {ev.hero.note}
          </div>
        )}

        {fire.length > 0 && (
          <div className={styles.detailsBlock}>
            <h4 className={styles.subHead}>Detalles del hecho</h4>
            <Facts facts={fire} />
          </div>
        )}

        <div className={styles.scrollDownPrompt} aria-hidden="true">
          <span>Seguí bajando: el operativo de combate</span>
          <span className={styles.arrowIcon}>↓</span>
        </div>
      </article>

      {/* ----------------- ACT 3: EL COMBATE ----------------- */}
      <article
        id={`story-${ev.id}-act-2`}
        className={styles.actCard}
        data-slide-index={index}
        data-act-index="2"
      >
        <header className={styles.cardHeader}>
          <div className={styles.kickerRow}>
            <span className={styles.kicker}>{ev.region.toUpperCase()} · OPERATIVO</span>
            <span className={`${styles.actBadge} ${styles.actBadge3}`}>
              3 · EL COMBATE
            </span>
          </div>
        </header>

        {photo2 && (
          <PhotoCard
            photo={photo2}
            stepLabel="Operativo de combate"
            onOpen={onOpenPhoto}
          />
        )}

        <p className={styles.lead}>{ev.response}</p>

        <StatGrid items={fightHighlights} />

        <div className={styles.chartSlot}>
          <h4 className={styles.subHead}>Focos de calor por mes</h4>
          {series && (
            <MonthChart
              series={series}
              provs={ev.months.prov}
              year={ev.months.year}
              from={ev.months.from}
              to={ev.months.to}
            />
          )}
        </div>

        {fight.length > 0 && (
          <div className={styles.detailsBlock}>
            <h4 className={styles.subHead}>Detalles del operativo</h4>
            <Facts facts={fight} />
          </div>
        )}
      </article>
    </section>
  );
}
