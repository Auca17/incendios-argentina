'use client';
import { useCallback, useEffect, useState } from 'react';
import { GEOGRAPHIC_EVENTS } from '../lib/slides';
import type { StoryPhoto } from '../lib/photos';
import ArgentinaMap from './ArgentinaMap';
import CloudCurtain from './CloudCurtain';
import StorySection from './StorySection';
import PhotoModal from './PhotoModal';
import Epilogue from './Epilogue';
import CloudPod from './CloudPod';
import styles from './ScrollyExperience.module.css';

// 10 sequential narrative milestones strictly aligned with DOM elements
const SECTIONS = [
  { id: 'sec-opening', name: 'Argentina bajo las nubes' },
  { id: 'sec-misiones', name: 'Misiones' },
  { id: 'sec-corrientes', name: 'Corrientes' },
  { id: 'sec-cordoba', name: 'Córdoba' },
  { id: 'sec-delta', name: 'Delta del Paraná' },
  { id: 'sec-mendoza', name: 'Mendoza' },
  { id: 'sec-chubut', name: 'Chubut' },
  { id: 'sec-wide_shot', name: 'Memoria territorial' },
  { id: 'sec-closing_clouds', name: 'El telón se cierra' },
  { id: 'sec-epilogue', name: 'Epílogo y fuentes' },
];

