'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FOCAL, SECTIONS, TOUR_EVENTS } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import styles from './TourHud.module.css';

const FIRST_STORY = SECTIONS.findIndex((s) => s.kind === 'story');

/** Scrolls so the start of a section sits on the focal line (t = 0: first week of a fire). */
export function goToSection(i: number) {
  const el = document.getElementById(SECTIONS[i]?.id);
  if (!el) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const top = i === 0 ? 0 : Math.ceil(el.getBoundingClientRect().top + window.scrollY - window.innerHeight * FOCAL) + 1;
  window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
}

/**
 * Right-hand HUD: one dot per fire (its name on hover or focus) and a thin progress line. Hidden on
 * the cover and over the closed clouds of the epilogue. Arrow keys left/right move between fires
 * (PgUp/PgDn keep their native scrolling).
 */
export default function TourHud() {
  const [state, setState] = useState({ chapter: -1, visible: false, idx: 0 });
  const bar = useRef<HTMLSpanElement>(null);
  const idxRef = useRef(0);

  useEffect(() => subscribe(({ st, progress }) => {
    if (bar.current) bar.current.style.transform = `scaleY(${progress.toFixed(4)})`;
    idxRef.current = st.idx;
    const visible = st.hud > 0.5;
    setState((o) => (o.chapter === st.chapter && o.visible === visible && o.idx === st.idx ? o : { chapter: st.chapter, visible, idx: st.idx }));
  }), []);

  const step = useCallback((d: number) => {
    const idx = idxRef.current;
    const cur = SECTIONS[idx];
    let story = cur.kind === 'story' ? cur.story! + d : d > 0 ? (idx < FIRST_STORY ? 0 : 6) : (idx < FIRST_STORY ? -1 : 5);
    if (story < 0) { goToSection(0); return; }
    if (story > 5) { goToSection(FIRST_STORY + 6); return; }
    goToSection(FIRST_STORY + story);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const active = state.chapter >= 0 && state.chapter <= 5 ? TOUR_EVENTS[state.chapter] : null;

  return (
    <>
      <nav
        className={state.visible ? `${styles.hud} ${styles.on}` : styles.hud}
        aria-label="Recorrido por las seis historias"
        inert={!state.visible}
      >
        <span className={styles.track} aria-hidden="true"><span ref={bar} className={styles.fill} /></span>
        <ol className={styles.dots}>
          {TOUR_EVENTS.map((ev, i) => {
            const on = state.chapter === i;
            const done = state.chapter > i;
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  className={on ? `${styles.dot} ${styles.dotOn}` : done ? `${styles.dot} ${styles.dotDone}` : styles.dot}
                  aria-label={`${ev.region}, ${ev.year}`}
                  aria-current={on ? 'step' : undefined}
                  onClick={() => goToSection(FIRST_STORY + i)}
                >
                  <i aria-hidden="true" />
                  {/* the name shows on hover or focus: the reading pod already says where we are */}
                  <span className={styles.label} aria-hidden="true">{ev.region} · {ev.year}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <p className="sr-only" aria-live="polite">
        {active ? `Historia ${state.chapter + 1} de 6: ${active.region}, ${active.when}` : ''}
      </p>
    </>
  );
}
