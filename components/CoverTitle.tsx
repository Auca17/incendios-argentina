'use client';
import { useEffect, useRef } from 'react';
import { subscribe } from '../lib/scrollDriver';
import { titleBox } from '../lib/tourLayout';
import styles from './CoverTitle.module.css';

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
  }), []);

  return (
    <div ref={ref} className={styles.title} style={{ opacity: 1 }}>
      <h1 className={styles.h1}>Lo que el fuego se llevó</h1>
      <p className={styles.sub}>Seis incendios, de la selva a la Patagonia</p>
    </div>
  );
}
