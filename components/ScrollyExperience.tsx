'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SLIDES, GEOGRAPHIC_EVENTS } from '../lib/slides';
import { loadProvincias } from '../lib/data';
import { useNational } from '../lib/useNational';
import { useIsMobile } from '../lib/useMediaQuery';
import { buildView, type ViewSpec } from '../lib/explore';
import type { StoryPhoto } from '../lib/photos';
import TopBar from './TopBar';
import SmokeCurtain from './SmokeCurtain';
import InteractiveStage from './InteractiveStage';
import type { ExploreMap } from './MapPanel';
import ExplorePanel from './ExplorePanel';
import MethodPanel from './MethodPanel';
import MethodSidebar from './MethodSidebar';
import HomeSidebar from './HomeSidebar';
import VerticalTimelineHud from './VerticalTimelineHud';
import StoryActSection from './StoryActSection';
import AvisoPopover from './AvisoPopover';
import styles from './ScrollyExperience.module.css';

const NO_PROVINCES: string[] = [];
const NO_GEO: any[] = [];
const NO_HI: string[] = [];

// Ranges for 9 milestones along the continuous 0 to 1 window scroll
const MILESTONES = [
  { id: 'intro', start: 0.00, end: 0.10 },
  { id: 'misiones', start: 0.10, end: 0.24 },
  { id: 'corrientes', start: 0.24, end: 0.38 },
  { id: 'cordoba', start: 0.38, end: 0.52 },
  { id: 'delta', start: 0.52, end: 0.66 },
  { id: 'mendoza', start: 0.66, end: 0.80 },
  { id: 'chubut', start: 0.80, end: 0.90 },
  { id: 'explore', start: 0.90, end: 0.96 },
  { id: 'method', start: 0.96, end: 1.00 },
];

