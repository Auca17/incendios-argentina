'use client';
import { useMemo } from 'react';
import type { Slide } from '../lib/slides';
import ThreeGlobe from './ThreeGlobe';
import MapPanel, { type ExploreMap } from './MapPanel';
import styles from './InteractiveStage.module.css';

type Props = {
  slide: Slide;
  slideIndex: number;
  p: number; // 0 to 1 continuous progress within active chapter
  s: number; // 0 to 1 continuous progress for scene
  stage: number; // 0, 1, or 2
  geo: any[];
  explore: ExploreMap | null;
  introProgress: number; // 0 to 1 space zoom progress
};

export default function InteractiveStage({
  slide,
  slideIndex,
  p,
  s,
  stage,
  geo,
  explore,
  introProgress,
}: Props) {
  const isIntro = slideIndex === 0;

  // Globe opacity: 1.0 in orbit, fades out between 0.65 and 0.95 zoom approach
  const globeOpacity = isIntro
    ? introProgress < 0.65
      ? 1
      : Math.max(0, 1 - (introProgress - 0.65) / 0.3)
    : 0;

  // Map opacity: fades in as we approach surface (0.55 to 0.95)
  const mapOpacity = isIntro
    ? introProgress < 0.55
      ? 0
      : Math.min(1, (introProgress - 0.55) / 0.4)
    : 1;

  return (
    <div className={styles.stageRoot}>
      {/* 1. 3D Earth Globe from space (daytime illumination) */}
      {globeOpacity > 0.01 && (
        <ThreeGlobe progress={introProgress} opacity={globeOpacity} />
      )}

      {/* 3. Detailed Canvas Map of Argentina & Provinces */}
      <div
        className={styles.mapLayer}
        style={{
          opacity: mapOpacity,
          transition: 'opacity 0.4s ease',
        }}
      >
        <MapPanel p={p} slide={slide} geo={geo} explore={explore} />
      </div>
    </div>
  );
}
