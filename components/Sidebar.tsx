import { forwardRef } from 'react';
import { EVENTS } from '../lib/events';
import type { Slide } from '../lib/slides';
import FireBody, { StageBar } from './FireSidebar';
import styles from './Sidebar.module.css';

type Props = {
  index: number;
  slide: Slide;
  s: number;
  stage: number;
  nextName: string | null;
  onNext: () => void;
};

/**
 * The text column and the scroll container whose progress drives the map and the scene.
 * Fire chapters render the real text; the other screens are placeholders until phase C.
 */
const Sidebar = forwardRef<HTMLElement, Props>(function Sidebar({ index, slide, s, stage, nextName, onNext }, ref) {
  return (
    <aside ref={ref} className={styles.side} tabIndex={-1} aria-label="Texto de la pantalla">
      <div className={slide.type === 'event' ? styles.inner : `${styles.inner} ${styles.plain}`}>
        {slide.type === 'event' ? (
          <>
            <StageBar s={s} stage={stage} />
            <FireBody ev={slide.ev} index={index} total={EVENTS.length} nextName={nextName} onNext={onNext} />
          </>
        ) : (
          <>
            <p className={styles.kicker}>{slide.name}</p>
            <h2 className={styles.heading}>{slide.type === 'intro' ? 'Seis incendios, 2012–2026' : 'Cómo se hizo'}</h2>
            {nextName && (
              <button className={styles.nextbtn} onClick={onNext}>{nextName} →</button>
            )}
          </>
        )}
      </div>
    </aside>
  );
});

export default Sidebar;
