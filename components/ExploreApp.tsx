'use client';
import { useEffect } from 'react';
import { pin } from '../lib/scrollDriver';
import { readAddress, setExplore, getExplore } from '../lib/exploreState';
import type { TourState } from '../lib/tour';
import TourMap from './TourMap';
import TourStage from './TourStage';
import ExploreSection from './ExploreSection';
import styles from './ExploreApp.module.css';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** The map of the tour held on its explore mode: the whole country, the year grid, clickable provinces. */
const EXPLORE: TourState = {
  idx: 0, t: 0, open: 1, close: 0, borders: 1, hud: 0, title: 0, titleDock: 1, chapter: 7, chapterT: 1, bank: 0,
  smoke: 0, drift: 0, ash: 0, epi: 0, more: -1, moreT: 0, land: 0, landT: 0, veil: 0, card: 0, pod: 0,
};
pin(EXPLORE);

/**
 * /explorar: the detailed map as a tool of its own, outside the story. The same map component and
 * data as the tour (year by year 0.25-degree cells, province series and ranking); the choice lives in
 * the address (?y=&p=) so a view can be shared. A link goes back to the point of the story the
 * reader came from.
 */
export default function ExploreApp() {
  useEffect(() => {
    readAddress();
    setExplore({ ...getExplore() });
  }, []);

  return (
    <div className={styles.root}>
      <TourMap />
      <TourStage />
      <header className={styles.bar}>
        <a className={styles.back} href={BASE + '/'}>
          <span aria-hidden="true">←</span> Volver a la historia
        </a>
        <p className={styles.brand}>Lo que el fuego se llevó</p>
      </header>
      <main className={styles.panel}>
        <h1 className="sr-only">Explorar los datos: focos de calor en Argentina, 2012–2026</h1>
        <ExploreSection />
      </main>
    </div>
  );
}
