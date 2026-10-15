'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './ChapterTransition.module.css';

/**
 * Chapter transition: an extinguishing water wave that sweeps across the screen,
 * simulating an aerial drop / water line quenching the fire with cooling mist and steam.
 * Strictly GPU-accelerated (transform & opacity only), pointer-events: none,
 * and falls back to a brief gentle fade when prefers-reduced-motion is active.
 */
export default function ChapterTransition({ index }: { index: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const mistRef = useRef<HTMLDivElement>(null);
  const prev = useRef(index);
  const anims = useRef<Animation[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (prev.current === index) return;
    prev.current = index;

    // Cancel any previous running animation immediately
    anims.current.forEach((a) => a.cancel());
    anims.current = [];

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const veil = veilRef.current;
    const wave = waveRef.current;
    const mist = mistRef.current;

    setActive(true);

    if (prefersReduced) {
      if (veil && typeof veil.animate === 'function') {
        const a = veil.animate(
          [{ opacity: 0 }, { opacity: 0.8, offset: 0.4 }, { opacity: 0 }],
          { duration: 220, easing: 'ease-out' }
        );
        a.onfinish = () => setActive(false);
        anims.current.push(a);
      } else {
        setActive(false);
      }
      return;
    }

    const DURATION = 680;
    const EASING = 'cubic-bezier(0.25, 1, 0.4, 1)';

    if (veil && typeof veil.animate === 'function') {
      const aVeil = veil.animate(
        [
          { opacity: 0 },
          { opacity: 0.85, offset: 0.35 },
          { opacity: 0.65, offset: 0.6 },
          { opacity: 0 }
        ],
        { duration: DURATION, easing: 'ease-out' }
      );
      anims.current.push(aVeil);
    }

    if (wave && typeof wave.animate === 'function') {
      const aWave = wave.animate(
        [
          { transform: 'translate3d(-100%, 0, 0) skewX(-14deg) scaleX(0.8)', opacity: 0 },
          { transform: 'translate3d(60%, 0, 0) skewX(-10deg) scaleX(1.3)', opacity: 0.95, offset: 0.3 },
          { transform: 'translate3d(240%, 0, 0) skewX(-6deg) scaleX(1.7)', opacity: 0.75, offset: 0.6 },
          { transform: 'translate3d(400%, 0, 0) skewX(0deg) scaleX(2.0)', opacity: 0 }
        ],
        { duration: DURATION, easing: EASING }
      );
      anims.current.push(aWave);
    }

    if (mist && typeof mist.animate === 'function') {
      const aMist = mist.animate(
        [
          { opacity: 0, transform: 'scale(0.96) translate3d(0, 4px, 0)' },
          { opacity: 0.2, offset: 0.2 },
          { opacity: 0.7, transform: 'scale(1.02) translate3d(0, -4px, 0)', offset: 0.5 },
          { opacity: 0, transform: 'scale(1.08) translate3d(0, -12px, 0)' }
        ],
        { duration: DURATION, easing: 'ease-out' }
      );
      aMist.onfinish = () => setActive(false);
      anims.current.push(aMist);
    } else {
      setTimeout(() => setActive(false), DURATION);
    }
  }, [index]);

  useEffect(() => () => {
    anims.current.forEach((a) => a.cancel());
    anims.current = [];
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`${styles.wrap} ${active ? styles.active : ''}`}
      aria-hidden="true"
    >
      <div ref={veilRef} className={styles.veil} />
      <div ref={waveRef} className={styles.wave} />
      <div ref={mistRef} className={styles.mist} />
    </div>
  );
}
