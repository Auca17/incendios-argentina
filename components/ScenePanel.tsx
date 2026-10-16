'use client';
import { useEffect, useMemo, useRef } from 'react';
import type { Slide } from '../lib/slides';
import { createScene } from '../lib/scene';
import { stageCaption } from '../lib/fire';
import { useReducedMotion } from '../lib/motion';
import BiodiversityCard from './BiodiversityCard';
import styles from './ScenePanel.module.css';

type Props = { s: number; stage: number; slide: Slide };

/** Schematic SVG scene: a pure function of s (lib/scene.ts) plus the stage caption. */
export default function ScenePanel({ s, stage, slide }: Props) {
  const ev = slide.type === 'event' ? slide.ev : null;
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useRef(true);
  const scrolling = useRef(false);
  const applyRef = useRef<() => void>(() => {});
  const quietTimer = useRef(0);

  const scene = useMemo(
    () =>
      ev
        ? createScene({
            still: false,
            id: ev.id,
            kind: ev.cause.kind,
            means: ev.means || { crew: 3 },
            hectares: ev.hero.value,
            unit: ev.hero.unit === 'hectáreas' ? 'ha' : ev.hero.unit,
            aria: 'Ilustración esquemática: cómo empezó, cómo creció y cómo se combatió el incendio de ' + ev.region,
          })
        : null,
    [ev],
  );

  /* mount, then keep ambient motion running only while the scene is on screen and the tab is visible */
  useEffect(() => {
    const svg = box.current?.querySelector('svg.scene');
    if (!scene || !svg) return;
    scene.mount(svg);
    // ambient animation also rests while the text is being scrolled (the scene is being redrawn then anyway)
    const apply = () => svg.classList.toggle('paused', !onScreen.current || document.hidden || scrolling.current);
    applyRef.current = apply;
    onScreen.current = true;
    apply();
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((es) => { onScreen.current = es[es.length - 1].isIntersecting; apply(); })
      : null;
    io?.observe(svg);
    document.addEventListener('visibilitychange', apply);
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', apply);
      window.clearTimeout(quietTimer.current);
      scrolling.current = false;
    };
  }, [scene]);

  /* scroll drives the scene continuously (forward and backward) */
  const sEff = s;
  useEffect(() => {
    scene?.update(sEff);
    scrolling.current = true;
    applyRef.current();
    window.clearTimeout(quietTimer.current);
    quietTimer.current = window.setTimeout(() => { scrolling.current = false; applyRef.current(); }, 180);
  }, [scene, sEff]);

  if (!ev || !scene) return <section className={styles.scene} aria-label="Escena esquemática" />;

  const [lead, rest] = stageCaption(ev, stage);
  return (
    <section className={styles.scene} aria-label="Escena esquemática">
      <div className={styles.scenebox} ref={box} dangerouslySetInnerHTML={{ __html: scene.html }} />
      <div className={styles.caption} aria-live="polite">
        <span className={styles.step}>{stage + 1}</span>
        <span>
          <b>{lead}</b>
          {rest}
        </span>
      </div>
      <div className={styles.bioSlot}>
        <BiodiversityCard storyId={ev.id} />
      </div>
    </section>
  );
}
