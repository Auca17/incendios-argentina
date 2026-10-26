'use client';
import { useEffect, useState } from 'react';
import { loadFoci, type Foci } from '../lib/data';
import { fmt, weekDate } from '../lib/fire';
import { EPISODE_WEEKS } from '../lib/airScene';
import { SCENES, storyWeek } from '../lib/scenes';
import { cineOk } from '../lib/cine';
import { STORY_PHOTOS } from '../lib/photos';
import { TOUR_EVENTS } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import { MAP_COLORS, GRID_MAX } from './TourMap';
import Locator from './Locator';
import styles from './TourStage.module.css';

/** close: a scene's close-up note is on; ill: it is the illustration note (else the flames note). */
type View = { chapter: number; week: number; revealed: boolean; close: boolean; ill: boolean; balance: boolean; cine: boolean; shown: boolean };

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
/** "21 de enero de 2026" → "21 de enero". */
const dayMonth = (s: string) => s.replace(/ de \d{4}$/, '');
/** First day of a fire's weekly series, as "1 de enero". */
/** The provinces of a fire's series, as a reader says them: "Santa Fe, Entre Ríos y Buenos Aires". */
const provsOf = (ev: any) => (ev.months.prov as string[]).join(', ').replace(/, ([^,]*)$/, ' y $1');
const firstDay = (E: Foci) => new Date(E.start + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

/**
 * What sits on the map while the tour runs: the foci notice (outside the regions), the map's footer of the active
 * fire, the explore legend, and, for the fires that have one, a verified photo with its credit. They
 * follow the scroll state; React re-renders only when the chapter or the week change.
 */
export default function TourStage() {
  const [v, setV] = useState<View>({ chapter: -1, week: 0, revealed: false, close: false, ill: false, balance: false, cine: false, shown: false });
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
    const sf = ev && SCENES[ev.id] ? SCENES[ev.id].frame(st.chapterT, reduced) : null;
    const ill = !!sf && sf.ill > 0.5;
    const cine = !!sf?.cine && cineOk();
    const close = !!sf && (sf.flames || ill || cine);
    const balance = !!sf && sf.balance;
    // nothing over the map while a landscape or the smoke between regions covers it
    const shown = st.land < 0.5 && st.veil < 0.5;
    setV((o) => (o.chapter === st.chapter && o.week === week && o.revealed === revealed && o.close === close && o.ill === ill && o.balance === balance && o.cine === cine && o.shown === shown
      ? o : { chapter: st.chapter, week, revealed, close, ill, balance, cine, shown }));
  }), [foci]);

  const story = v.chapter >= 0 && v.chapter <= 5;
  const ev = story ? TOUR_EVENTS[v.chapter] : null;
  const E = ev ? foci[ev.id] : undefined;
  const photo = ev ? STORY_PHOTOS[ev.id]?.[0] : undefined;
  const sc = ev ? SCENES[ev.id] : undefined;
  const note = sc ? (v.cine && sc.notes.cine ? sc.notes.cine : v.ill ? sc.notes.ill : sc.notes.flames) : null;

  return (
    <>
      {/* outside the regions (the interlude) the notice stays as it was; in a region it is in the footer */}
      <p className={v.revealed && !story && v.shown ? `${styles.notice} ${styles.on}` : styles.notice}>
        <b>Focos de calor</b> ≠ hectáreas quemadas ≠ incendios forestales
      </p>

      {TOUR_EVENTS.map((e, i) => (
        <div key={e.id} className={v.chapter === i && v.shown && !v.cine ? `${styles.locator} ${styles.on}` : styles.locator} aria-hidden="true">
          <Locator provs={e.provs} marker={e.marker} label={`${e.region} en el mapa de Argentina`} className={styles.locatorMap} />
        </div>
      ))}

      {/*
        The map's footer: the count with its scope (the provinces and the dates it covers: the series
        of each fire is every focus of its provinces in its months, lib/data semanas-<id>.json), then
        what a focus is and, when there is one, what the picture on the map is.
      */}
      <div className={story && v.shown ? `${styles.footer} ${styles.on}` : styles.footer} aria-live="off">
        {E && ev && !v.cine && (
          <p className={styles.count}>
            {v.balance ? (
              <>
                <b><span className={styles.n}>{fmt(E.cum[EPISODE_WEEKS])}</span> focos de calor</b> en {provsOf(ev)} del {firstDay(E)} al {dayMonth(weekDate(E, EPISODE_WEEKS))} de {ev.months.year}.
                {' '}Después, hasta el {dayMonth(weekDate(E, E.weeks))}, solo {fmt(E.total - E.cum[EPISODE_WEEKS])} más.
              </>
            ) : (
              <>
                <b><span className={styles.n}>{fmt(E.cum[v.week])}</span> focos de calor</b> en {provsOf(ev)} del {firstDay(E)} al {dayMonth(weekDate(E, v.week))} de {ev.months.year}
              </>
            )}
          </p>
        )}
        <p className={styles.what}>
          {!v.cine && <>Un foco de calor es un punto caliente visto por satélite: no equivale a hectáreas quemadas ni a un incendio.</>}
          {v.close && note && <> <b>{note[0]}</b>{note[1]}</>}
        </p>
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
          La misma escala todos los años (hasta {GRID_MAX.toLocaleString('es-AR')} focos por cuadro): un año tranquilo se
          ve tranquilo.
        </p>
      </div>

      <figure className={photo && !v.close && v.shown ? `${styles.scene} ${styles.on}` : photo ? `${styles.scene} ${styles.on} ${styles.sceneAside}` : styles.scene}>
        {photo && (
          <>
            <img src={BASE + photo.src} alt={photo.alt} width={photo.width} height={photo.height} className={styles.photo} />
            <figcaption className={styles.photoCredit}>{photo.credit}{photo.licenseText || ''}</figcaption>
          </>
        )}
      </figure>
    </>
  );
}
