'use client';
import { useEffect, useRef, useState } from 'react';
import FireCurtain from './FireCurtain';
import styles from './ChapterTransition.module.css';

interface ChapterTransitionProps {
  index: number;
}

/**
 * ChapterTransition: Hierarchical fire sweep transition between stories.
 *
 * - Heroic Mode (850ms, 100% opaque central occlusion):
 *   Triggered when entering stories from Portada (0 -> 1) and when concluding to the methodology closure (6 -> 7).
 *   At its apex, it creates an opaque solid wall of fire and dense smoke so the background slide change is 100% hidden.
 *
 * - Agile Mode (380ms, sleek, no full blackout):
 *   Between intermediate stories (1 -> 2 -> 3 -> 4 -> 5 -> 6) to prevent visual fatigue while keeping the directional
 *   sweep (LTR forward, RTL backward).
 */
export default function ChapterTransition({ index }: ChapterTransitionProps) {
  const prev = useRef<number | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [mode, setMode] = useState<'heroic' | 'agile'>('heroic');
  const [duration, setDuration] = useState(850);
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Skip on first mount (so page load doesn't trigger an initial transition)
    if (prev.current === null) {
      prev.current = index;
      return;
    }

    if (prev.current === index) return;

    const prevIndex = prev.current;
    const isForward = index > prevIndex;
    // Heroic transition when entering from Portada (0) or concluding to Cierre (7)
    const isHeroic = prevIndex === 0 || index === 0 || prevIndex === 7 || index === 7;

    prev.current = index;
    setDirection(isForward ? 'forward' : 'backward');
    setMode(isHeroic ? 'heroic' : 'agile');
    setDuration(isHeroic ? 850 : 380);
    setActive(true);
  }, [index]);

  const handleFinish = () => {
    setActive(false);
  };

  if (!active) return null;

  return (
    <div className={styles.wrap} aria-hidden="true">
      <FireCurtain
        key={`fire-${index}-${direction}-${mode}`}
        direction={direction}
        mode={mode}
        duration={duration}
        onFinish={handleFinish}
      />
    </div>
  );
}
