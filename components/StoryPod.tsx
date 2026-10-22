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
 * Reading text of one region, fixed on the left of the screen while its scene plays. It is revealed
 * in phases with the scroll (st.pod): place and title first, then the cause quoted with its source,
 * then the hero figure with its source and "Más información" (a dialog with the facts, the sources
 * that disagree, the monthly satellite chart and the photos). It fades with the smoke between regions.
 */
export default function StoryPod({ ev, index, total }: Props) {
  const ref = useRef<HTMLElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => subscribe(({ st }) => {
    const el = ref.current;
    if (!el) return;
    const on = st.chapter === index && st.pod > 0.001 && st.veil < 0.999;
    el.style.setProperty('--p', on ? st.pod.toFixed(3) : '0');
    el.style.opacity = on ? (1 - st.veil).toFixed(3) : '0';
    if (el.dataset.on !== (on ? '1' : '0')) {
      el.dataset.on = on ? '1' : '0';
      el.inert = !on;
    }
  }), [index]);

  return (
    <article ref={ref} className={styles.pod} aria-labelledby={id + 'h'} data-on="0">
      <p className={`${styles.label} ${styles.b0}`}>
        <span className={styles.count}>{index + 1}/{total}</span> {ev.title.includes(ev.region) ? ev.when : `${ev.region} · ${ev.when}`}
      </p>
      <h2 className={`${styles.title} ${styles.b0}`} id={id + 'h'}>{ev.title}</h2>

      <blockquote className={`${styles.quote} ${styles.b1}`}>
        <p>{ev.cause.text}</p>
        <footer>{CAUSE_BY[ev.id]}</footer>
      </blockquote>

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
    </article>
  );
}
