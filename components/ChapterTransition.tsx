'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './ChapterTransition.module.css';

/**
 * ChapterTransition: Dramatic left-to-right fire wave transition between stories.
 * Renders a roaring incandescent wall of fire, thermal heat flash, bursting border flames,
 * and glowing embers that sweep across the viewport when switching chapters.
 * GPU-accelerated (composite properties only: transform & opacity), 60fps, pointer-events: none.
 */
export default function ChapterTransition({ index }: { index: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const fireWallRef = useRef<HTMLDivElement>(null);
  const flamesTopRef = useRef<HTMLDivElement>(null);
  const flamesBottomRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<HTMLDivElement>(null);
  const prev = useRef(index);
  const anims = useRef<Animation[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (prev.current === index) return;
    prev.current = index;

    // Cancel any previous animation
    anims.current.forEach((a) => a.cancel());
    anims.current = [];

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flash = flashRef.current;
    const fireWall = fireWallRef.current;
    const flamesTop = flamesTopRef.current;
    const flamesBottom = flamesBottomRef.current;
    const sparks = sparksRef.current;

    setActive(true);

    if (prefersReduced) {
      if (flash && typeof flash.animate === 'function') {
        const a = flash.animate(
          [{ opacity: 0 }, { opacity: 0.7, offset: 0.4 }, { opacity: 0 }],
          { duration: 250, easing: 'ease-out' }
        );
        a.onfinish = () => setActive(false);
        anims.current.push(a);
      } else {
        setActive(false);
      }
      return;
    }

    const DURATION = 760;
    const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

    // 1. Heat flash that fills the room with amber glow
    if (flash && typeof flash.animate === 'function') {
      const a = flash.animate(
        [
          { opacity: 0, transform: 'scale(0.95)' },
          { opacity: 0.95, transform: 'scale(1)', offset: 0.45 },
          { opacity: 0.7, offset: 0.7 },
          { opacity: 0, transform: 'scale(1.04)' }
        ],
        { duration: DURATION, easing: 'ease-out' }
      );
      anims.current.push(a);
    }

    // 2. Main roaring wall of fire sweeping from Left to Right
    if (fireWall && typeof fireWall.animate === 'function') {
      const a = fireWall.animate(
        [
          { transform: 'translate3d(0, 0, 0) skewX(-14deg)', opacity: 0.4 },
          { opacity: 1, offset: 0.2 },
          { opacity: 1, offset: 0.75 },
          { transform: 'translate3d(240vw, 0, 0) skewX(-8deg)', opacity: 0 }
        ],
        { duration: DURATION, easing: EASING }
      );
      a.onfinish = () => setActive(false);
      anims.current.push(a);
    } else {
      setTimeout(() => setActive(false), DURATION);
    }

    // 3. Border flames licking in from top and bottom edges
    if (flamesTop && typeof flamesTop.animate === 'function') {
      const aTop = flamesTop.animate(
        [
          { opacity: 0, transform: 'scaleY(0) translate3d(-30%, 0, 0)' },
          { opacity: 0.95, transform: 'scaleY(1.3) translate3d(20%, 0, 0)', offset: 0.45 },
          { opacity: 0.8, transform: 'scaleY(1) translate3d(60%, 0, 0)', offset: 0.7 },
          { opacity: 0, transform: 'scaleY(0) translate3d(120%, 0, 0)' }
        ],
        { duration: DURATION, easing: EASING }
      );
      anims.current.push(aTop);
    }

    if (flamesBottom && typeof flamesBottom.animate === 'function') {
      const aBot = flamesBottom.animate(
        [
          { opacity: 0, transform: 'scaleY(0) translate3d(-30%, 0, 0)' },
          { opacity: 0.95, transform: 'scaleY(1.3) translate3d(20%, 0, 0)', offset: 0.45 },
          { opacity: 0.8, transform: 'scaleY(1) translate3d(60%, 0, 0)', offset: 0.7 },
          { opacity: 0, transform: 'scaleY(0) translate3d(120%, 0, 0)' }
        ],
        { duration: DURATION, easing: EASING }
      );
      anims.current.push(aBot);
    }

    // 4. Ember sparks racing across
    if (sparks && typeof sparks.animate === 'function') {
      const aSparks = sparks.animate(
        [
          { opacity: 0, transform: 'translate3d(-20vw, 0, 0)' },
          { opacity: 1, offset: 0.3 },
          { opacity: 0.9, offset: 0.7 },
          { opacity: 0, transform: 'translate3d(180vw, -30px, 0)' }
        ],
        { duration: DURATION, easing: EASING }
      );
      anims.current.push(aSparks);
    }
  }, [index]);

  return (
    <div
      ref={wrapRef}
      className={`${styles.wrap} ${active ? styles.active : ''}`}
      aria-hidden="true"
    >
      <div ref={flashRef} className={styles.heatFlash} />
      <div ref={borderFlamesTopRef(flamesTopRef)} className={styles.borderFlamesTop} />
      <div ref={fireWallRef} className={styles.fireWall} />
      <div ref={borderFlamesBotRef(flamesBottomRef)} className={styles.borderFlamesBottom} />
      <div ref={sparksRef} className={styles.sparks}>
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className={styles.spark}
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function borderFlamesTopRef(r: React.RefObject<HTMLDivElement | null>) {
  return r;
}
function borderFlamesBotRef(r: React.RefObject<HTMLDivElement | null>) {
  return r;
}

// 20 precalculated fixed ember seed coordinates for fast render without hydration mismatch
const SPARKS = [
  { top: 12, left: 10, size: 5, opacity: 0.95 },
  { top: 24, left: 28, size: 3, opacity: 0.8 },
  { top: 38, left: 15, size: 6, opacity: 1 },
  { top: 48, left: 35, size: 4, opacity: 0.9 },
  { top: 62, left: 22, size: 7, opacity: 1 },
  { top: 74, left: 40, size: 3.5, opacity: 0.85 },
  { top: 85, left: 18, size: 5, opacity: 0.95 },
  { top: 18, left: 52, size: 4, opacity: 0.9 },
  { top: 32, left: 68, size: 6, opacity: 1 },
  { top: 44, left: 58, size: 3, opacity: 0.8 },
  { top: 56, left: 75, size: 5.5, opacity: 0.95 },
  { top: 70, left: 62, size: 4, opacity: 0.85 },
  { top: 82, left: 80, size: 6, opacity: 1 },
  { top: 28, left: 85, size: 3.5, opacity: 0.85 },
  { top: 50, left: 92, size: 5, opacity: 0.9 },
  { top: 65, left: 88, size: 4, opacity: 0.8 },
  { top: 15, left: 42, size: 6, opacity: 1 },
  { top: 90, left: 48, size: 4.5, opacity: 0.9 },
  { top: 35, left: 3, size: 5, opacity: 0.95 },
  { top: 78, left: 6, size: 3.5, opacity: 0.85 },
];
