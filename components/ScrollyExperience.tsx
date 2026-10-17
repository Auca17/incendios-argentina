'use client';
import { useCallback, useEffect, useState } from 'react';
import { GEOGRAPHIC_EVENTS } from '../lib/slides';
import type { StoryPhoto } from '../lib/photos';
import ArgentinaMap from './ArgentinaMap';
import CloudCurtain from './CloudCurtain';
import StorySection from './StorySection';
import PhotoModal from './PhotoModal';
import Epilogue from './Epilogue';
import styles from './ScrollyExperience.module.css';

// 10 sequential milestones along the continuous 0 to 1 window scroll
const MILESTONES = [
  { id: 'opening', start: 0.00, end: 0.10, name: 'Argentina bajo las nubes' },
  { id: 'misiones', start: 0.10, end: 0.22, name: 'Misiones' },
  { id: 'corrientes', start: 0.22, end: 0.35, name: 'Corrientes' },
  { id: 'cordoba', start: 0.35, end: 0.48, name: 'Córdoba' },
  { id: 'delta', start: 0.48, end: 0.61, name: 'Delta del Paraná' },
  { id: 'mendoza', start: 0.61, end: 0.74, name: 'Mendoza' },
  { id: 'chubut', start: 0.74, end: 0.86, name: 'Chubut' },
  { id: 'wide_shot', start: 0.86, end: 0.92, name: 'Memoria territorial' },
  { id: 'closing_clouds', start: 0.92, end: 0.96, name: 'El telón se cierra' },
  { id: 'epilogue', start: 0.96, end: 1.00, name: 'Epílogo y fuentes' },
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

  // Determine active milestone index & local progress (deterministic & bidirectional)
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

  // Synchronized map state:
  // - -1: Opening (full country under clouds, approaching Misiones as clouds part)
  // - 0..5: Misiones, Corrientes, Córdoba, Delta, Mendoza, Chubut
  // - 6: Wide shot / Closing clouds / Epilogue (full country with all 6 burned provinces)
  let mapChapterIndex = -1;
  let mapChapterProgress = 0;

  if (activeIndex === 0) {
    // Synchronize: In the second half of opening (localProgress > 0.4), begin smooth approach to Misiones
    if (localProgress > 0.45) {
      mapChapterIndex = 0;
      mapChapterProgress = (localProgress - 0.45) / 0.55 * 0.25;
    } else {
      mapChapterIndex = -1;
      mapChapterProgress = localProgress;
    }
  } else if (activeIndex >= 1 && activeIndex <= 6) {
    mapChapterIndex = activeIndex - 1;
    mapChapterProgress = localProgress;
  } else {
    // Wide shot, closing clouds, and epilogue
    mapChapterIndex = 6;
    mapChapterProgress = 1;
  }

  // Cloud curtain parameters:
  // - Opening: parts laterally from 0 to 1
  // - Stories (milestones 1..7): clouds parted (openProgress = 1, closeProgress = 0)
  // - Closing (milestone 8): clouds return from sides (closeProgress: 0 -> 1)
  // - Epilogue (milestone 9): clouds closed over map (closeProgress = 1)
  const cloudOpenProgress = activeIndex === 0 ? localProgress : 1;
  const cloudCloseProgress = activeIndex === 8 ? localProgress : activeIndex >= 9 ? 1 : 0;

  const scrollToMilestone = useCallback((index: number) => {
    const m = MILESTONES[index] || MILESTONES[0];
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const targetY = m.start * maxScroll + 12;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }, []);

  return (
    <div className={styles.appRoot}>
      {/* 1. PERSISTENT CARTOGRAPHIC SCENE (FULL-BLEED BACKGROUND) */}
      <div className={styles.fixedMapStage}>
        <ArgentinaMap
          chapterIndex={mapChapterIndex}
          chapterProgress={mapChapterProgress}
        />
      </div>

      {/* 2. ATMOSPHERIC CLOUD CURTAIN (FULL-BLEED OPENING & CLOSING) */}
      <CloudCurtain
        openProgress={cloudOpenProgress}
        closeProgress={cloudCloseProgress}
      />

      {/* 3. NARRATIVE STREAM (NATURAL DOCUMENT SCROLL FLOW) */}
      <div className={styles.narrativeTrack}>
        {/* Section 0: Portada bajo las nubes */}
        <section className={styles.openingHeroSection}>
          <div className={styles.openingCard}>
            <div className={styles.flagRibbon} aria-hidden="true">
              <span className={styles.flagStripeSky} />
              <span className={styles.flagStripeWhite} />
              <span className={styles.flagStripeSky} />
            </div>
            <h1 className={styles.openingTitle}>Lo que el fuego se llevó</h1>
            <p className={styles.openingKicker}>15 años de memoria ambiental · 2012–2026</p>
            <p className={styles.openingLead}>
              El territorio cuenta la historia. Desplazate hacia abajo para iniciar el recorrido de Norte a Sur por los grandes incendios y sus consecuencias en Argentina.
            </p>
          </div>
        </section>

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

        {/* Section 7: Final Wide Shot (Contemplation of all 6 burned provinces) */}
        <div className={styles.wideShotSection}>
          <div className={styles.wideShotCard}>
            <span className={styles.wideShotBadge}>Memoria territorial</span>
            <h2 className={styles.wideShotTitle}>Las marcas que quedan en el mapa</h2>
            <p className={styles.wideShotText}>
              Seis regiones calcinadas y más de 2,6 millones de focos registrados a lo largo de 15 años. Cada territorio conserva la huella del fuego antes del cierre del telón.
            </p>
          </div>
        </div>

        {/* Spacer for Closing Clouds veil */}
        <div className={styles.closingCloudsSpacer} aria-hidden="true" />

        {/* Section 9: Epilogue and verified open data sources */}
        <div className={styles.epilogueWrap}>
          <Epilogue />
        </div>
      </div>

      {/* 4. DISCRETE RIGHT TIMELINE HUD (Minimalist nav dots) */}
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
