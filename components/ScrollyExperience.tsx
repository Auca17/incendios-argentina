'use client';
import { useEffect, useRef } from 'react';
import { FOCAL, SECTIONS, TOUR_EVENTS } from '../lib/tour';
import { EVENTS } from '../lib/events';
import { readAddress } from '../lib/exploreState';
import { subscribe } from '../lib/scrollDriver';
import TourMap from './TourMap';
import CloudCurtain from './CloudCurtain';
import TourStage from './TourStage';
import TourHud from './TourHud';
import StoryPod from './StoryPod';
import ExploreSection from './ExploreSection';
import MoreSection from './MoreSection';
import Epilogue from './Epilogue';
import CoverTitle from './CoverTitle';
import SourcesSection from './SourcesSection';
import styles from './ScrollyExperience.module.css';

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
 * The guided tour: clouds, title, Argentina revealed, six fires north to south, wide shot, explore,
 * epilogue and the technical sources. All visible state derives from the scroll position (lib/tour.ts).
 */
export default function ScrollyExperience() {
  useEffect(() => {
    const { go } = readAddress();
    if (go === null || go === undefined) return;
    let targetId = '';
    if (go === 'explore') targetId = 'sec-explore';
    else if (go === 'sources') targetId = 'fuentes';
    else if (typeof go === 'number' && EVENTS[go]) targetId = 'sec-' + EVENTS[go].id;
    if (!targetId) return;

    const jump = () => {
      const el = document.getElementById(targetId);
      if (!el) return;
      const top = targetId === 'fuentes'
        ? Math.ceil(el.getBoundingClientRect().top + window.scrollY)
        : Math.ceil(el.getBoundingClientRect().top + window.scrollY - window.innerHeight * FOCAL) + 1;
      window.scrollTo({ top, behavior: 'auto' });
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        requestAnimationFrame(() => {
          jump();
          requestAnimationFrame(jump);
        });
      });
    } else {
      requestAnimationFrame(() => {
        jump();
        requestAnimationFrame(jump);
      });
    }
  }, []);

  return (
    <div className={styles.root}>
      <TourMap />
      <TourStage />
      <CloudCurtain />
      <TourHud />

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
              <h2 id="wide-h" className={styles.wideTitle}>Las seis, juntas</h2>
              <p>Selva, esteros, sierras, islas, piedemonte y bosque andino: el fuego no tiene un solo paisaje.</p>
            </article>
          </div>
        </section>

        <section id="sec-more" className={styles.story} style={vh('sec-more')} aria-label="Dónde más ardió">
          <div className={styles.podSlot}>
            <MoreSection />
          </div>
        </section>

        <section id="sec-explore" className={styles.story} style={vh('sec-explore')} aria-label="Explorá año por año">
          <div className={styles.podSlot}>
            <ExploreSection />
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
