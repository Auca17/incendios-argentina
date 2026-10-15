'use client';
import { useEffect, useRef, useState } from 'react';
import FireShaderCanvas from './FireShaderCanvas';
import styles from './ChapterTransition.module.css';

/**
 * ChapterTransition: Realistic procedural WebGL fire sweep transition between stories.
 * Renders an organic roaring wall of fire with turbulence, incandescent core, flying embers,
 * and licking border flames computed directly on the GPU at 60 fps via WebGL.
 * Falls back to accessible crossfade on prefers-reduced-motion.
 */
export default function ChapterTransition({ index }: { index: number }) {
  const flashRef = useRef<HTMLDivElement>(null);
  const prev = useRef(index);
  const [active, setActive] = useState(false);
  const [shaderActive, setShaderActive] = useState(false);

  useEffect(() => {
    if (prev.current === index) return;
    prev.current = index;

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

    // Complementary ambient heat glow in the background
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
      {shaderActive && <FireShaderCanvas onFinish={handleFinish} duration={820} />}
    </div>
  );
}
