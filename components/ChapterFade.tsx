'use client';
import { useEffect, useRef } from 'react';
import styles from './ChapterFade.module.css';

/**
 * A short opacity fade over the panels when the chapter changes. A flame curtain was tried and dropped:
 * at 4x CPU throttling the chapter swap already stutters, so a moving curtain read as choppy.
 * Only opacity is animated, on a pointer-events:none layer; a new change cancels the running fade.
 */
export default function ChapterFade({ index }: { index: number }) {
  const layer = useRef<HTMLDivElement>(null);
  const prev = useRef(index);
  const anim = useRef<Animation | null>(null);

  useEffect(() => {
    if (prev.current === index) return;
    prev.current = index;
    anim.current?.cancel();
    const el = layer.current;
    if (!el || typeof el.animate !== 'function') return;
    anim.current = el.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.4 }, { opacity: 0 }], { duration: 180, easing: 'linear' });
  }, [index]);

  useEffect(() => () => anim.current?.cancel(), []);

  return <div ref={layer} className={styles.fade} aria-hidden="true" />;
}
