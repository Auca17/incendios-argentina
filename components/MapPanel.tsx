'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Slide } from '../lib/slides';
import { loadFoci, type Foci } from '../lib/data';
import { FireMap, type Hit } from '../lib/firemap';
import { fociWeek, fmt, weekDate } from '../lib/fire';
import meta from '../lib/meta';
import { degLabel, provYear, signed, totalYear, yearNote, type GridView, type National } from '../lib/explore';
import type { Compare } from '../lib/router';
import { useReducedMotion } from '../lib/motion';
import styles from './MapPanel.module.css';

/** Home / method: what the grid map shows and how it reacts to the pointer. */
export type ExploreMap = {
  kind: 'year' | 'cmp' | 'all';
  year: number;
  cmp: Compare | null;
  nat: National | null;
  view: GridView | null;
  hi: string[];
  onSelect: (name: string) => void;
};

type Props = { p: number; slide: Slide; geo: any[]; explore: ExploreMap | null };
type Loaded = { id: string; foci: Foci } | { id: string; error: true };

const NO_HI: string[] = [];

/** Canvas map. Fire chapters: the province, weekly foci accumulating with p, origin marker and the readout. Home and method: the national grid. */
export default function MapPanel({ p, slide, geo, explore }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const map = useRef<FireMap | null>(null);
  const readoutEl = useRef<HTMLParagraphElement>(null);
  const badgeEl = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const ev = slide.type === 'event' ? slide.ev : null;

  /* canvas lifecycle: size (ResizeObserver) and on-screen state */
  useEffect(() => {
    const cv = canvas.current!;
    const m = new FireMap(cv, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    map.current = m;
    m.resize();
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(cv);
    const io = new IntersectionObserver((es) => m.setVisible(es[es.length - 1].isIntersecting));
    io.observe(cv);
    return () => { ro.disconnect(); io.disconnect(); m.destroy(); map.current = null; };
  }, []);

  useEffect(() => { map.current?.setReduced(reduced); }, [reduced]);

  /* keep the map clear of the readout (fire chapters) or the year badge (grid): the camera fits above it
     (tallest height seen, so it never jitters) */
  const gridOn = !!explore;
  useEffect(() => {
    const el = ev ? readoutEl.current : badgeEl.current, cv = canvas.current;
    if (!el || !cv) { map.current?.setInset(0, 0); return; }
    let tallest = 0;
    const measure = () => {
      const r = el.getBoundingClientRect(), c = cv.getBoundingClientRect();
      tallest = Math.max(tallest, c.bottom - r.top + 8);
      map.current?.setInset(0, Math.round(tallest));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el); ro.observe(cv);
    return () => ro.disconnect();
  }, [ev, gridOn]);

  /* weekly foci of the current fire, loaded on demand */
  useEffect(() => {
    if (!ev) { setLoaded(null); return; }
    let live = true;
    setLoaded((prev) => (prev && prev.id === ev.id ? prev : null));
    loadFoci(ev.id).then(
      (foci) => { if (live) setLoaded({ id: ev.id, foci }); },
      () => { if (live) setLoaded({ id: ev.id, error: true }); },
    );
    return () => { live = false; };
  }, [ev]);

  const foci = ev && loaded && loaded.id === ev.id && 'foci' in loaded ? loaded.foci : null;
  const failed = !!(ev && loaded && loaded.id === ev.id && 'error' in loaded);
  const week = foci ? fociWeek(foci, p) : 0;

  useEffect(() => { if (geo.length) map.current?.setGeo(geo); }, [geo]);

  useEffect(() => {
    if (ev) map.current?.setScene({ provs: ev.provs, marker: ev.marker, foci });
  }, [ev, foci]);

  /* national grid (home, method); the camera returns to the whole country */
  const view = explore ? explore.view : null;
  const hi = explore ? explore.hi : NO_HI;
  useEffect(() => {
    if (!ev) map.current?.setGrid(view, hi);
  }, [ev, view, hi]);

  useEffect(() => { map.current?.setWeek(week); }, [week]);

  /* ---------- pointer: tooltip per cell, province hover and click (grid mode) ---------- */
  const tipEl = useRef<HTMLDivElement>(null);
  const tipKey = useRef('');
  const last = useRef({ x: 0, y: 0 });
  const [tip, setTip] = useState<Hit | null>(null);

  const placeTip = useCallback(() => {
    const el = tipEl.current, cv = canvas.current;
    if (!el || !cv) return;
    const { x, y } = last.current;
    el.style.left = Math.max(6, Math.min(cv.clientWidth - el.offsetWidth - 6, x + 14)) + 'px';
    el.style.top = Math.max(6, y - el.offsetHeight - 12) + 'px';
  }, []);
  useLayoutEffect(placeTip, [tip, placeTip]);

  const hide = useCallback(() => {
    tipKey.current = '';
    setTip(null);
    map.current?.setHover(null);
  }, []);

  useEffect(() => { if (!gridOn) hide(); }, [gridOn, hide]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const m = map.current;
    if (!m) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const h = m.hit(x, y);
    last.current = { x, y };
    m.setHover(h ? h.prov : null);
    e.currentTarget.style.cursor = h && h.prov ? 'pointer' : 'default';
    if (!h || (!h.prov && !h.value)) { if (tipKey.current) hide(); return; }
    const key = (h.prov || '') + '|' + h.key;
    if (key !== tipKey.current) { tipKey.current = key; setTip(h); } else placeTip();
  };

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const m = map.current;
    if (!explore || !m) return;
    const r = e.currentTarget.getBoundingClientRect();
    const h = m.hit(e.clientX - r.left, e.clientY - r.top);
    if (h && h.prov) explore.onSelect(h.prov);
  };

  const readout = useMemo(() => {
    if (!ev) return null;
    if (failed) return <>No se pudieron cargar los focos de calor de este incendio.</>;
    if (!foci) return <>Cargando los focos de calor de este incendio…</>;
    return (
      <>
        <span className={styles.key}>
          <span>semanas anteriores</span>
          <i aria-hidden="true" />
          <span>última semana</span>
        </span>
        <span className={styles.where}>Focos de calor en {ev.months.prov.join(' + ')} · </span>
        semana {week} de {foci.weeks} · <b>{fmt(foci.cum[week])} focos</b> · hasta el {weekDate(foci, week)}
      </>
    );
  }, [ev, foci, failed, week]);

  return (
    <section className={styles.map} aria-label="Mapa">
      <canvas
        ref={canvas}
        className={styles.canvas}
        role="img"
        aria-label={
          ev
            ? `Mapa de ${ev.provs.join(' y ')} con los focos de calor detectados por satélite semana a semana.`
            : 'Mapa de Argentina con focos de calor por celda. Para analizar una provincia con teclado, usá el ranking.'
        }
        onMouseMove={explore ? onMove : undefined}
        onMouseLeave={explore ? hide : undefined}
        onClick={explore ? onClick : undefined}
      />
      {explore && <Badge explore={explore} innerRef={badgeEl} />}
      {explore && tip && (
        <div ref={tipEl} className={styles.tip} role="tooltip">
          <TipBody h={tip} explore={explore} />
        </div>
      )}
      {readout && (
        <p ref={readoutEl} className={styles.readout} data-readout aria-live="off">
          {readout}
        </p>
      )}
    </section>
  );
}

