'use client';
import { useEffect, useRef, useState } from 'react';
import { loadFoci, type Foci } from '../lib/data';
import { fmt, weekDate } from '../lib/fire';
import { EPISODE_WEEKS } from '../lib/airScene';
import { SCENES, storyWeek } from '../lib/scenes';
import { cineOk, cineShown } from '../lib/cine';
import { CELL_CLASSES, CELL_STORIES, DOT_ALPHA, DOT_D, DOT_FILL, DOT_SHADE_FROM, ZONE_ALPHA, ZONE_D, ZONE_SHADE_FROM, zoneMin } from '../lib/density';
import { STORY_PHOTOS } from '../lib/photos';
import { TOUR_EVENTS } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import { block, clearest, marksVersion, type Box } from '../lib/placement';
import { HUD_W, podRight } from '../lib/tourLayout';
import { MAP_COLORS, GRID_MAX } from './TourMap';
import Locator from './Locator';
import styles from './TourStage.module.css';

type Corner = 'br' | 'tr' | 'bl' | 'tl';

/** close: a scene's close-up note is on; ill: it is the illustration note (else the flames note). */
type View = { chapter: number; week: number; revealed: boolean; close: boolean; ill: boolean; balance: boolean; cine: boolean; shown: boolean; timed: boolean; clear: boolean };

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
/** "21 de enero de 2026" → "21 de enero". */
const dayMonth = (s: string) => s.replace(/ de \d{4}$/, '');
/** First day of a fire's weekly series, as "1 de enero". */
/** The provinces of a fire's series, as a reader says them: "Santa Fe, Entre Ríos y Buenos Aires". */
const provsOf = (ev: any) => (ev.months.prov as string[]).join(', ').replace(/, ([^,]*)$/, ' y $1');
const firstDay = (E: Foci) => new Date(E.start + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

/** The weeks of a story: each week's foci (E.cum), the shown week and the worst of the weeks it walks through. */
function weeksOf(E: Foci, week: number, last: number) {
  const all = Array.from({ length: E.weeks }, (_, k) => E.cum[k + 1] - E.cum[k]);
  // the weeks the story walks through (its last paced week, a little after), or up to the shown week
  const cur = Math.max(0, Math.min(E.weeks - 1, week - 1));
  const n = all.slice(0, Math.min(all.length, Math.max(last + 2, cur + 1)));
  const max = Math.max(1, ...n);
  return { all, cur, n, max, peak: n.indexOf(max) };
}

/**
 * The time of the map: one bar per week with the real foci of that week, the newest week shown on the
 * map lit, the weeks still to come dimmed. The worst week is named only once the map has reached it:
 * announced earlier, it would give away what the scroll is about to show. Pointing at a bar reads that
 * week (only the weeks already on the map: the ones to come stay unread).
 */
function WeekRibbon({ E, w }: { E: Foci; w: ReturnType<typeof weeksOf> }) {
  const { n, cur, max, peak } = w;
  const W = 100 / n.length;
  const [at, setAt] = useState(-1);
  const pick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = Math.floor(((e.clientX - r.left) / r.width) * n.length);
    setAt(k >= 0 && k <= cur ? k : -1);
  };
  return (
    <div className={styles.ribbon}>
      <svg className={styles.ribbonBars} viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" onMouseMove={pick} onMouseLeave={() => setAt(-1)}>
        {n.map((v, k) => {
          const h = v > 0 ? Math.max(0.8, (24 * v) / max) : 0;
          return <rect key={k} x={k * W + W * 0.12} y={24 - h} width={W * 0.76} height={h} className={k === at ? styles.barAt : k === cur ? styles.barNow : k < cur ? styles.barPast : styles.barNext} />;
        })}
        {cur >= peak && <path d={`M${(peak + 0.5) * W} 26 l1.6 3.4 h-3.2 z`} className={styles.barPeak} />}
      </svg>
      {at >= 0
        ? <p className={styles.ribbonPeak}>Semana al {dayMonth(weekDate(E, at + 1))}: {fmt(n[at])} {n[at] === 1 ? 'foco' : 'focos'}{at === peak && cur >= peak ? ', la peor' : ''}</p>
        : cur > peak && <p className={styles.ribbonPeak}>▲ Peor semana: al {dayMonth(weekDate(E, peak + 1))}, {fmt(max)} focos</p>}
    </div>
  );
}

/**
 * What sits on the map while the tour runs: the foci notice (outside the regions), the map's footer of the active
 * fire, the explore legend, and, for the fires that have one, a verified photo with its credit. They
 * follow the scroll state; React re-renders only when the chapter or the week change.
 */
