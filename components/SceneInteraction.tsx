'use client';
import { useEffect, useRef, useState } from 'react';
import { DEFS, subscribeShown, type Shown } from '../lib/interaction';
import { mapCaption } from '../lib/mapCaptions';
import { TOUR_EVENTS } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import { DESKTOP, podRight } from '../lib/tourLayout';
import { cineShown } from '../lib/cine';
import { block, clearest, marksVersion } from '../lib/placement';
import styles from './SceneInteraction.module.css';

/**
 * The captions of the story, as film subtitles: under a landscape, what its illustrated sequence shows
 * at each stage (lib/interaction.ts); over a map, what advances on it and
 * what the camera does (lib/mapCaptions.ts), centred on the map, clear of the reading column.
 * Over the map each caption takes the top or the bottom of the map, whichever covers fewer foci and
 * keeps clear of the figures panel and of the other caption (lib/placement.ts).
 */
type Side = 'top' | 'bottom';
export default function SceneInteraction() {
  const [shown, setShown] = useState<Shown>(null);
  const [onMap, setOnMap] = useState<{ text: string; left: number }>({ text: '', left: 0 });
  const [sides, setSides] = useState<{ map: Side; seq: Side | null; mapLeft: number }>({ map: 'top', seq: null, mapLeft: 0 });
  const mapRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef<HTMLDivElement>(null);
  useEffect(() => subscribeShown((s) => setShown(s ? { ...s } : null)), []);
  useEffect(() => {
    let seen = '';
    let mapSide: Side = 'top', seqSide: Side = 'bottom';
    return subscribe(({ st, vw, vh }) => {
      const ev = st.chapter >= 0 && st.chapter <= 5 ? TOUR_EVENTS[st.chapter] : null;
      const text = ev && st.land < 0.3 && st.veil < 0.3 ? mapCaption(ev.id, st.chapterT) : '';
      const left = vw >= DESKTOP ? Math.round((podRight(vw) + vw) / 2) : Math.round(vw / 2);
      setOnMap((o) => (o.text === text && o.left === left ? o : { text, left }));
      // the sequence's caption is over the map once its landscape or Chubut's opening has gone
      const overMap = !!ev && st.land < 0.5 && st.veil < 0.5 && !cineShown();
      const key = [marksVersion(), text !== '', overMap, vw, vh].join('|');
      if (key === seen || vw < DESKTOP) return;
      seen = key;
      const boxAt = (el: HTMLDivElement | null, side: Side) => {
        const w = el?.offsetWidth ?? 500, h = el?.offsetHeight ?? 120;
        return { left: left - w / 2, top: side === 'top' ? 24 : vh - 32 - h, width: w, height: h };
      };
      if (text) {
        mapSide = clearest<Side>([['top', boxAt(mapRef.current, 'top')], ['bottom', boxAt(mapRef.current, 'bottom')]], mapSide, 'map');
        block('map', boxAt(mapRef.current, mapSide));
      } else block('map', null);
      if (overMap) {
        seqSide = clearest<Side>([['bottom', boxAt(seqRef.current, 'bottom')], ['top', boxAt(seqRef.current, 'top')]], seqSide, 'seq');
        block('seq', boxAt(seqRef.current, seqSide));
      } else block('seq', null);
      const next = { map: mapSide, seq: overMap ? seqSide : null, mapLeft: left };
      setSides((o) => (o.map === next.map && o.seq === next.seq && o.mapLeft === next.mapLeft ? o : next));
    });
  }, []);

  const d = shown ? DEFS[shown.id] : null;
  const says = d && shown ? d.says[shown.phase] : '';
  return (
    <>
      {/* the torn, burnt edge of the caption paper (used by SceneInteraction.module.css) */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <filter id="burnt-edge" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="4" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="20" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div ref={mapRef} className={`${styles.bar} ${styles.mapBar}${sides.map === 'bottom' ? ' ' + styles.low : ''}${onMap.text ? ' ' + styles.on : ''}`} style={{ left: onMap.left }} aria-live="polite">
        {onMap.text && <p key={onMap.text} className={styles.says}>{onMap.text}</p>}
      </div>
      <div ref={seqRef} className={`${styles.bar}${sides.seq === 'top' ? ' ' + styles.high : ''}${d && says ? ' ' + styles.on : ''}`} style={sides.seq ? { left: sides.mapLeft } : undefined} role="region" aria-label="Escena ilustrada">
        {/* the key restarts the fade when the text changes */}
        {d && says && <p key={shown!.phase} className={styles.says} aria-live="polite">{says}</p>}
      </div>
    </>
  );
}