/** Big translucent year (or pair of years) with its count, bottom-left of the map. */
function Badge({ explore, innerRef }: { explore: ExploreMap; innerRef: React.Ref<HTMLParagraphElement> }) {
  const { kind, year, cmp } = explore;
  if (kind === 'all') return <p ref={innerRef} className={styles.badge} data-badge>2012–2026<small>focos acumulados</small></p>;
  if (kind === 'cmp' && cmp) {
    const what = { a: `mostrando ${cmp.a}`, b: `mostrando ${cmp.b}`, d: `diferencia de focos, ${cmp.b} − ${cmp.a}` }[cmp.view];
    return <p ref={innerRef} className={`${styles.badge} ${styles.badgeCmp}`} data-badge>{cmp.a}→{cmp.b}<small>{what}</small></p>;
  }
  return (
    <p ref={innerRef} className={styles.badge} data-badge>
      {year}
      <small>{fmt(totalYear(meta, year))} focos de calor{yearNote(year)}</small>
    </p>
  );
}

function CmpTip({ h, cmp, nat, where }: { h: Hit; cmp: Compare; nat: National | null; where: string }) {
  const v = typeof h.value === 'object' && h.value ? h.value : { a: 0, b: 0 };
  const d = v.b - v.a;
  return (
    <>
      {h.prov && nat && <span>{fmt(provYear(nat.pm, h.prov, cmp.a))} focos en {cmp.a} · {fmt(provYear(nat.pm, h.prov, cmp.b))} en {cmp.b}</span>}
      <span className={styles.cell}>{where}: <b>{fmt(v.a)}</b> en {cmp.a}, <b>{fmt(v.b)}</b> en {cmp.b} ({signed(d)}{fmt(Math.abs(d))})</span>
    </>
  );
}

function CountTip({ h, explore, where }: { h: Hit; explore: ExploreMap; where: string }) {
  const n = typeof h.value === 'number' ? h.value : 0;
  const { kind, year, nat } = explore;
  return (
    <>
      {h.prov && kind !== 'all' && nat && <span>{fmt(provYear(nat.pm, h.prov, year))} focos en {year}</span>}
      <span className={styles.cell}>{where}: <b>{fmt(n)}</b> {n === 1 ? 'foco' : 'focos'} ({kind === 'all' ? '2012–2026' : String(year)})</span>
    </>
  );
}

/** Tooltip text (legacy showTip): province totals for the period and the foci in the 0,25 degree cell. */
function TipBody({ h, explore }: { h: Hit; explore: ExploreMap }) {
  const where = `Celda de 0,25° (unos 25 km) en ${degLabel(h.clat, 'N', 'S')}, ${degLabel(h.clon, 'E', 'O')}`;
  return (
    <>
      <b>{h.prov ? h.prov : 'Fuera del territorio argentino'}</b>
      {explore.kind === 'cmp' && explore.cmp
        ? <CmpTip h={h} cmp={explore.cmp} nat={explore.nat} where={where} />
        : <CountTip h={h} explore={explore} where={where} />}
      {h.prov && <span className={styles.hint}>Click para analizar la provincia</span>}
    </>
  );
}
