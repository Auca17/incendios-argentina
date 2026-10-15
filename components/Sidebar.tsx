import { forwardRef } from 'react';
import { EVENTS } from '../lib/events';
import type { Slide } from '../lib/slides';
import FireBody, { StageBar } from './FireSidebar';
import HomeSidebar from './HomeSidebar';
import MethodSidebar from './MethodSidebar';
import styles from './Sidebar.module.css';

type Props = {
  index: number;
  slide: Slide;
  s: number;
  stage: number;
  nextName: string | null;
  onNext: () => void;
  /** Home: the year highlighted in the bars and the handler for picking one. */
  year: number | null;
  onPickYear: (y: number) => void;
  /** Controls / cards that sit in the side panel on desktop and inside this column on small screens. */
  inline?: React.ReactNode;
};

/** The text column and the scroll container whose progress drives the map and the scene. */
const Sidebar = forwardRef<HTMLElement, Props>(function Sidebar(
  { index, slide, s, stage, nextName, onNext, year, onPickYear, inline },
  ref,
) {
  return (
    <aside ref={ref} className={styles.side} tabIndex={-1} aria-label="Texto de la pantalla">
      <div className={slide.type === 'event' ? styles.inner : `${styles.inner} ${styles.plain}`}>
        {slide.type === 'event' ? (
          <>
            <StageBar s={s} stage={stage} />
            <FireBody ev={slide.ev} index={index} total={EVENTS.length} nextName={nextName} onNext={onNext} />
          </>
        ) : slide.type === 'intro' ? (
          <HomeSidebar year={year} onPickYear={onPickYear}>{inline}</HomeSidebar>
        ) : (
          <MethodSidebar>{inline}</MethodSidebar>
        )}
      </div>
    </aside>
  );
});

export default Sidebar;
