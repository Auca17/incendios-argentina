'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GEOGRAPHIC_EVENTS } from '../lib/slides';
import type { StoryPhoto } from '../lib/photos';
import ArgentinaMap, { CHAPTER_CONFIG } from './ArgentinaMap';
import CloudCurtain from './CloudCurtain';
import StorySection from './StorySection';
import PhotoModal from './PhotoModal';
import Epilogue from './Epilogue';
import TopBar from './TopBar';
import styles from './ScrollyExperience.module.css';

// 9 sequential milestones along the continuous 0 to 1 window scroll
const MILESTONES = [
  { id: 'opening', start: 0.00, end: 0.08, name: 'Argentina bajo las nubes' },
  { id: 'misiones', start: 0.08, end: 0.22, name: 'Misiones' },
  { id: 'corrientes', start: 0.22, end: 0.36, name: 'Corrientes' },
  { id: 'cordoba', start: 0.36, end: 0.50, name: 'Córdoba' },
  { id: 'delta', start: 0.50, end: 0.64, name: 'Delta del Paraná' },
  { id: 'mendoza', start: 0.64, end: 0.78, name: 'Mendoza' },
  { id: 'chubut', start: 0.78, end: 0.90, name: 'Chubut' },
  { id: 'wide_shot', start: 0.90, end: 0.94, name: 'Memoria territorial' },
  { id: 'epilogue', start: 0.94, end: 1.00, name: 'Epílogo y fuentes' },
];

export default function ScrollyExperience() {
  const [totalProgress, setTotalProgress] = useState(0);
  const [modalPhoto, setModalPhoto] = useState<StoryPhoto | null>(null);

  // Global window scroll listener (passive & 60 FPS)
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          const p = Math.min(1, Math.max(0, scrollY / maxScroll));
          setTotalProgress(p);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Determine active milestone index & local progress
  let activeIndex = 0;
  let localProgress = 0;

  for (let i = 0; i < MILESTONES.length; i++) {
    const m = MILESTONES[i];
    if (totalProgress >= m.start && totalProgress <= m.end) {
      activeIndex = i;
      localProgress = (totalProgress - m.start) / Math.max(1e-5, m.end - m.start);
      break;
    }
  }

  if (totalProgress > MILESTONES[MILESTONES.length - 1].end) {
    activeIndex = MILESTONES.length - 1;
    localProgress = 1;
  }

  const currentMilestone = MILESTONES[activeIndex] || MILESTONES[0];

  // Map state derivation:
  // -1: Opening (full country, natural biomes under clouds)
  // 0..5: Misiones, Corrientes, Córdoba, Delta, Mendoza, Chubut
  // 6: Wide shot / Epilogue (full country with all 6 burned provinces)
  let mapChapterIndex = -1;
  let mapChapterProgress = 0;

  if (activeIndex === 0) {
    mapChapterIndex = -1;
    mapChapterProgress = localProgress;
  } else if (activeIndex >= 1 && activeIndex <= 6) {
    mapChapterIndex = activeIndex - 1;
    mapChapterProgress = localProgress;
  } else {
    // Wide shot and epilogue
    mapChapterIndex = 6;
    mapChapterProgress = 1;
  }

  // Cloud curtain parameters
  const cloudOpenProgress = activeIndex === 0 ? localProgress : 1;
  const cloudCloseProgress = activeIndex === 7 ? localProgress : activeIndex >= 8 ? 1 : 0;

  const scrollToMilestone = useCallback((index: number) => {
    const m = MILESTONES[index] || MILESTONES[0];
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const targetY = m.start * maxScroll + 12;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }, []);

  return (
    <div className={styles.appRoot}>
      {/* Discrete Top Bar */}
      <TopBar index={activeIndex} count={MILESTONES.length} name={currentMilestone.name} />

      {/* 1. PERSISTENT CARTOGRAPHIC SCENE (FIXED BACKGROUND) */}
      <div className={styles.fixedMapStage}>
        <ArgentinaMap
          chapterIndex={mapChapterIndex}
          chapterProgress={mapChapterProgress}
        />
      </div>

      {/* 2. ATMOSPHERIC CLOUD CURTAIN (OPENING & CLOSING) */}
      <CloudCurtain
        openProgress={cloudOpenProgress}
        closeProgress={cloudCloseProgress}
      />

      {/* 3. NARRATIVE STREAM (LEFT DESKTOP / STACKED MOBILE) */}
      <div className={styles.narrativeTrack}>
        {/* Spacer for Opening (clouds part as user scrolls through this range) */}
        <div className={styles.openingSpacer} aria-hidden="true" />

        {/* 6 Event Story Sections */}
        {GEOGRAPHIC_EVENTS.map((ev, evIdx) => {
          const milestoneIdx = evIdx + 1;
          const isActive = activeIndex === milestoneIdx;

          return (
            <div
              key={ev.id}
              className={`${styles.storySectionWrap} ${isActive ? styles.storyActive : styles.storyDormant}`}
            >
              <StorySection
                ev={ev}
                index={evIdx}
                total={GEOGRAPHIC_EVENTS.length}
                onOpenPhoto={(p) => setModalPhoto(p)}
              />
            </div>
          );
        })}

        {/* Spacer for Final Wide Shot (user contemplates all burned provinces) */}
        <div className={styles.wideShotSpacer} aria-hidden="true" />

        {/* Epilogue Section */}
        <div className={styles.epilogueWrap}>
          <Epilogue />
        </div>
      </div>

      {/* 4. DISCRETE RIGHT TIMELINE HUD */}
      <nav className={styles.timelineHud} aria-label="Progreso del relato geográfico">
        <div className={styles.timelineTrack}>
          {MILESTONES.slice(1, 7).map((m, i) => {
            const milestoneIndex = i + 1;
            const isPassed = activeIndex > milestoneIndex;
            const isCurrent = activeIndex === milestoneIndex;

            return (
              <button
                key={m.id}
                type="button"
                className={`${styles.hudNode} ${isCurrent ? styles.hudActive : isPassed ? styles.hudPassed : ''}`}
                onClick={() => scrollToMilestone(milestoneIndex)}
                aria-label={`Ir a ${m.name}`}
              >
                <span className={styles.hudDot} />
                <span className={styles.hudLabel}>{m.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 5. ACCESSIBLE PHOTO LIGHTBOX MODAL */}
      <PhotoModal photo={modalPhoto} onClose={() => setModalPhoto(null)} />
    </div>
  );
}
