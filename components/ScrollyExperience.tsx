'use client';
import { useEffect, useRef, useState } from 'react';
import { SECTIONS, TOUR_EVENTS } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import TourMap from './TourMap';
import CloudCurtain from './CloudCurtain';
import TourStage from './TourStage';
import TourHud from './TourHud';
import StoryPod from './StoryPod';
import Epilogue from './Epilogue';
import CoverTitle from './CoverTitle';
import SourcesSection from './SourcesSection';
import styles from './ScrollyExperience.module.css';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const vh = (id: string) => ({ minHeight: SECTIONS.find((s) => s.id === id)!.vh + 'vh' });

/** Scroll hint of the opening: visible only at the very top, gone as soon as the reader scrolls. */
function Cue() {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => subscribe(({ scrollY }) => {
    if (ref.current) ref.current.dataset.on = scrollY < 24 ? '1' : '0';
  }), []);
  return (
    <p ref={ref} className={styles.cue} data-on="1">
      <span aria-hidden="true">↓</span>
      <span className="sr-only">Deslizá para empezar</span>
    </p>
  );
}

/**
 * The guided tour: clouds, title, Argentina revealed, six fires north to south, wide shot, epilogue
 * and the technical sources. All visible state derives from the scroll position (lib/tour.ts).
 * Links in the legacy hash format (#<n>&y=…&p=…&c=…) open the explorer, which still reads them.
 */
export default function ScrollyExperience() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (/^#\d/.test(location.hash)) location.replace(BASE + '/explorar/' + location.hash);
  }, []);

  return (
    <div className={styles.root} data-paused={paused ? '' : undefined}>
      <TourMap />
      <TourStage />
      <CloudCurtain />
      <TourHud paused={paused} onPause={() => setPaused((p) => !p)} />

      <main className={styles.track}>
        <section id="sec-opening" className={styles.opening} style={vh('sec-opening')}>
          <CoverTitle />
          <Cue />
        </section>

        <section id="sec-title" className={styles.titleSec} style={vh('sec-title')} aria-hidden="true" />

        <div id="sec-reveal" style={vh('sec-reveal')} aria-hidden="true" />

        {TOUR_EVENTS.map((ev, i) => (
          <section key={ev.id} id={'sec-' + ev.id} className={styles.story} style={vh('sec-' + ev.id)}>
            <div className={styles.podSlot}>
              <StoryPod ev={ev} index={i} total={TOUR_EVENTS.length} />
            </div>
          </section>
        ))}

        <section id="sec-wide" className={styles.story} style={vh('sec-wide')} aria-labelledby="wide-h">
          <div className={styles.podSlot}>
            <article className={styles.widePod}>
              <h2 id="wide-h" className={styles.wideTitle}>Las seis historias en el mapa</h2>
              <p>
                Los puntos son los focos de calor que detectó el satélite durante cada incendio. No marcan
                superficie quemada: muestran dónde y cuándo hubo actividad de fuego.
              </p>
            </article>
          </div>
        </section>

        <section id="sec-epilogue" className={styles.epilogue} style={vh('sec-epilogue')}>
          <Epilogue />
        </section>
      </main>

      <SourcesSection />
    </div>
  );
}
