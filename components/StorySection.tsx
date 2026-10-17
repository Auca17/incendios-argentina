'use client';
import { getStoryPhoto, type StoryPhoto } from '../lib/photos';
import CountUp from './CountUp';
import CloudPod from './CloudPod';
import styles from './StorySection.module.css';

type Props = {
  ev: any;
  index: number;
  total: number;
  onOpenPhoto: (photo: StoryPhoto) => void;
};

const FALLBACK_PHOTO_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23141210"/><circle cx="200" cy="115" r="28" fill="%232b2622"/><path d="M188 115a12 12 0 1 0 24 0 12 12 0 0 0-24 0" fill="%23c55221"/><text x="50%" y="165" fill="%239e948c" font-family="monospace" font-size="11" text-anchor="middle" letter-spacing="1">REGISTRO DOCUMENTAL</text></svg>';

/**
 * Editorial narrative card for each province in the journey.
 * Inscribed directly on a sculpted organic cloud/smoke pod.
 */
export default function StorySection({ ev, index, total, onOpenPhoto }: Props) {
  const photo0 = getStoryPhoto(ev.id, 0);
  const photo1 = getStoryPhoto(ev.id, 1);
  const photo2 = getStoryPhoto(ev.id, 2);

  const mainFacts = ev.facts.slice(0, 3);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = FALLBACK_PHOTO_SVG;
  };

  return (
    <CloudPod className={styles.storyPod}>
      <article className={styles.storyContent}>
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
              aria-label={`Ampliar imagen: ${photo0.caption}`}
            >
              <div className={styles.thumbWrap}>
                <img
                  src={photo0.src}
                  alt={photo0.caption}
                  loading="lazy"
                  className={styles.thumbImg}
                  onError={handleImgError}
                />
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
              aria-label={`Ampliar imagen: ${photo1.caption}`}
            >
              <div className={styles.thumbWrap}>
                <img
                  src={photo1.src}
                  alt={photo1.caption}
                  loading="lazy"
                  className={styles.thumbImg}
                  onError={handleImgError}
                />
                <span className={styles.zoomPill}>🔍 Ampliar</span>
              </div>
              <span className={styles.thumbCaption}>{photo1.caption}</span>
            </button>
          )}

          {photo2 && (
            <button
              type="button"
              className={styles.photoThumbCard}
              onClick={() => onOpenPhoto(photo2)}
              aria-label={`Ampliar imagen: ${photo2.caption}`}
            >
              <div className={styles.thumbWrap}>
                <img
                  src={photo2.src}
                  alt={photo2.caption}
                  loading="lazy"
                  className={styles.thumbImg}
                  onError={handleImgError}
                />
                <span className={styles.zoomPill}>🔍 Ampliar</span>
              </div>
              <span className={styles.thumbCaption}>{photo2.caption}</span>
            </button>
          )}
        </div>

        {/* Transition hint */}
        <footer className={styles.footerPrompt} aria-hidden="true">
          <span>El territorio avanza · Desplazá para continuar</span>
        </footer>
      </article>
    </CloudPod>
  );
}
