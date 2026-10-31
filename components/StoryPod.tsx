'use client';
import { useEffect, useId, useRef } from 'react';
import { fmt } from '../lib/fire';
import { CAUSE_BY } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import { openDialog } from '../lib/storyDialog';
import styles from './StoryPod.module.css';

type Props = { ev: any; index: number; total: number };

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/**
 * Phones: the scene's progress (chapterT) at which the cause gives way to the figure. Chubut's text
 * appears after its cinematic opening, so it swaps later.
 */
const SWAP: Record<string, number> = { chubut: 0.58 };

/**
 * Reading text of one region, fixed on the left of the screen while its scene plays. It is revealed
 * in phases with the scroll (st.pod): place and title first, then the cause quoted with its source,
 * then the hero figure with its source and "Más información" (a dialog with the facts, the sources
 * that disagree, the monthly satellite chart and the photos). It fades with the smoke between regions.
 */
export default function StoryPod({ ev, index, total }: Props) {
  const ref = useRef<HTMLElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    // the text never pops in or out: left by a fast scroll into another region, it fades on its own
    let shown = 0;
    let last = 0;
    return subscribe(({ st, reduced }) => {
    const el = ref.current;
    if (!el) return;
    const on = st.chapter === index && st.pod > 0.001 && st.veil < 0.999;
    // while it fades out, its blocks stay as they were
    if (on || shown === 0) el.style.setProperty('--p', on ? st.pod.toFixed(3) : '0');
    // phones show the cause, then the figure in its place (never more than two blocks at once); the
    // swap follows the scene's own progress, so each block holds for a good stretch of scroll
    const s0 = SWAP[ev.id] ?? 0.42;
    const swap = on ? Math.min(1, Math.max(0, (st.chapterT - s0) / 0.06)) : 0;
    el.style.setProperty('--swap', swap.toFixed(3));
    // (phones) the figure and its button cannot be reached while they are not shown yet
    const sw = swap < 0.01 ? '0' : '1';
    if (el.dataset.swap !== sw) el.dataset.swap = sw;
    const now = performance.now();
    const fade = Math.exp(-Math.min(0.1, Math.max(0, (now - last) / 1000)) / 0.09);
    last = now;
    // any jump bigger than a step (the region changed, or a long frame) is eased, in and out
    const target = on ? 1 - st.veil : 0;
    shown = reduced || Math.abs(target - shown) < 0.08 ? target : target + (shown - target) * fade;
    el.style.opacity = shown.toFixed(3);
    // visible while it fades out; reachable only while it is the region's
    const vis = shown > 0 ? '1' : '0';
    if (el.dataset.on !== vis) el.dataset.on = vis;
    if (el.inert !== !on) el.inert = !on;
    return shown !== target;
    });
  }, [index, ev.id]);

  return (
    <article ref={ref} className={styles.pod} aria-labelledby={id + 'h'} data-on="0" data-pod={index}>
      <p className={`${styles.label} ${styles.b0}`}>
        <span className={styles.count}>{index + 1}/{total}</span> {ev.title.includes(ev.region) ? ev.when : `${ev.region} · ${ev.when}`}
      </p>
      <h2 className={`${styles.title} ${styles.b0}`} id={id + 'h'}>{ev.title}</h2>

      <div className={styles.turns}>
      <blockquote className={`${styles.quote} ${styles.b1}`}>
        <p>{ev.cause.text}</p>
        <footer>{CAUSE_BY[ev.id]}</footer>
      </blockquote>

      <div className={styles.second}>
      <div className={`${styles.figure} ${styles.b2}`}>
        <p className={styles.num}>
          {fmt(ev.hero.value)} <span className={styles.unit}>{ev.hero.unit === 'hectáreas' ? 'ha' : ev.hero.unit}</span>
        </p>
        <p className={styles.figLabel}>{cap(ev.hero.unit)} {ev.hero.label}</p>
        <span className={styles.total}>Fuente: {ev.hero.src}</span>
      </div>

      <button
        ref={btn}
        type="button"
        className={`${styles.more} ${styles.b3}`}
        aria-haspopup="dialog"
        onClick={() => openDialog(index, btn.current)}
      >
        Más información
        <span aria-hidden="true" className={styles.chev}>+</span>
      </button>
      </div>
      </div>
    </article>
  );
}
