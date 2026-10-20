'use client';
import { useEffect, useRef, useState } from 'react';
import { EVIDENCE, TOUR_EVENTS } from '../lib/tour';
import { takeReturnPoint } from '../lib/returnPoint';
import { subscribe } from '../lib/scrollDriver';
import styles from './SourcesSection.module.css';

type Card = { source: string; what: string[]; url: string };

/** One card per cited source of a fire: who says it, which figures or facts, and the link. */
function cardsFor(id: string): Card[] {
  const out: Card[] = [];
  for (const e of EVIDENCE[id]) {
    const c = out.find((x) => x.url === e.url);
    if (c) c.what.push(e.what);
    else out.push({ source: e.source, what: [e.what], url: e.url });
  }
  return out;
}

const DATA: Card[] = [
  {
    source: 'NASA FIRMS, satélite Suomi NPP (instrumento VIIRS, 375 m)',
    what: ['Focos de calor de Argentina del 20/01/2012 al 14/10/2026', 'Focos semana a semana de cada incendio'],
    url: 'https://firms.modaps.eosdis.nasa.gov/',
  },
  {
    source: 'Natural Earth (dominio público)',
    what: ['Relieve sombreado (Natural Earth II), en grises', 'Límites de países y provincias'],
    url: 'https://www.naturalearthdata.com/',
  },
];

/**
 * Sources, white on the smoke the clouds turn into: simple cards (source, what it gives, link). The
 * block fades in with the smoke, so no white text ever sits on white cloud.
 */
export default function SourcesSection() {
  const [back, setBack] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => subscribe(({ st }) => {
    const k = Math.min(1, Math.max(0, (st.smoke - 0.6) / 0.4));
    if (ref.current) ref.current.style.setProperty('--fade', k.toFixed(3));
  }), []);

  return (
    <section
      ref={ref}
      id="fuentes"
      className={styles.sources}
      tabIndex={-1}
      aria-labelledby="fuentes-h"
      onFocus={() => { const p = takeReturnPoint(); if (p !== null) setBack(p); }}
    >
      <div className={styles.inner}>
        <h2 id="fuentes-h" className={styles.h2}>Fuentes</h2>
        <p className={styles.lead}>De dónde sale cada dato del recorrido. Todos los enlaces abren la fuente original.</p>

        <h3 className={styles.h3}>Los datos del mapa</h3>
        <ul className={styles.cards}>
          {DATA.map((c) => <CardItem key={c.url} c={c} />)}
        </ul>

        <h3 className={styles.h3}>Las seis historias</h3>
        {TOUR_EVENTS.map((ev) => (
          <div key={ev.id} className={styles.group}>
            <h4 className={styles.h4}>{ev.region} <span>{ev.year}</span></h4>
            <ul className={styles.cards}>
              {cardsFor(ev.id).map((c) => <CardItem key={c.url} c={c} />)}
            </ul>
          </div>
        ))}

        <h3 className={styles.h3}>Para leer bien estos datos</h3>
        <ul className={`${styles.panel} ${styles.list}`}>
          <li>Un foco de calor es un punto caliente que vio el satélite. No es una hectárea quemada ni un incendio forestal: también aparecen quemas en el campo.</li>
          <li>Las hectáreas y las causas vienen de las fuentes de cada historia, no del satélite. Cuando dos fuentes no coinciden, mostramos las dos.</li>
          <li>Cada punto marca un lugar de unos 375 metros. Si hay nubes o humo, el satélite puede no ver un fuego; y a veces marca algo que no es fuego.</li>
          <li>El recorrido va de norte a sur, no por fecha.</li>
        </ul>

        <h3 className={styles.h3}>Cómo se armaron los datos</h3>
        <ol className={`${styles.panel} ${styles.list}`}>
          <li>Se descargaron de NASA FIRMS los focos del satélite Suomi NPP para Argentina, de 2012 a 2026.</li>
          <li>Se dejaron los focos de vegetación con confianza normal o alta.</li>
          <li>Cada foco se ubicó en su provincia con los límites de Natural Earth.</li>
          <li>Se contaron por provincia y mes, por año en una grilla, y semana a semana para cada incendio.</li>
        </ol>

        <button
          type="button"
          className={styles.back}
          onClick={() => {
            const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: back ?? 0, behavior: reduced ? 'auto' : 'smooth' });
            history.replaceState(null, '', location.pathname + location.search);
            setBack(null);
          }}
        >
          {back !== null ? '← Volver a donde estaba' : '↑ Volver al inicio'}
        </button>
      </div>
    </section>
  );
}

function CardItem({ c }: { c: Card }) {
  return (
    <li className={styles.card}>
      <p className={styles.cardSource}>{c.source}</p>
      <ul className={styles.cardWhat}>
        {c.what.map((w) => <li key={w}>{w}</li>)}
      </ul>
      <a className={styles.cardLink} href={c.url} target="_blank" rel="noopener noreferrer">
        Abrir la fuente<span className="sr-only"> ({c.source}, en una pestaña nueva)</span>
      </a>
    </li>
  );
}
