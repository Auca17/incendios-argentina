'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Slide } from '../lib/slides';
import { loadFoci, type Foci } from '../lib/data';
import { FireMap } from '../lib/firemap';
import { fociWeek, fmt, weekDate } from '../lib/fire';
import { useReducedMotion } from '../lib/motion';
import styles from './MapPanel.module.css';

type Props = { p: number; slide: Slide; geo: any[] };
type Loaded = { id: string; foci: Foci } | { id: string; error: true };

/** Canvas map. Fire chapters: the province, weekly foci accumulating with p, origin marker and the readout. */
export default function MapPanel({ p, slide, geo }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const map = useRef<FireMap | null>(null);
  const readoutEl = useRef<HTMLParagraphElement>(null);
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

  /* keep the province clear of the readout: the camera fits above it (tallest height seen, so it never jitters) */
  useEffect(() => {
    const el = readoutEl.current, cv = canvas.current;
    if (!ev || !el || !cv) { map.current?.setInset(0, 0); return; }
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
  }, [ev]);

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
    map.current?.setScene({ provs: ev ? ev.provs : [], marker: ev ? ev.marker : null, foci });
  }, [ev, foci]);

  useEffect(() => { map.current?.setWeek(week); }, [week]);

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
            : 'Mapa de Argentina con los límites provinciales.'
        }
      />
      {readout && (
        <p ref={readoutEl} className={styles.readout} data-readout aria-live="off">
          {readout}
        </p>
      )}
    </section>
  );
}
