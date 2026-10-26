'use client';
import { useEffect, useRef, useState } from 'react';
import { DEFS, begin, exit, firstTime, getRun, isDone, respond, subscribeRun, type Run } from '../lib/interaction';
import { TOUR_EVENTS } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import { cineOk } from '../lib/cine';
import styles from './SceneInteraction.module.css';

/**
 * The controls of the scene interactions (lib/interaction.ts): the spot on the landscape that starts
 * one, and while it runs a quiet bar under the scene with what is happening (read aloud), the next
 * action and the way out (also Escape). When the sequence ends the page is free again and the bar
 * offers to go on with the story or to watch it again.
 */
export default function SceneInteraction() {
  const [run, setRun] = useState<Run>(getRun());
  const [offer, setOffer] = useState<string>('');
  // after a sequence: a quiet "the story goes on" until the reader scrolls (then it is gone for good)
  const [goOn, setGoOn] = useState(false);
  const doneY = useRef<number | null>(null);
  const reduced = useRef(false);
  const spot = useRef<HTMLButtonElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeRun((r) => {
    setRun({ ...r });
    if (r.phase === 'done') { doneY.current = window.scrollY; setGoOn(true); } else { doneY.current = null; setGoOn(false); }
  }), []);

  // the spot is offered only while the region's shot is established (or Chubut's fire at its peak)
  useEffect(() => subscribe(({ st, reduced: rd, scrollY }) => {
    reduced.current = rd;
    if (doneY.current !== null && Math.abs(scrollY - doneY.current) > 40) { doneY.current = null; setGoOn(false); }
    const ev = st.chapter >= 0 && st.chapter <= 5 ? TOUR_EVENTS[st.chapter] : null;
    const d = ev ? DEFS[ev.id] : undefined;
    let on = '';
    if (d && st.veil < 0.05) {
      const w = d.window;
      if (w.landT && st.land > 0.95 && st.landT >= w.landT[0] && st.landT <= w.landT[1]) on = ev.id;
      // Chubut's air drop belongs to its cinematic opening: not offered where that cannot be drawn
      if (w.chapterT && cineOk() && st.chapterT >= w.chapterT[0] && st.chapterT <= w.chapterT[1]) on = ev.id;
    }
    setOffer((o) => (o === on ? o : on));
  }), []);

  // Escape leaves a running sequence
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && getRun().phase !== 'idle' && getRun().phase !== 'done') { e.preventDefault(); exit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const running = run.phase === 'ignite' || run.phase === 'ready' || run.phase === 'respond' || run.phase === 'mid';
  // focus follows the action: into the bar when it starts, back to the spot when the reader leaves
  useEffect(() => {
    if (running) bar.current?.querySelector<HTMLElement>('[data-first]')?.focus({ preventScroll: true });
    // the bar is gone when the sequence ends or is left: focus goes back to the spot in the scene
    else spot.current?.focus({ preventScroll: true });
  }, [running, run.phase]);

  // the bar exists only while a sequence runs: once it is done it fades and the landscape is clear
  const id = running ? run.id : null;
  const d = id ? DEFS[id] : null;
  // the spot: to start, or, once done, a discreet way to watch it again (never while one runs)
  const shownSpot = offer && !running ? offer : '';
  const sd = shownSpot ? DEFS[shownSpot] : null;
  const again = !!shownSpot && isDone(shownSpot);

  return (
    <>
      {sd && (
        <button
          ref={spot}
          type="button"
          className={again ? `${styles.spot} ${styles.again}` : styles.spot}
          // on a landscape the spot is on the fire's ground (placed by the renderer); Chubut's is fixed
          style={shownSpot === 'chubut'
            ? { left: `${sd.spot[0] * 100}%`, top: `${sd.spot[1] * 100}%` }
            : { left: `var(--spot-x, ${sd.spot[0] * 100}%)`, top: `var(--spot-y, ${sd.spot[1] * 100}%)` }}
          onClick={() => begin(shownSpot, reduced.current)}
          aria-label={again ? `${sd.label}. Ya la viste: verla otra vez` : sd.label}
        >
          <i aria-hidden="true" />
          <span>
            {again ? 'Ver otra vez' : sd.cue}
            {/* the first spot of the visit says what will happen; the next ones only name the action */}
            {!again && firstTime() && <small>Escena interactiva · pausa el recorrido</small>}
          </span>
        </button>
      )}

      <p className={goOn && !running ? `${styles.goOn} ${styles.on}` : styles.goOn} aria-hidden={!goOn}>
        El recorrido sigue: deslizá <span aria-hidden="true">↓</span>
      </p>

      <div ref={bar} className={d ? `${styles.bar} ${styles.on}` : styles.bar} role="region" aria-label="Escena interactiva" hidden={!d}>
        {d && (
          <>
            <p className={styles.kicker}>
              <span className={styles.pause} aria-hidden="true" />
              Recorrido en pausa
            </p>
            <span className={styles.progress} aria-hidden="true"><i /></span>
            <p className={styles.says} aria-live="polite">
              {run.phase === 'ready' ? d.says.ready : run.phase === 'respond' || run.phase === 'mid' ? d.says.respond : d.says.ignite}
            </p>
            {run.first && (
              <p className={styles.how}>
                Salís cuando quieras con «Salir»<span className={styles.keys}> o Esc</span>. Al terminar, el recorrido sigue con el scroll.
              </p>
            )}
            <div className={styles.actions}>
              {run.phase === 'ready' && d.respondLabel && (
                <button type="button" className={styles.primary} data-first onClick={respond}>{d.respondLabel}</button>
              )}
              {/* reduced motion: the response is a still stage; the reader moves on to the after */}
              {run.phase === 'mid' && (
                <button type="button" className={styles.primary} data-first onClick={respond}>Ver cómo quedó</button>
              )}
              {running && (
                <button type="button" className={styles.quiet} data-first={run.phase !== 'ready' && run.phase !== 'mid' ? '' : undefined} onClick={exit}>
                  Salir <kbd>Esc</kbd>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