export default function ScrollyExperience() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [localProg, setLocalProg] = useState(0);
  const [cloudOpenProgress, setCloudOpenProgress] = useState(0);
  const [cloudCloseProgress, setCloudCloseProgress] = useState(0);
  const [modalPhoto, setModalPhoto] = useState<StoryPhoto | null>(null);

  // Robust, DOM-driven 60 FPS scroll synchronization (never desyncs on any screen)
  useEffect(() => {
    let ticking = false;

    const computeSections = () => {
      const vh = window.innerHeight;
      const readingLine = vh * 0.45; // focal reading center line

      // 1. Cloud open progress:
      // When top of Misiones is at bottom of viewport, openProg = 0
      // When top of Misiones reaches readingLine, openProg = 1
      const misionesEl = document.getElementById('sec-misiones');
      if (misionesEl) {
        const mRect = misionesEl.getBoundingClientRect();
        const rawOpen = (vh - mRect.top) / Math.max(1, vh - readingLine);
        setCloudOpenProgress(Math.min(1, Math.max(0, rawOpen)));
      } else {
        setCloudOpenProgress(1);
      }

      // 2. Compute active section by intersecting readingLine with each DOM element
      let currentActive = 0;
      let currentLocal = 0;

      for (let i = 0; i < SECTIONS.length; i++) {
        const el = document.getElementById(SECTIONS[i].id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();

        if (rect.top <= readingLine && rect.bottom > readingLine) {
          currentActive = i;
          currentLocal = Math.min(1, Math.max(0, (readingLine - rect.top) / Math.max(1, rect.height)));
          break;
        }
      }

      // If scrolled past all sections into the epilogue
      const epilogueEl = document.getElementById('sec-epilogue');
      if (epilogueEl) {
        const eRect = epilogueEl.getBoundingClientRect();
        if (eRect.top <= readingLine) {
          currentActive = SECTIONS.length - 1;
          currentLocal = 1;
        }
      }

      setActiveIdx(currentActive);
      setLocalProg(currentLocal);

      // 3. Cloud close progress (only closes after the user has scrolled past wide_shot towards epilogue)
      const wideEl = document.getElementById('sec-wide_shot');
      if (wideEl) {
        const wRect = wideEl.getBoundingClientRect();
        if (wRect.bottom < readingLine) {
          const rawClose = (readingLine - wRect.bottom) / Math.max(1, vh * 0.7);
          setCloudCloseProgress(Math.min(1, Math.max(0, rawClose)));
        } else {
          setCloudCloseProgress(0);
        }
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(computeSections);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    computeSections();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Map chapter mapping:
  // - -1: Opening (under clouds, approaching Misiones as clouds part)
  // - 0: Misiones
  // - 1: Corrientes
  // - 2: Córdoba
  // - 3: Delta
  // - 4: Mendoza
  // - 5: Chubut
  // - 6: Wide shot / Closing clouds / Epilogue (All 6 burned regions)
  let mapChapterIndex = -1;
  let mapChapterProgress = 0;

  if (activeIdx === 0) {
    if (cloudOpenProgress > 0.45) {
      mapChapterIndex = 0;
      mapChapterProgress = (cloudOpenProgress - 0.45) / 0.55 * 0.25;
    } else {
      mapChapterIndex = -1;
      mapChapterProgress = 0;
    }
  } else if (activeIdx >= 1 && activeIdx <= 6) {
    // Indexes 1..6 map to chapter 0..5
    mapChapterIndex = activeIdx - 1;
    mapChapterProgress = localProg;
  } else {
    // Wide shot (7), Closing clouds (8), Epilogue (9)
    mapChapterIndex = 6;
    mapChapterProgress = 1;
  }

  const scrollToMilestone = useCallback((index: number) => {
    const targetId = SECTIONS[index]?.id;
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const isTimelineVisible = activeIdx >= 1 && activeIdx <= 6;

  return (
    <div className={styles.appRoot}>
      {/* 1. PERSISTENT CARTOGRAPHIC SCENE (FULL-BLEED BACKGROUND) */}
      <div className={styles.fixedMapStage}>
        <ArgentinaMap
          chapterIndex={mapChapterIndex}
          chapterProgress={mapChapterProgress}
        />
      </div>

      {/* 2. ATMOSPHERIC CLOUD CURTAIN (SIMPSONS-STYLE OPENING & LEFT CLOUD BANK) */}
      <CloudCurtain
        openProgress={cloudOpenProgress}
        closeProgress={cloudCloseProgress}
      />

      {/* 3. NARRATIVE STREAM (NATURAL DOCUMENT SCROLL FLOW) */}
      <div className={styles.narrativeTrack}>
        {/* Section 0: Portada bajo las nubes (Solo cielo y nubes cinematográficas) */}
        <section id="sec-opening" className={styles.openingHeroSection}>
          <div className={styles.skyTitleOverlay}>
            <div className={styles.skyFlagRibbon} aria-hidden="true">
              <span className={styles.flagStripeSky} />
              <span className={styles.flagStripeWhite} />
              <span className={styles.flagStripeSky} />
            </div>
            <h1 className={styles.skyTitle}>Lo que el fuego se llevó</h1>
            <p className={styles.skyKicker}>15 años de memoria ambiental · 2012–2026</p>
            <div className={styles.skyScrollPrompt}>
              <span className={styles.skyScrollText}>Desplazá para descender al territorio</span>
              <span className={styles.skyScrollArrow} aria-hidden="true">↓</span>
            </div>
          </div>
        </section>

        {/* 6 Event Story Sections */}
        {GEOGRAPHIC_EVENTS.map((ev, evIdx) => {
          const milestoneIdx = evIdx + 1;
          const isActive = activeIdx === milestoneIdx;

          return (
            <div
              key={ev.id}
              id={`sec-${ev.id}`}
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

        {/* Section 7: Final Wide Shot (Contemplation on CloudPod) */}
        <div id="sec-wide_shot" className={styles.wideShotSection}>
          <CloudPod variant="wide" className={styles.wideCloudPod}>
            <span className={styles.wideShotBadge}>Memoria territorial</span>
            <h2 className={styles.wideShotTitle}>Las marcas que quedan en el mapa</h2>
            <p className={styles.wideShotText}>
              Seis regiones calcinadas y más de 2,6 millones de focos registrados a lo largo de 15 años. Cada territorio conserva la huella del fuego antes del cierre del telón.
            </p>
          </CloudPod>
        </div>

        {/* Section 8: Spacer for Closing Clouds veil */}
        <div id="sec-closing_clouds" className={styles.closingCloudsSpacer} aria-hidden="true" />

        {/* Section 9: Epilogue and verified open data sources */}
        <div id="sec-epilogue" className={styles.epilogueWrap}>
          <Epilogue />
        </div>
      </div>

      {/* 4. DISCRETE RIGHT TIMELINE HUD (Minimalist nav dots, hidden in opening) */}
      <nav
        className={`${styles.timelineHud} ${isTimelineVisible ? styles.timelineHudVisible : styles.timelineHudHidden}`}
        aria-label="Progreso del relato geográfico"
      >
        <div className={styles.timelineTrack}>
          {SECTIONS.slice(1, 7).map((m, i) => {
            const milestoneIndex = i + 1;
            const isPassed = activeIdx > milestoneIndex;
            const isCurrent = activeIdx === milestoneIndex;

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
