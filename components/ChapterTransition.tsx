'use client';
import { useEffect, useRef, useState } from 'react';
import FireShaderCanvas from './FireShaderCanvas';
import styles from './ChapterTransition.module.css';

/**
 * ChapterTransition: Realistic procedural WebGL fire sweep transition between stories.
 * Renders an organic roaring wall of fire with turbulence, incandescent core, flying embers,
 * and licking border flames computed directly on the GPU at 60 fps via WebGL.
 *
 * Direction:
 * - Forward (index > prev): Left to Right
 * - Backward (index < prev): Right to Left
 *
 * Falls back to accessible crossfade on prefers-reduced-motion.
 */
export default function ChapterTransition({ index }: { index: number }) {
  const flashRef = useRef<HTMLDivElement>(null);
  const prev = useRef<number | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [active, setActive] = useState(false);
  const [shaderActive, setShaderActive] = useState(false);

  useEffect(() => {
    // Skip on first mount (so page load doesn't trigger a fire transition)
    if (prev.current === null) {
      prev.current = index;
      return;
    }

    if (prev.current === index) return;

    const isForward = index > prev.current;
    prev.current = index;
    setDirection(isForward ? 'forward' : 'backward');

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setActive(true);

    if (prefersReduced) {
      const flash = flashRef.current;
      if (flash && typeof flash.animate === 'function') {
        const a = flash.animate(
          [{ opacity: 0 }, { opacity: 0.6, offset: 0.4 }, { opacity: 0 }],
          { duration: 250, easing: 'ease-out' }
        );
        a.onfinish = () => setActive(false);
      } else {
        setActive(false);
      }
      return;
    }

    setShaderActive(true);

    // Complementary ambient thermal flash across the viewport
    const flash = flashRef.current;
    if (flash && typeof flash.animate === 'function') {
      flash.animate(
        [
          { opacity: 0 },
          { opacity: 0.85, offset: 0.45 },
          { opacity: 0.5, offset: 0.7 },
          { opacity: 0 }
        ],
        { duration: 820, easing: 'ease-out' }
      );
    }
  }, [index]);

  const handleFinish = () => {
    setShaderActive(false);
    setActive(false);
  };

  if (!active && !shaderActive) return null;

  return (
    <div className={`${styles.wrap} ${styles.active}`} aria-hidden="true">
      <div ref={flashRef} className={styles.heatFlash} />
      {shaderActive && (
        <FireShaderCanvas
          key={`${index}-${direction}`}
          direction={direction}
          duration={850}
          onFinish={handleFinish}
        />
      )}
    </div>
  );
}
