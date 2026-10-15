import type { Slide } from '../lib/slides';
import AvisoPopover from './AvisoPopover';
import styles from './MapPanel.module.css';

type Props = { p: number; slide: Slide };

/** Phase A placeholder: just the canvas element. TODO(phase B): draw the map from public/data. */
export default function MapPanel({ p, slide }: Props) {
  return (
    <section className={styles.map} aria-label="Mapa">
      <canvas
        className={styles.canvas}
        role="img"
        aria-label="Mapa de Argentina con focos de calor por celda. Para analizar una provincia con teclado, usá el ranking."
      />
      <span className={styles.todo} data-p={p.toFixed(3)} data-slide={slide.type}>
        Mapa: fase B
      </span>
      <AvisoPopover />
    </section>
  );
}
