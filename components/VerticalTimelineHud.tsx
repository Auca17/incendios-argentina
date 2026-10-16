'use client';
import { useCallback } from 'react';
import type { Slide } from '../lib/slides';
import styles from './VerticalTimelineHud.module.css';

type Props = {
  activeSlide: number;
  slides: Slide[];
  onSelect: (index: number) => void;
};

export default function VerticalTimelineHud({ activeSlide, slides, onSelect }: Props) {
  const handleClick = useCallback(
    (index: number) => {
      onSelect(index);
    },
    [onSelect]
  );

  return (
    <nav className={styles.hud} aria-label="Línea de tiempo de la investigación">
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ height: `${(activeSlide / (slides.length - 1)) * 100}%` }}
        />
        {slides.map((s, i) => {
          const isActive = i === activeSlide;
          const isPast = i < activeSlide;
          const label = s.type === 'intro' ? 'Nacional' : s.type === 'event' ? s.ev.region : 'Metodología';
          const year = s.type === 'event' ? String(s.ev.year) : i === 0 ? '15 AÑOS' : 'DATOS';

          return (
            <button
              key={i}
              type="button"
              className={`${styles.node} ${isActive ? styles.active : ''} ${isPast ? styles.past : ''}`}
              onClick={() => handleClick(i)}
              aria-label={`Ir a ${label} (${year})`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className={styles.dot} />
              <span className={styles.tooltip}>
                <span className={styles.tipYear}>{year}</span>
                <span className={styles.tipName}>{label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
