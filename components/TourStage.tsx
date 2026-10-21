'use client';
import { useEffect, useState } from 'react';
import { loadFoci, type Foci } from '../lib/data';
import { fmt, weekDate } from '../lib/fire';
import { AIR_STORY, airScene, storyWeek } from '../lib/airScene';
import { STORY_PHOTOS } from '../lib/photos';
import { TOUR_EVENTS } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import { MAP_COLORS, GRID_MAX } from './TourMap';
import styles from './TourStage.module.css';

type View = { chapter: number; week: number; revealed: boolean; flames: boolean; plane: boolean };

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * What sits on the map while the tour runs: the fixed foci notice, the weekly counter of the active
 * fire, the explore legend, and, for the fires that have one, a verified photo with its credit. They
 * follow the scroll state; React re-renders only when the chapter or the week change.
 */
export default function TourStage() {
  const [v, setV] = useState<View>({ chapter: -1, week: 0, revealed: false, flames: false, plane: false });
  const [foci, setFoci] = useState<Record<string, Foci>>({});

  useEffect(() => {
    let live = true;
    TOUR_EVENTS.forEach((ev) => loadFoci(ev.id).then((E) => { if (live) setFoci((m) => ({ ...m, [ev.id]: E })); }, () => {}));
    return () => { live = false; };
  }, []);

  useEffect(() => subscribe(({ st, reduced }) => {
    const story = st.chapter >= 0 && st.chapter <= 5;
    const ev = story ? TOUR_EVENTS[st.chapter] : null;
    const E = ev ? foci[ev.id] : undefined;
    const week = E && ev ? storyWeek(ev.id, E, st.chapterT) : 0;
    const revealed = st.borders > 0 && st.close < 1;
    const air = ev?.id === AIR_STORY ? airScene(st.chapterT, reduced) : null;
    const flames = !!air && air.zoom > 0.5;
    const plane = !!air && air.show > 0.5;
    setV((o) => (o.chapter === st.chapter && o.week === week && o.revealed === revealed && o.flames === flames && o.plane === plane
      ? o : { chapter: st.chapter, week, revealed, flames, plane }));
  }), [foci]);

  const story = v.chapter >= 0 && v.chapter <= 5;
  const ev = story ? TOUR_EVENTS[v.chapter] : null;
  const E = ev ? foci[ev.id] : undefined;
  const photo = ev ? STORY_PHOTOS[ev.id]?.[0] : undefined;

  return (
    <>
      <p className={v.revealed ? `${styles.notice} ${styles.on}` : styles.notice}>
        <b>Focos de calor</b> ≠ hectáreas quemadas ≠ incendios forestales
      </p>

      <div className={story ? `${styles.counter} ${styles.on}` : styles.counter} aria-live="off">
        {E && ev && (
          <>
            <span className={styles.counterHead}>{ev.region} · focos detectados por satélite</span>
            <span className={styles.counterLine}>
              semana {v.week} de {E.weeks} · <b>{fmt(E.cum[v.week])} focos</b> · hasta el {weekDate(E, v.week)}
            </span>
          </>
        )}
      </div>

      <div className={v.chapter === 7 || v.chapter === 8 ? `${styles.legend} ${styles.on}` : styles.legend} aria-hidden={v.chapter !== 7 && v.chapter !== 8}>
        <p className={styles.legendTitle}>
          {v.chapter === 8 ? 'Focos de calor de 2012 a 2026, por cuadro de unos 25 km' : 'Focos de calor en el año, por cuadro de unos 25 km'}
        </p>
        <ol className={styles.legendScale}>
          {MAP_COLORS.grid.map((c, i) => (
            <li key={c}>
              <i style={{ background: c, width: 6 + 4 * i, height: 6 + 4 * i }} />
              {['pocos', '', '', 'muchos'][i] && <span>{['pocos', '', '', 'muchos'][i]}</span>}
            </li>
          ))}
        </ol>
        <p className={styles.legendNote} hidden={v.chapter !== 7}>
          La misma escala para todos los años (hasta {GRID_MAX.toLocaleString('es-AR')} focos en un cuadro), así un año
          tranquilo se ve tranquilo. Un foco no es una hectárea quemada.
        </p>
      </div>

      <p className={v.flames ? `${styles.fxNote} ${styles.on}` : styles.fxNote}>
        {v.plane
          ? <><b>Ilustración.</b> Aviones hidrantes combatieron este incendio; esta pasada no reproduce una operación concreta.</>
          : <><b>Las llamas</b> marcan dónde se acumularon más focos de calor. No miden superficie quemada.</>}
      </p>

      <figure className={photo && !v.flames ? `${styles.scene} ${styles.on}` : photo ? `${styles.scene} ${styles.on} ${styles.sceneAside}` : styles.scene}>
        {photo && (
          <>
            <img src={BASE + photo.src} alt={photo.alt} width={photo.width} height={photo.height} className={styles.photo} />
            <figcaption className={styles.photoCredit}>{photo.credit}</figcaption>
          </>
        )}
      </figure>
    </>
  );
}
