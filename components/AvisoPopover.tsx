'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './AvisoPopover.module.css';

/** Capsule with the methodological notice. Never opens by itself: click toggles, Esc and outside click close. */
export default function AvisoPopover() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={wrap}>
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
