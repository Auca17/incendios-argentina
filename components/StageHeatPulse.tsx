'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './StageHeatPulse.module.css';

interface StageHeatPulseProps {
  stage: number;
}

/**
 * StageHeatPulse: Atmospheric thermal flare and rising ember wave across the stage panel
 * whenever the user scrolls into a new narrative act (1 Cómo empezó → 2 El fuego → 3 Combate).
 */
export default function StageHeatPulse({ stage }: StageHeatPulseProps) {
  const prevStage = useRef<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevStage.current === null) {
      prevStage.current = stage;
      return;
    }

    if (prevStage.current === stage) return;
    prevStage.current = stage;

    setPulse(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setPulse(false);
    }, 550);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [stage]);

  if (!pulse) return null;

  return (
    <div className={styles.pulseWrap} aria-hidden="true">
      <div className={styles.thermalWave} />
      <div className={styles.emberShimmer} />
    </div>
  );
}
