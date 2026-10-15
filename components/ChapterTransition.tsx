'use client';
import { useEffect, useRef, useState } from 'react';
import FireCurtain from './FireCurtain';
import styles from './ChapterTransition.module.css';

interface ChapterTransitionProps {
  index: number;
}

/**
 * ChapterTransition: Cinematic bidirectional fire sweep transition between stories.
 * Renders an impossible-to-miss, roaring procedural flame wall with aerodynamic licking tongues,
 * flying incandescent embers, and a sweeping thermal wave directly across the entire viewport.
 *
 * Direction:
 * - Forward (index > prev): sweeps Left-to-Right
 * - Backward (index < prev): sweeps Right-to-Left
 */
export default function ChapterTransition({ index }: ChapterTransitionProps) {
  const prev = useRef<number | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Skip on first mount (so page load doesn't trigger an initial transition)
    if (prev.current === null) {
      prev.current = index;
      return;
    }

    if (prev.current === index) return;

    const isForward = index > prev.current;
    prev.current = index;
    setDirection(isForward ? 'forward' : 'backward');
    setActive(true);
  }, [index]);

  const handleFinish = () => {
    setActive(false);
  };

  if (!active) return null;

  return (
    <div className={styles.wrap} aria-hidden="true">
      <FireCurtain
        key={`fire-${index}-${direction}`}
        direction={direction}
        duration={850}
        onFinish={handleFinish}
      />
    </div>
  );
}
