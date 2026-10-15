'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SLIDES } from '../lib/slides';
import { routeYear, useHashRoute, type Compare } from '../lib/router';
import { useReadProgress } from '../lib/progress';
import { loadProvincias } from '../lib/data';
import { stageOf, toScene } from '../lib/fire';
import { buildView, type ViewSpec } from '../lib/explore';
import { useNational } from '../lib/useNational';
import { useIsMobile } from '../lib/useMediaQuery';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import MapPanel, { type ExploreMap } from './MapPanel';
import ScenePanel from './ScenePanel';
import ExplorePanel from './ExplorePanel';
import MethodPanel from './MethodPanel';
import ScrollCue from './ScrollCue';
import AvisoPopover from './AvisoPopover';
import Nav from './Nav';
import ChapterTransition from './ChapterTransition';
import styles from './Experience.module.css';

const NO_PROVINCES: string[] = [];
const NO_GEO: any[] = [];
const NO_HI: string[] = [];

/** Horizontal swipe on the stage: at least this far, and clearly more horizontal than vertical. */
const SWIPE_MIN = 64;
const SWIPE_RATIO = 1.5;

const slideName = (i: number) => {
  const s = SLIDES[i];
  return s.type === 'event' ? s.ev.region : s.name;
};

/** Wires the router (screen, year, province, comparison) and the sidebar reading progress (p) to the panels. */
export default function Experience() {
  const [geo, setGeo] = useState<any[]>(NO_GEO);
  // undefined until the outlines are known: the router then keeps `p` as given and validates it once they load
  const provinces = useMemo(() => (geo === NO_GEO ? undefined : geo.map((f) => f.properties.name as string)), [geo]);
  const { route, ready, setSlide, go, update } = useHashRoute(SLIDES.length, provinces);
  const routeRef = useRef(route);
  routeRef.current = route;
  const sideRef = useRef<HTMLElement>(null);
  const read = useReadProgress(sideRef, route.slide);
  const slide = SLIDES[route.slide];
  const isEvent = slide.type === 'event';
  const isMobile = useIsMobile();
  const { nat, failed } = useNational(ready && !isEvent); // not before the address is read: a deep link to a fire must not fetch the national data

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

  /* ---------- swipe between chapters (touch, on the stage only) ---------- */
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    // on the grid map a drag is not a chapter change (a tap there selects a province)
    const onMap = !isEvent && (e.target as HTMLElement).tagName === 'CANVAS';
    touch.current = e.touches.length === 1 && !onMap ? { x: t.clientX, y: t.clientY, ok: true } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const st = touch.current;
    touch.current = null;
    if (!st || !st.ok || e.touches.length) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - st.x, dy = t.clientY - st.y;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > SWIPE_RATIO * Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  /* ---------- explore state lives in the address (legacy format) ---------- */
  const year = routeYear(route);
  const cmp = route.c;
  const prov = slide.type === 'intro' ? route.p : null;

  const onYear = useCallback((y: number) => update({ y, c: null }), [update]);
  const onCompare = useCallback(
    (c: Compare | null) => update({ c, y: c ? c.b : routeYear(routeRef.current) }),
    [update],
  );
  const onProv = useCallback((p: string | null) => update({ p }), [update]);
  const onPeriod = useCallback((m: string | null) => update({ m }), [update]);
  // clicking a province on the map opens the explore screen on it (legacy selectProv)
  const onSelect = useCallback((p: string) => update({ p, slide: 0 }), [update]);

  const kind = slide.type === 'method' ? 'all' : cmp ? 'cmp' : 'year';
  const view = useMemo(() => {
    if (!nat || isEvent) return null;
    const spec: ViewSpec = kind === 'all' ? { kind: 'all' } : kind === 'cmp' ? { kind: 'cmp', cmp: cmp! } : { kind: 'year', year };
    return buildView(nat, spec);
    // cmp and year are compared by value so a new route object does not rebuild the view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nat, isEvent, kind, year, cmp?.a, cmp?.b, cmp?.view]);
  const hi = useMemo(() => (prov ? [prov] : NO_HI), [prov]);

  const explore: ExploreMap | null = isEvent
    ? null
    : { kind, year, cmp, nat, view, hi, onSelect };

  const panel =
    slide.type === 'intro' ? (
      <ExplorePanel
        nat={nat} failed={failed} provinces={provinces ?? NO_PROVINCES}
        year={year} cmp={cmp} prov={prov} period={route.m} onPeriod={onPeriod}
        onYear={onYear} onCompare={onCompare} onProv={onProv}
      />
    ) : slide.type === 'method' ? (
      <MethodPanel />
    ) : null;

  return (
    <div className={styles.app}>
      <TopBar index={route.slide} count={SLIDES.length} name={slide.name} />
      <main className={styles.panels}>
        <Sidebar
          ref={sideRef}
          index={route.slide}
          slide={slide}
          s={s}
          stage={stage}
          nextName={route.slide < SLIDES.length - 1 ? slideName(route.slide + 1) : null}
          onNext={next}
          year={slide.type === 'intro' ? year : null}
          onPickYear={onYear}
          inline={isMobile ? panel : null}
        />
        <div
          className={isEvent ? styles.stage : `${styles.stage} ${styles.stageMap}`}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={() => { touch.current = null; }}
        >
          <MapPanel p={read.p} slide={slide} geo={geo} explore={explore} />
          {isEvent ? (
            <ScenePanel s={s} stage={stage} slide={slide} />
          ) : (
            !isMobile && <section className={styles.panelCol} aria-label="Exploración">{panel}</section>
          )}
        </div>
        <div className={styles.avisoSlot}><AvisoPopover /></div>
        <ScrollCue hidden={!isEvent || read.p > 0.01} />
        <ChapterTransition index={route.slide} />
        <Nav index={route.slide} slides={SLIDES} onGo={setSlide} onStep={go} />
      </main>
      <p className="sr-only" aria-live="polite">
        {`Pantalla ${route.slide + 1} de ${SLIDES.length}: ${slideName(route.slide)}`}
      </p>
    </div>
  );
}
