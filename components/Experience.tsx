'use client';
import { useRef } from 'react';
import { SLIDES } from '../lib/slides';
import { useHashRoute } from '../lib/router';
import { useScrollProgress } from '../lib/progress';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import MapPanel from './MapPanel';
import ScenePanel from './ScenePanel';
import Nav from './Nav';
import styles from './Experience.module.css';

/** Wires the router (chapter) and the sidebar scroll (p) to the three panels. */
export default function Experience() {
  const { route, setSlide, go } = useHashRoute(SLIDES.length);
  const sideRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(sideRef, route.slide);
  const slide = SLIDES[route.slide];

  return (
    <div className={styles.app}>
      <TopBar index={route.slide} count={SLIDES.length} name={slide.name} />
      <div className={styles.panels}>
        <Sidebar ref={sideRef} index={route.slide} p={p} />
        <div className={styles.stage}>
          <MapPanel p={p} slide={slide} />
          <ScenePanel p={p} slide={slide} />
        </div>
        <Nav index={route.slide} slides={SLIDES} onGo={setSlide} onStep={go} />
      </div>
      <p className="sr-only" aria-live="polite">
        {`Pantalla ${route.slide + 1} de ${SLIDES.length}: ${slide.name}`}
      </p>
    </div>
  );
}
