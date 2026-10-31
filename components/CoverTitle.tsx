'use client';
import { useEffect, useRef, useState } from 'react';
import { subscribe } from '../lib/scrollDriver';
import { loadProvinciaMes } from '../lib/data';
import { setHomeProvince, useHomeProvince } from '../lib/homeProvince';
import { titleBox } from '../lib/tourLayout';
import styles from './CoverTitle.module.css';

/**
 * The reader's province, asked once and optionally under the note: the epilogue then opens its
 * clearing on it (lib/homeProvince.ts). Nothing else in the story changes with it.
 */
function CoverHome() {
  const home = useHomeProvince();
  const [provinces, setProvinces] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    loadProvinciaMes().then((pm: Record<string, unknown>) => {
      if (live) setProvinces(Object.keys(pm).sort((a, b) => a.localeCompare(b, 'es')));
    }, () => {});
    return () => { live = false; };
  }, []);
  if (!provinces.length) return null;
  return (
    <div className={styles.home} data-home="">
      <label className={styles.homeAsk}>
        <span>¿De dónde sos?</span>
        <select value={home} onChange={(e) => setHomeProvince(e.target.value)}>
          <option value="">Elegí tu provincia</option>
          {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <p className={styles.homeHint} aria-live="polite">
        {home ? `Al final vas a ver los focos de ${home}.` : 'Opcional: al final te mostramos los focos de tu provincia.'}
      </p>
    </div>
  );
}

/**
 * Title of the cover, black on the white clouds. It starts large in the middle of the viewport and a
 * short scroll moves it to the reading column (the static cloud bank), then it fades before the first
 * story. Position, size and opacity are a pure function of the scroll state (no render per frame).
 */
export default function CoverTitle() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => subscribe(({ st, vw, vh }) => {
    const el = ref.current;
    if (!el) return;
    const d = st.titleDock * st.titleDock * (3 - 2 * st.titleDock); // eased
    const b = titleBox(vw, vh, d);
    el.style.width = b.width + 'px';
    el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) scale(${b.scale.toFixed(4)})`;
    el.style.opacity = st.title.toFixed(3);
    el.style.visibility = st.title > 0 ? 'visible' : 'hidden';
    el.dataset.dock = d > 0.5 ? '1' : '0';
    // what a focus is, read beside the map before its first points appear: only once the title has docked
    el.style.setProperty('--note', Math.max(0, (d - 0.6) / 0.4).toFixed(3));
    // the province question takes clicks and focus only while it is in view
    const ask = el.querySelector<HTMLElement>('[data-home]');
    const on = d > 0.9 && st.title > 0.5;
    if (ask && ask.inert === on) ask.inert = !on;
  }), []);

  return (
    <div ref={ref} className={styles.title} style={{ opacity: 1 }}>
      <h1 className={styles.h1}>Lo que el fuego se llevó</h1>
      <p className={styles.sub}>Seis incendios, de la selva a la Patagonia</p>
      <p className={styles.note}>
        <b>Qué es un foco</b>
        Los puntos que vas a ver en el mapa son focos: lugares calientes que un satélite de la NASA detecta desde el
        espacio. Pueden ser un incendio, una quema en el campo o un error del sensor. Un mismo incendio puede sumar
        muchos focos.
      </p>
      <CoverHome />
    </div>
  );
}
