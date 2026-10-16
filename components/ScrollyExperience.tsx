'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SLIDES, GEOGRAPHIC_EVENTS } from '../lib/slides';
import { loadProvincias } from '../lib/data';
import { useNational } from '../lib/useNational';
import { useIsMobile } from '../lib/useMediaQuery';
import { buildView, type ViewSpec } from '../lib/explore';
import type { StoryPhoto } from '../lib/photos';
import TopBar from './TopBar';
import MapPanel, { type ExploreMap } from './MapPanel';
import ScenePanel from './ScenePanel';
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

export default function ScrollyExperience() {
  const [geo, setGeo] = useState<any[]>(NO_GEO);
  const provinces = useMemo(
    () => (geo === NO_GEO ? undefined : geo.map((f) => f.properties.name as string)),
    [geo]
  );

  const isMobile = useIsMobile();
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeAct, setActiveAct] = useState(0);
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

  // Sync initial hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    const num = parseInt(hash, 10);
    if (!isNaN(num) && num >= 0 && num < SLIDES.length) {
      setActiveSlide(num);
      setTimeout(() => {
        const targetId = num === 0 ? 'story-intro' : num === 7 ? 'story-method' : `story-${GEOGRAPHIC_EVENTS[num - 1].id}`;
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
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

  // IntersectionObserver to track scroll progress
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const cards = document.querySelectorAll('[data-slide-index]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const slideIdx = parseInt(entry.target.getAttribute('data-slide-index') || '0', 10);
            const actAttr = entry.target.getAttribute('data-act-index');
            const actIdx = actAttr !== null ? parseInt(actAttr, 10) : 0;

            setActiveSlide(slideIdx);
            setActiveAct(actIdx);

            const hashVal = slideIdx === 0 ? '' : `#${slideIdx}`;
            if (window.location.hash !== hashVal) {
              window.history.replaceState(null, '', hashVal || window.location.pathname);
            }
          }
        });
      },
      {
        rootMargin: '-25% 0px -35% 0px',
        threshold: 0.1,
      }
    );

    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  // Compute current slide and its derived progress parameters
  const currentSlide = SLIDES[activeSlide] || SLIDES[0];
  const isEvent = currentSlide.type === 'event';

  // Derived progress values for scene and map
  const s = activeAct === 0 ? 0.15 : activeAct === 1 ? 0.50 : 0.85;
  const p = activeAct === 0 ? 0.20 : activeAct === 1 ? 0.60 : 1.00;
  const stage = activeAct;

  const scrollToSlide = useCallback((index: number) => {
    const targetId =
      index === 0
        ? 'story-intro'
        : index === 7
        ? 'story-method'
        : `story-${GEOGRAPHIC_EVENTS[index - 1].id}`;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Explore panel callbacks
  const onYear = useCallback((y: number) => setYear(y), []);
  const onProv = useCallback((pName: string | null) => setProv(pName), []);
  const onSelect = useCallback((pName: string) => setProv(pName), []);

  const kind = currentSlide.type === 'method' ? 'all' : 'year';
  const view = useMemo(() => {
    if (!nat || isEvent) return null;
    const spec: ViewSpec = kind === 'all' ? { kind: 'all' } : { kind: 'year', year };
    return buildView(nat, spec);
  }, [nat, isEvent, kind, year]);

  const hi = useMemo(() => (prov ? [prov] : NO_HI), [prov]);
  const explore: ExploreMap | null = isEvent
    ? null
    : { kind, year, cmp: null, nat, view, hi, onSelect };

  const panel =
    currentSlide.type === 'intro' ? (
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

      <main className={styles.scrollyContainer}>
        {/* ================= LEFT COLUMN: SCROLLING NARRATIVE STREAM ================= */}
        <div className={styles.scrollTrack}>
          {/* Section 0: Intro */}
          <section id="story-intro" className={styles.introSection} data-slide-index="0">
            <div className={styles.introCardWrap}>
              <HomeSidebar
                year={year}
                onPickYear={onYear}
                onStart={() => scrollToSlide(1)}
              >
                {isMobile && panel}
              </HomeSidebar>
            </div>
          </section>

          {/* Sections 1 to 6: The Six Fire Stories from North to South */}
          {GEOGRAPHIC_EVENTS.map((ev, evIdx) => (
            <StoryActSection
              key={ev.id}
              ev={ev}
              index={evIdx + 1}
              total={GEOGRAPHIC_EVENTS.length}
              onOpenPhoto={(photo) => setModalPhoto(photo)}
            />
          ))}

          {/* Section 7: Method and Open Data */}
          <section id="story-method" className={styles.methodSection} data-slide-index="7">
            <div className={styles.methodCardWrap}>
              <MethodSidebar>
                {isMobile && <MethodPanel />}
              </MethodSidebar>
            </div>
          </section>
        </div>

        {/* ================= RIGHT COLUMN: STICKY INTERACTIVE STAGE ================= */}
        <div className={isEvent ? styles.stickyStage : `${styles.stickyStage} ${styles.stageMap}`}>
          <MapPanel p={p} slide={currentSlide} geo={geo} explore={explore} />
          {isEvent ? (
            <ScenePanel s={s} stage={stage} slide={currentSlide} />
          ) : (
            !isMobile && (
              <section className={styles.panelCol} aria-label="Exploración">
                {panel}
              </section>
            )
          )}
        </div>

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
      </main>

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
