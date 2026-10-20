'use client';
import { useEffect, useState } from 'react';
import { loadFoci, type Foci } from '../lib/data';
import { fmt, fociWeek, stageOf, toScene, weekDate, READ_0 } from '../lib/fire';
import { SLIDES } from '../lib/slides';
import { TOUR_EVENTS } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import ScenePanel from './ScenePanel';
import { MAP_COLORS, GRID_MAX } from './TourMap';
import styles from './TourStage.module.css';

type View = { chapter: number; s: number; week: number; revealed: boolean };

/**
 * What sits on the map while the tour runs: the fixed foci notice, the weekly counter of the active
 * fire and its schematic scene. All three follow the scroll state; React re-renders only when the
 * chapter, the week or the scene position change.
 */
export default function TourStage() {
  const [v, setV] = useState<View>({ chapter: -1, s: 0, week: 0, revealed: false });
  const [foci, setFoci] = useState<Record<string, Foci>>({});

  useEffect(() => {
    let live = true;
    TOUR_EVENTS.forEach((ev) => loadFoci(ev.id).then((E) => { if (live) setFoci((m) => ({ ...m, [ev.id]: E })); }, () => {}));
    return () => { live = false; };
  }, []);

  useEffect(() => subscribe(({ st }) => {
    const story = st.chapter >= 0 && st.chapter <= 5;
    const ev = story ? TOUR_EVENTS[st.chapter] : null;
    const s = story ? toScene({ ...READ_0, p: st.chapterT }) : 0;
    const E = ev ? foci[ev.id] : undefined;
    const week = E ? fociWeek(E, st.chapterT) : 0;
    const revealed = st.borders > 0 && st.close < 1;
    setV((o) => (o.chapter === st.chapter && o.week === week && o.revealed === revealed && Math.abs(o.s - s) < 0.0005
      ? o : { chapter: st.chapter, s, week, revealed }));
  }), [foci]);

  const story = v.chapter >= 0 && v.chapter <= 5;
  const ev = story ? TOUR_EVENTS[v.chapter] : null;
  const E = ev ? foci[ev.id] : undefined;
  const slide = ev ? SLIDES.find((x) => x.type === 'event' && x.ev.id === ev.id)! : SLIDES[0];

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

      <div className={v.chapter === 7 ? `${styles.legend} ${styles.on}` : styles.legend} aria-hidden={v.chapter !== 7}>
        <p className={styles.legendTitle}>Focos de calor en el año, por cuadro de unos 25 km</p>
        <ol className={styles.legendScale}>
          {MAP_COLORS.grid.map((c, i) => (
            <li key={c}>
              <i style={{ background: c, width: 6 + 4 * i, height: 6 + 4 * i }} />
              {['pocos', '', '', 'muchos'][i] && <span>{['pocos', '', '', 'muchos'][i]}</span>}
            </li>
          ))}
        </ol>
        <p className={styles.legendNote}>
          La misma escala para todos los años (hasta {GRID_MAX.toLocaleString('es-AR')} focos en un cuadro), así un año
          tranquilo se ve tranquilo. Un foco no es una hectárea quemada.
        </p>
      </div>

      <div className={story ? `${styles.scene} ${styles.on}` : styles.scene}>
        {ev && <ScenePanel s={v.s} stage={stageOf(v.s)} slide={slide} />}
      </div>
    </>
  );
}
