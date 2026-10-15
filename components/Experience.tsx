'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SLIDES } from '../lib/slides';
import { useHashRoute } from '../lib/router';
import { useReadProgress } from '../lib/progress';
import { loadProvincias } from '../lib/data';
import { stageOf, toScene } from '../lib/fire';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import MapPanel from './MapPanel';
import ScenePanel from './ScenePanel';
import ScrollCue from './ScrollCue';
import AvisoPopover from './AvisoPopover';
import Nav from './Nav';
import styles from './Experience.module.css';

const NO_PROVINCES: string[] = [];
const NO_GEO: any[] = [];

const slideName = (i: number) => {
  const s = SLIDES[i];
  return s.type === 'event' ? s.ev.region : s.name;
};

/** Wires the router (chapter) and the sidebar reading progress (p) to the three panels. */
export default function Experience() {
  const [geo, setGeo] = useState<any[]>(NO_GEO);
  const provinces = useMemo(() => (geo === NO_GEO ? NO_PROVINCES : geo.map((f) => f.properties.name as string)), [geo]);
  const { route, setSlide, go } = useHashRoute(SLIDES.length, provinces);
  const sideRef = useRef<HTMLElement>(null);
  const read = useReadProgress(sideRef, route.slide);
  const slide = SLIDES[route.slide];
  const isEvent = slide.type === 'event';

  useEffect(() => {
    let live = true;
    loadProvincias().then((fc) => { if (live) setGeo(fc.features); }, () => { /* the map just shows no outlines */ });
    return () => { live = false; };
  }, []);

  /* one p drives the map week, the scene and the stage bar; scrolling back reverses all three */
  const s = toScene(read);
  const stage = stageOf(s);

  const next = () => {
    setSlide(route.slide + 1);
    if (!window.matchMedia('(max-width: 899.98px)').matches) sideRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className={styles.app}>
      <TopBar index={route.slide} count={SLIDES.length} name={slide.name} />
      <div className={styles.panels}>
        <Sidebar
          ref={sideRef}
          index={route.slide}
          slide={slide}
          s={s}
          stage={stage}
          nextName={route.slide < SLIDES.length - 1 ? slideName(route.slide + 1) : null}
          onNext={next}
        />
        <div className={styles.stage}>
          <MapPanel p={read.p} slide={slide} geo={geo} />
          <ScenePanel s={s} stage={stage} slide={slide} />
        </div>
        <div className={styles.avisoSlot}><AvisoPopover /></div>
        <ScrollCue hidden={!isEvent || read.p > 0.01} />
        <Nav index={route.slide} slides={SLIDES} onGo={setSlide} onStep={go} />
      </div>
      <p className="sr-only" aria-live="polite">
        {`Pantalla ${route.slide + 1} de ${SLIDES.length}: ${slideName(route.slide)}`}
      </p>
    </div>
  );
}
