'use client';
import { useEffect, useRef } from 'react';
import { subscribe } from '../lib/scrollDriver';
import { DESKTOP, GUTTER, podWidth } from '../lib/tourLayout';
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
    const mobile = vw < DESKTOP;
    const width = mobile ? vw - 2 * 16 : podWidth(vw);
    const d = st.titleDock * st.titleDock * (3 - 2 * st.titleDock); // eased
    const s0 = mobile ? 1.05 : 1.45; // scale in the middle of the cover
    const cx = (vw - width * s0) / 2, cy = vh * (mobile ? 0.3 : 0.34);
    const dx = mobile ? 16 : GUTTER, dy = mobile ? vh * 0.44 + 24 : 72;
    const s = s0 + (1 - s0) * d;
    el.style.width = width + 'px';
    el.style.transform = `translate(${(cx + (dx - cx) * d).toFixed(1)}px, ${(cy + (dy - cy) * d).toFixed(1)}px) scale(${s.toFixed(4)})`;
    el.style.opacity = st.title.toFixed(3);
    el.style.visibility = st.title > 0 ? 'visible' : 'hidden';
    el.dataset.dock = d > 0.5 ? '1' : '0';
  }), []);

  return (
    <div ref={ref} className={styles.title} style={{ opacity: 1 }}>
      <h1 className={styles.h1}>Lo que el fuego se llevó</h1>
      <p className={styles.sub}>6 historias · 2012–2026</p>
    </div>
  );
}
