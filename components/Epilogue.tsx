'use client';
import { useEffect, useRef } from 'react';
import { subscribe } from '../lib/scrollDriver';
import SourcesLink from './SourcesLink';
import styles from './Epilogue.module.css';

/**
 * Epilogue, read on the closed clouds (the shader keeps a flat bright column behind it). It fades out
 * before the clouds turn to smoke. Figures come from the project's own processing of NASA FIRMS data
 * (public/data/meta.json and semanas-<id>.json).
 */
export default function Epilogue() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => subscribe(({ st }) => {
    if (ref.current) ref.current.style.opacity = st.epi.toFixed(3);
  }), []);

  return (
    <article ref={ref} className={styles.epi} aria-labelledby="epi-h">
      <h2 id="epi-h" className={styles.title}>Lo que queda en el mapa</h2>
      <p className={styles.summary}>
        Bajamos de Misiones a Chubut por seis incendios, entre 2020 y 2026. En cada uno, el mapa mostró semana a
        semana los focos de calor que vio el satélite. Las hectáreas y las causas las cuentan las fuentes: oficinas
        de gobierno, una empresa y diarios. En tres casos las fuentes no coinciden, y por eso mostramos las dos.
      </p>

      <ul className={styles.figures}>
        <li>
          <b>2.620.568</b>
          <span>focos de calor en Argentina entre 2012 y 2026</span>
        </li>
        <li>
          <b>400.892</b>
          <span>focos en 2020, el año con más focos</span>
        </li>
        <li>
          <b>200.741</b>
          <span>focos durante los seis incendios del recorrido</span>
        </li>
      </ul>
      <p className={styles.source}>Según los datos de NASA FIRMS (satélite VIIRS S-NPP) que procesamos para este trabajo.</p>

      <p className={styles.limits}>
        Un foco de calor no es una hectárea quemada ni un incendio forestal: también aparecen quemas en el campo, y a
        veces el satélite se equivoca.
      </p>

      <div className={styles.actions}>
        <SourcesLink className={styles.primary} label="Ver las fuentes" />
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
          }}
        >
          Volver al inicio
        </button>
      </div>
    </article>
  );
}
