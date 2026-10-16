'use client';
import { useEffect, useRef, useState } from 'react';
import FireCurtain from './FireCurtain';
import styles from './ChapterTransition.module.css';

interface ChapterTransitionProps {
  index: number;
}

/**
 * ChapterTransition: Consistent, high-fidelity fire sweep transition across all chapter jumps.
 * Sweeps with a uniform, polished speed (520ms) and an opaque apex veil that completely
 * conceals background map/DOM switching.
 */
export default function ChapterTransition({ index }: ChapterTransitionProps) {
  const prev = useRef<number | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Skip on first mount (so initial page load doesn't trigger a fire transition)
    if (prev.current === null) {
      prev.current = index;
      return;
    }

    if (prev.current === index) return;

    const prevIndex = prev.current;
    const isForward = index > prevIndex;
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
        duration={520}
        onFinish={handleFinish}
      />
    </div>
  );
}
