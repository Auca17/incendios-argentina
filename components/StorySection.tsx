'use client';
import { getStoryPhoto, type StoryPhoto } from '../lib/photos';
import CountUp from './CountUp';
import styles from './StorySection.module.css';

type Props = {
  ev: any;
  index: number;
  total: number;
  onOpenPhoto: (photo: StoryPhoto) => void;
};

/**
 * Editorial narrative card for each province in the journey.
 * Clean, legible, high-contrast, strictly avoids walls of text or distracting cartoon animations.
 */
export default function StorySection({ ev, index, total, onOpenPhoto }: Props) {
  const photo0 = getStoryPhoto(ev.id, 0);
  const photo1 = getStoryPhoto(ev.id, 1);
  const photo2 = getStoryPhoto(ev.id, 2);

  const mainFacts = ev.facts.slice(0, 3);

  return (
    <article className={styles.storyCard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.kickerRow}>
          <span className={styles.kicker}>
            {String(index + 1).padStart(2, '0')} DE {String(total).padStart(2, '0')} · {ev.region.toUpperCase()}
          </span>
          <span className={styles.timeBadge}>{ev.when}</span>
        </div>
        <h2 className={styles.title}>{ev.title}</h2>
      </header>

      {/* Hero Stat: Burnt Surface Area */}
      <div className={styles.statBox}>
        <span className={styles.statPre}>Superficie afectada</span>
        <div className={styles.statNumRow}>
          <CountUp value={ev.hero.value} className={styles.statNum} />
          <span className={styles.statUnit}>{ev.hero.unit}</span>
        </div>
        <p className={styles.statLabel}>{ev.hero.label}</p>
        <span className={styles.statSource}>Fuente: {ev.hero.src}</span>
      </div>

      {/* Lead Narrative & Origin */}
      <div className={styles.proseBlock}>
        <p className={styles.originText}>{ev.cause.text}</p>
        {ev.response && <p className={styles.responseText}>{ev.response}</p>}
      </div>

      {/* Key Documentary Facts */}
      {mainFacts.length > 0 && (
        <div className={styles.factsList}>
          {mainFacts.map((f: [string, string], i: number) => (
            <div key={i} className={styles.factItem}>
              <b className={styles.factFig}>{f[0]}</b>
              <span className={styles.factTxt}>{f[1]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Documentary Photographs (Click to enlarge) */}
      <div className={styles.photosGrid}>
        {photo0 && (
          <button
            type="button"
            className={styles.photoThumbCard}
            onClick={() => onOpenPhoto(photo0)}
            aria-label={`Ver fotografía ampliada: ${photo0.caption}`}
          >
            <div className={styles.thumbWrap}>
              <img src={photo0.src} alt={photo0.caption} loading="lazy" className={styles.thumbImg} />
              <span className={styles.zoomPill}>🔍 Ampliar</span>
            </div>
            <span className={styles.thumbCaption}>{photo0.caption}</span>
          </button>
        )}
        {photo1 && (
          <button
            type="button"
            className={styles.photoThumbCard}
            onClick={() => onOpenPhoto(photo1)}
            aria-label={`Ver fotografía ampliada: ${photo1.caption}`}
          >
            <div className={styles.thumbWrap}>
              <img src={photo1.src} alt={photo1.caption} loading="lazy" className={styles.thumbImg} />
              <span className={styles.zoomPill}>🔍 Ampliar</span>
            </div>
            <span className={styles.thumbCaption}>{photo1.caption}</span>
          </button>
        )}
      </div>

      {photo2 && (
        <div className={styles.secondaryPhotoWrap}>
          <button
            type="button"
            className={styles.photoThumbCardFull}
            onClick={() => onOpenPhoto(photo2)}
            aria-label={`Ver fotografía ampliada: ${photo2.caption}`}
          >
            <div className={styles.thumbWrap}>
              <img src={photo2.src} alt={photo2.caption} loading="lazy" className={styles.thumbImg} />
              <span className={styles.zoomPill}>🔍 Ampliar</span>
            </div>
            <span className={styles.thumbCaption}>{photo2.caption}</span>
          </button>
        </div>
      )}

      {/* Transition hint */}
      <footer className={styles.footerPrompt} aria-hidden="true">
        <span>El territorio avanza · Desplazá para continuar</span>
      </footer>
    </article>
  );
}