export default function ScrollyExperience() {
  const [geo, setGeo] = useState<any[]>(NO_GEO);
  const provinces = useMemo(
    () => (geo === NO_GEO ? undefined : geo.map((f) => f.properties.name as string)),
    [geo]
  );

  const isMobile = useIsMobile();
  const [totalProgress, setTotalProgress] = useState(0);
  const [year, setYear] = useState<number>(2020);
  const [prov, setProv] = useState<string | null>(null);
  const [modalPhoto, setModalPhoto] = useState<StoryPhoto | null>(null);

  const { nat, failed } = useNational(true);

  // Load provinces GeoJSON once
  useEffect(() => {
    let live = true;
    loadProvincias().then(
      (fc) => { if (live) setGeo(fc.features); },
      () => {}
    );
    return () => { live = false; };
  }, []);

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

  // Close modal on Escape
  useEffect(() => {
    if (!modalPhoto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalPhoto(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalPhoto]);

  // Determine active slide index and local progress
  let activeSlide = 0;
  let localProgress = 0;

  for (let i = 0; i < MILESTONES.length; i++) {
    const m = MILESTONES[i];
    if (totalProgress >= m.start && totalProgress <= m.end) {
      activeSlide = i;
      localProgress = (totalProgress - m.start) / Math.max(1e-5, m.end - m.start);
      break;
    }
  }

  if (totalProgress > MILESTONES[MILESTONES.length - 1].end) {
    activeSlide = MILESTONES.length - 1;
    localProgress = 1;
  }

  // Update URL hash smoothly without jitter
  useEffect(() => {
    const hashVal = activeSlide === 0 ? '' : `#${activeSlide}`;
    if (window.location.hash !== hashVal) {
      window.history.replaceState(null, '', hashVal || window.location.pathname);
    }
  }, [activeSlide]);

  const currentSlide = SLIDES[activeSlide] || SLIDES[0];

  // Derived continuous progress for stage, map, and scene
  const introProgress = activeSlide === 0 ? Math.min(1, localProgress * 1.4) : 1;
  const p = Math.max(0, Math.min(1, localProgress));
  const s = Math.max(0, Math.min(1, localProgress));
  const stage = localProgress < 0.33 ? 0 : localProgress < 0.66 ? 1 : 2;

  const scrollToSlide = useCallback((index: number) => {
    const m = MILESTONES[index] || MILESTONES[0];
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const targetY = m.start * maxScroll + 10;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }, []);

  // Explore panel callbacks
  const onYear = useCallback((y: number) => setYear(y), []);
  const onProv = useCallback((pName: string | null) => setProv(pName), []);
  const onSelect = useCallback((pName: string) => setProv(pName), []);

  const kind = currentSlide.type === 'method' ? 'all' : 'year';
  const view = useMemo(() => {
    if (!nat || currentSlide.type === 'event') return null;
    const spec: ViewSpec = kind === 'all' ? { kind: 'all' } : { kind: 'year', year };
    return buildView(nat, spec);
  }, [nat, currentSlide.type, kind, year]);

  const hi = useMemo(() => (prov ? [prov] : NO_HI), [prov]);
  const explore: ExploreMap | null = currentSlide.type === 'event'
    ? null
    : { kind, year, cmp: null, nat, view, hi, onSelect };

  const panel =
    currentSlide.type === 'intro' || currentSlide.type === 'explore' ? (
      <ExplorePanel
        nat={nat}
        failed={failed}
        provinces={provinces ?? NO_PROVINCES}
        year={year}
        cmp={null}
        prov={prov}
        period={null}
        onPeriod={() => {}}
        onYear={onYear}
        onCompare={() => {}}
        onProv={onProv}
      />
    ) : currentSlide.type === 'method' ? (
      <MethodPanel />
    ) : null;

  return (
    <div className={styles.app}>
      <TopBar index={activeSlide} count={SLIDES.length} name={currentSlide.name} />

      {/* ================= 0. FULL-SCREEN SMOKE & CLOUD CURTAIN OPENER ================= */}
      <SmokeCurtain
        progress={introProgress}
        onStartClick={() => scrollToSlide(1)}
      />

      {/* ================= FIXED STAGE (RIGHT / BACKGROUND) ================= */}
      <div className={styles.fixedStageWrapper}>
        <InteractiveStage
          slide={currentSlide}
          slideIndex={activeSlide}
          p={p}
          s={s}
          stage={stage}
          geo={geo}
          explore={explore}
          introProgress={introProgress}
        />
        {/* National explore panel on explore desktop */}
        {currentSlide.type === 'explore' && !isMobile && (
          <aside className={styles.panelCol} aria-label="Exploración">
            {panel}
          </aside>
        )}
        {/* Method panel on method desktop */}
        {currentSlide.type === 'method' && !isMobile && (
          <aside className={styles.panelCol} aria-label="Fuentes y método">
            <MethodPanel />
          </aside>
        )}
      </div>

      {/* ================= FLOATING NARRATIVE STREAM (LEFT) ================= */}
      <div
        className={styles.fixedNarrativeWrapper}
        style={{
          opacity: activeSlide === 0 ? Math.max(0, (introProgress - 0.75) / 0.25) : 1,
          transition: 'opacity 0.4s ease',
        }}
      >

        {/* 6 Event Story Cards (North to South) */}
        {GEOGRAPHIC_EVENTS.map((ev, evIdx) => {
          const slideIdx = evIdx + 1;
          const isActive = activeSlide === slideIdx;

          return (
            <div
              key={ev.id}
              className={`${styles.narrativeSection} ${isActive ? styles.sectionActive : styles.sectionHidden}`}
            >
              <StoryActSection
                ev={ev}
                index={slideIdx}
                total={GEOGRAPHIC_EVENTS.length}
                onOpenPhoto={(photo) => setModalPhoto(photo)}
                s={s}
                stage={stage}
                slide={currentSlide}
              />
            </div>
          );
        })}

        {/* 15 Años Nacional Epilogue Card */}
        <div
          className={`${styles.narrativeSection} ${activeSlide === 7 ? styles.sectionActive : styles.sectionHidden}`}
        >
          <div className={styles.introCardWrap}>
            <HomeSidebar
              year={year}
              onPickYear={onYear}
              onStart={() => scrollToSlide(8)}
            >
              {isMobile && panel}
            </HomeSidebar>
          </div>
        </div>

        {/* Method Card */}
        <div
          className={`${styles.narrativeSection} ${activeSlide === 8 ? styles.sectionActive : styles.sectionHidden}`}
        >
          <div className={styles.methodCardWrap}>
            <MethodSidebar>
              {isMobile && <MethodPanel />}
            </MethodSidebar>
          </div>
        </div>
      </div>

      {/* ================= GLOBAL SCROLL SPACER (NATIVE 800vh SCROLL) ================= */}
      <div className={styles.scrollSpacer} aria-hidden="true" />

      {/* ================= FLOATING VERTICAL TIMELINE HUD ================= */}
      <VerticalTimelineHud
        activeSlide={activeSlide}
        slides={SLIDES}
        onSelect={scrollToSlide}
      />

      {/* Aviso popover overlay */}
      <div className={styles.avisoSlot}>
        <AvisoPopover />
      </div>

      {/* High-res Photo Lightbox Modal */}
      {modalPhoto && (
        <div
          className={styles.modalOverlay}
          onClick={() => setModalPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Fotografía en alta resolución"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setModalPhoto(null)}
              aria-label="Cerrar fotografía"
            >
              ✕
            </button>
            <div className={styles.modalImgWrap}>
              <img src={modalPhoto.src} alt={modalPhoto.caption} className={styles.modalImg} />
            </div>
            <div className={styles.modalMeta}>
              <p className={styles.modalCaption}>{modalPhoto.caption}</p>
              <p className={styles.modalCredit}>
                Fuente: {modalPhoto.sourceUrl ? (
                  <a href={modalPhoto.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {modalPhoto.credit}
                  </a>
                ) : (
                  modalPhoto.credit
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
