'use client';
import { useEffect, useRef } from 'react';
import { FOCAL, SECTIONS, TOUR_EVENTS, entryOf } from '../lib/tour';
import { EVENTS } from '../lib/events';
import { readAddress } from '../lib/exploreState';
import { RETURN_KEY } from '../lib/returnPoint';
import { subscribe } from '../lib/scrollDriver';
import { startSmoothScroll, scrollToY } from '../lib/smoothScroll';
import TourMap from './TourMap';
import CloudCurtain from './CloudCurtain';
import Landscape from './Landscape';
import SceneInteraction from './SceneInteraction';
import TourStage from './TourStage';
import TourHud from './TourHud';
import StoryPod from './StoryPod';
import StoryDialog from './StoryDialog';
import MoreSection from './MoreSection';
import Epilogue from './Epilogue';
import CoverTitle from './CoverTitle';
import SourcesSection from './SourcesSection';
import styles from './ScrollyExperience.module.css';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const vh = (id: string) => ({ minHeight: SECTIONS.find((s) => s.id === id)!.vh + 'vh' });

/** Scroll hint of the opening: visible only at the very top, gone as soon as the reader scrolls. */
function Cue() {
  const ref = useRef<HTMLParagraphElement>(null);
  /*
   * Teaches the one interaction of the page from the first frame: the words and a scrolling wheel on
   * the cover; once the reader moves, only the arrow, smaller; gone as Argentina is revealed. A pure
   * function of the scroll, so it comes back when the reader goes back to the top.
   */
  useEffect(() => subscribe(({ scrollY, vh }) => {
    const el = ref.current;
    if (!el) return;
    const words = 1 - Math.min(1, Math.max(0, (scrollY - vh * 0.08) / (vh * 0.3)));
    const all = 1 - Math.min(1, Math.max(0, (scrollY - vh * 1.6) / (vh * 0.4)));
    el.style.setProperty('--words', words.toFixed(3));
    el.style.opacity = all.toFixed(3);
    el.style.visibility = all > 0.01 ? 'visible' : 'hidden';
  }), []);
  return (
    <p ref={ref} className={styles.cue}>
      <span className={styles.cueWords}>Deslizá para descubrir</span>
      <span className={styles.cueWheel} aria-hidden="true"><i /></span>
    </p>
  );
}

/** Dark scrim on the left under the reading text of the regions (the territory takes the rest). */
function Scrim() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => subscribe(({ st }) => {
    const on = (st.chapter >= 0 && st.chapter <= 5) || st.chapter === 8;
    // it goes as the clouds start closing over the map (it is over them: it would darken them), and
    // while a region's title card is read (Chubut's sits on the left, where the scrim is)
    if (ref.current) ref.current.style.opacity = on ? ((1 - st.land) * (1 - st.card) * (1 - Math.min(1, st.close / 0.2))).toFixed(3) : '0';
  }), []);
  return <div ref={ref} className={styles.scrim} aria-hidden="true" />;
}

/**
 * The story: clouds, title, Argentina revealed, six regions north to south (each opened by its
 * landscape, carried to the next by smoke), the change of scale to the whole country, the epilogue
 * on the closed clouds and the technical sources. All visible state derives from the scroll position
 * (lib/tour.ts). The year by year map is a separate page (/explorar).
 */
export default function ScrollyExperience() {
  useEffect(() => { startSmoothScroll(); }, []);

  useEffect(() => {
    const { go } = readAddress();
    // the explorer used to live on this page: old explorer addresses open it where it is now
    if (go === 'explore') { location.replace(BASE + '/explorar/' + location.search); return; }
    let targetId = '';
    let frac = 0;
    let top: number | null = null;
    if (go === 'sources') targetId = 'fuentes';
    else if (typeof go === 'number' && EVENTS[go]) targetId = 'sec-' + EVENTS[go].id;
    else {
      // back from /explorar: the same point of the story
      try {
        const y = sessionStorage.getItem(RETURN_KEY);
        sessionStorage.removeItem(RETURN_KEY);
        if (y !== null && !location.hash) top = +y;
      } catch { /* storage blocked: start from the top */ }
    }
    if (!targetId && top === null) return;

    const jump = () => {
      if (top !== null) { scrollToY(top, false); return; }
      const el = document.getElementById(targetId);
      if (!el) return;
      const i = SECTIONS.findIndex((s) => s.id === targetId);
      if (i >= 0) frac = entryOf(i);
      const y = targetId === 'fuentes'
        ? Math.ceil(el.getBoundingClientRect().top + window.scrollY)
        : Math.ceil(el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * frac - window.innerHeight * FOCAL) + 1;
      scrollToY(y, false);
    };
    const twice = () => requestAnimationFrame(() => { jump(); requestAnimationFrame(jump); });
    if (document.fonts?.ready) document.fonts.ready.then(twice); else twice();
  }, []);

  return (
    <div className={styles.root}>
      <TourMap />
      <TourStage />
      <CloudCurtain />
      <Landscape />
      <SceneInteraction />
      <Scrim />
      <TourHud />
      <Cue />

      <main className={styles.track}>
        <section id="sec-opening" className={styles.opening} style={vh('sec-opening')}>
          <CoverTitle />
        </section>

        <section id="sec-title" className={styles.titleSec} style={vh('sec-title')} aria-hidden="true" />

        <div id="sec-reveal" style={vh('sec-reveal')} aria-hidden="true" />

        {TOUR_EVENTS.map((ev, i) => (
          <section key={ev.id} id={'sec-' + ev.id} className={styles.story} style={vh('sec-' + ev.id)}>
            <StoryPod ev={ev} index={i} total={TOUR_EVENTS.length} />
          </section>
        ))}

        <section id="sec-more" className={styles.story} style={vh('sec-more')} aria-label="Dónde más ardió">
          <MoreSection />
        </section>

        <section id="sec-epilogue" className={styles.epilogue} style={vh('sec-epilogue')}>
          <Epilogue />
        </section>
      </main>

      <SourcesSection />
      <StoryDialog />
    </div>
  );
}
