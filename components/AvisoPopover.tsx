'use client';
import { useEffect, useState } from 'react';
import styles from './AvisoPopover.module.css';

const SEEN_KEY = 'aviso-metodologico-visto';

/** Capsule with the methodological notice. Opens by itself the first time, then only on click; Esc closes. */
export default function AvisoPopover() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        setOpen(true);
        localStorage.setItem(SEEN_KEY, '1');
      }
    } catch { /* storage blocked: stay closed */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={styles.wrap}>
      <button
        className={styles.capsule}
        aria-expanded={open}
        aria-controls="aviso-texto"
        onClick={() => setOpen((o) => !o)}
      >
        Focos de calor ≠ hectáreas quemadas · Escena esquemática
      </button>
      {open && (
        <div id="aviso-texto" className={styles.popover} role="note">
          <p>
            Cada punto del mapa es un <b>foco de calor</b> detectado por satélite (VIIRS, 375 m): no es una hectárea
            quemada ni necesariamente un incendio forestal, e incluye quemas agrícolas y de pastizal. La ilustración
            muestra de forma esquemática cómo suele empezar y combatirse un incendio de este tipo, con los medios que
            nombran las fuentes; no reproduce el lugar ni los hechos exactos.
          </p>
          <button className={styles.close} onClick={() => setOpen(false)}>
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