export default function TourStage() {
  const [v, setV] = useState<View>({ chapter: -1, week: 0, revealed: false, close: false, ill: false, balance: false, cine: false, shown: false, timed: false, clear: false });
  const [foci, setFoci] = useState<Record<string, Foci>>({});
  const [tight, setTight] = useState(false);
  const [spot, setSpot] = useState<{ k: Corner; left: number; top: number } | null>(null);
  const photoOn = useRef(false);
  const figRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);

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
    // the cinematic opening is on screen (also while it holds for the plane's pass)
    const cine = (!!sf?.cine && cineOk()) || cineShown();
    const close = !!sf && (sf.flames || ill || cine);
    const balance = !!sf && sf.balance;
    // nothing over the map while a landscape or the smoke between regions covers it
    const shown = st.land < 0.5 && st.veil < 0.5;
    // the photo only once the smoke has fully cleared (never seen through its holes)
    const clear = st.land < 0.02 && st.veil < 0.05;
    // the weeks are running on the map (not yet the whole series at once)
    const timed = !!ev && !!SCENES[ev.id] && SCENES[ev.id].wf(st.chapterT) !== null;
    setV((o) => (o.chapter === st.chapter && o.week === week && o.revealed === revealed && o.close === close && o.ill === ill && o.balance === balance && o.cine === cine && o.shown === shown && o.timed === timed && o.clear === clear
      ? o : { chapter: st.chapter, week, revealed, close, ill, balance, cine, shown, timed, clear }));
  }), [foci]);

  /*
   * The figures sit under the region's text, at the foot of the reading column. On a screen too short
   * for both (a laptop, a browser with its bars), they go over the map, in the corner that covers the
   * fewest foci (lib/placement.ts): bottom right first, unless the story's photo is there.
   */
  useEffect(() => {
    if (v.chapter < 0 || v.chapter > 5) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const pod = document.querySelector<HTMLElement>(`[data-pod="${v.chapter}"]`);
      const fig = figRef.current, foot = footRef.current;
      if (!pod || !fig || !foot || window.innerWidth < 1024) return;
      // the figures' height with their longest content: the worst week, once named, adds a line
      const peakLine = fig.querySelector('svg') && !fig.querySelector('svg + p') ? 18 : 0;
      const need = fig.offsetHeight + peakLine + 12 + foot.offsetHeight + 24;
      setTight(pod.getBoundingClientRect().bottom + 16 > window.innerHeight - need);
    };
    const later = () => { if (!raf) raf = requestAnimationFrame(check); };
    later();
    window.addEventListener('resize', later);
    document.fonts?.ready.then(later);
    return () => { window.removeEventListener('resize', later); cancelAnimationFrame(raf); };
  }, [v.chapter, v.timed, foci]);

  useEffect(() => {
    if (!tight) { setSpot(null); block('figures', null); return; }
    let seen = -1, cur: Corner | undefined;
    const unsub = subscribe(({ vw, vh }) => {
      const fig = figRef.current;
      // recomputed when the marks change, or the photo comes or goes
      const ver = marksVersion() * 2 + (photoOn.current ? 1 : 0);
      if (!fig || ver === seen) return;
      seen = ver;
      const w = 320, h = fig.offsetHeight + (fig.querySelector('svg') && !fig.querySelector('svg + p') ? 18 : 0);
      const right = vw - HUD_W - 8 - w, left = podRight(vw) + 24;
      const options: [Corner, Box][] = [
        ['br', { left: right, top: vh - 24 - h, width: w, height: h }],
        ['tr', { left: right, top: 24 + 168, width: w, height: h }],
        ['bl', { left, top: vh - 24 - h, width: w, height: h }],
        ['tl', { left, top: 24, width: w, height: h }],
      ];
      const usable = photoOn.current ? options.filter(([k]) => k !== 'br') : options;
      cur = clearest(usable, usable.some(([k]) => k === cur) ? cur : undefined, 'figures');
      const b = usable.find(([k]) => k === cur)![1];
      block('figures', b);
      setSpot((o) => (o && o.k === cur && o.left === b.left && o.top === b.top ? o : { k: cur!, left: b.left, top: b.top }));
    });
    return () => { unsub(); block('figures', null); };
  }, [tight]);

  const story = v.chapter >= 0 && v.chapter <= 5;
  const ev = story ? TOUR_EVENTS[v.chapter] : null;
  const E = ev ? foci[ev.id] : undefined;
  const photo = ev ? STORY_PHOTOS[ev.id]?.[0] : undefined;
  photoOn.current = !!photo && !v.close && v.shown && v.clear;
  const sc = ev ? SCENES[ev.id] : undefined;
  // the stories drawn as cells carry their legend instead of the glow's note
  const cells = !!ev && CELL_STORIES.has(ev.id);
  const note = sc ? (v.cine && sc.notes.cine ? sc.notes.cine : v.ill ? sc.notes.ill : cells ? null : sc.notes.flames) : null;
  const weeks = E && ev && v.timed && !v.balance ? weeksOf(E, v.week, storyWeek(ev.id, E, 0.85)) : null;

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
      {/*
        The figures of the map in a panel of their own, top right under the locator: the foci shown so
        far (with their scope: provinces and dates) and, while the weeks run, each week's foci. The
        reading column keeps the story; the footer keeps only how to read the marks.
      */}
      {/* bottom left, at the foot of the reading column: the figures over the legend, never over the map */}
      <div className={tight ? `${styles.dock} ${styles.tight}` : styles.dock}>
      <div ref={figRef} className={story && v.shown && !v.cine ? `${styles.figures} ${styles.on}` : styles.figures} aria-live="off" style={spot ? { left: spot.left, top: spot.top, right: 'auto' } : undefined}>
        {E && ev && (
          <>
            <p className={styles.figKicker}>Focos de calor detectados</p>
            <div className={styles.figRow}>
              <p className={styles.figTotal}>{fmt(v.balance ? E.cum[EPISODE_WEEKS] : E.cum[v.week])}</p>
              {weeks && (
                <p className={styles.figWeek}>
                  <b>{fmt(weeks.all[weeks.cur])} {weeks.all[weeks.cur] === 1 ? 'foco' : 'focos'}</b>
                  <span className={weeks.cur === weeks.peak ? styles.figWeekPeak : undefined}>{weeks.cur === weeks.peak ? '▲ la peor semana' : 'en la última semana'}</span>
                </p>
              )}
            </div>
            <p className={styles.figScope}>
              en {provsOf(ev)}, del {firstDay(E)} al {dayMonth(weekDate(E, v.balance ? EPISODE_WEEKS : v.week))} de {ev.months.year}
              {v.balance && <>. Después, hasta el {dayMonth(weekDate(E, E.weeks))}, solo {fmt(E.total - E.cum[EPISODE_WEEKS])} más</>}
            </p>
            {weeks && <WeekRibbon E={E} w={weeks} />}
          </>
        )}
      </div>

      <div ref={footRef} className={story && v.shown ? `${styles.footer} ${styles.on}` : styles.footer} aria-live="off">
        {cells && !v.cine && (
          /*
           * The legend of the scale on screen: one dot per 5-km cell up close; far away, one dot per
           * zone of about 27 km (the map hands over by itself and publishes how far: --zone-mix).
           */
          <div className={styles.cells}>
            {/* the title and the swatches of each scale share one place and cross-fade */}
            <div className={styles.cellsSwap}>
              <p className={styles.cellsTitle} style={{ opacity: 'clamp(0, 1 - 2 * var(--zone-mix, 0), 1)' }}>Focos por celda de unos 5 km</p>
              <p className={styles.cellsTitle} style={{ opacity: 'clamp(0, 2 * var(--zone-mix, 0) - 1, 1)' }}>Intensidad media de focos detectados</p>
            </div>
            {/* what a zone is: it unfolds as the zones take over, so the legend never keeps an empty gap */}
            <div className={styles.cellsSwap}>
              <ol className={styles.cellsScale} style={{ opacity: 'clamp(0, 1 - 2 * var(--zone-mix, 0), 1)' }}>
                {CELL_CLASSES.map(([, , label], i) => (
                  <li key={label}>
                    <span className={styles.cellsSlot} aria-hidden="true">
                      {/* each dot as the map draws it for a cell of 26 px */}
                      <i style={{ width: 26 * DOT_D[i], height: 26 * DOT_D[i], background: DOT_FILL[i], opacity: DOT_ALPHA[i], boxShadow: i >= DOT_SHADE_FROM ? '0 0 0 1px rgba(0, 0, 0, 0.32)' : undefined }} />
                    </span>
                    {label}
                  </li>
                ))}
              </ol>
              <ol className={styles.cellsScale} style={{ opacity: 'clamp(0, 2 * var(--zone-mix, 0) - 1, 1)' }} aria-hidden="true">
                {CELL_CLASSES.map(([, , label], i) => (
                  <li key={label}>
                    <span className={styles.cellsSlot}>
                      {/* each dot as the map draws it for a zone of 40 px */}
                      <i style={{ width: Math.max(40 * ZONE_D[i], zoneMin(i)), height: Math.max(40 * ZONE_D[i], zoneMin(i)), background: DOT_FILL[i], opacity: ZONE_ALPHA[i], boxShadow: i >= ZONE_SHADE_FROM ? '0 0 0 1px rgba(0, 0, 0, 0.32)' : undefined }} />
                    </span>
                    {label}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
        {/* the caveat stays in sight in one line; what a focus is, on demand */}
        {!v.cine && (
          <details className={styles.caveat}>
            <summary>Un foco de calor no equivale a hectáreas quemadas ni a un incendio.</summary>
            <p>Es un punto caliente visto por satélite. Un mismo incendio puede sumar muchos focos.</p>
          </details>
        )}
        {v.close && note && <p className={styles.what}><b>{note[0]}</b>{note[1]}</p>}
      </div>
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

      <figure className={photo && !v.close && v.shown && v.clear ? `${styles.scene} ${styles.on}` : photo ? `${styles.scene} ${styles.on} ${styles.sceneAside}` : styles.scene}>
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
