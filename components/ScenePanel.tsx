import type { Slide } from '../lib/slides';
import styles from './ScenePanel.module.css';

type Props = { p: number; slide: Slide };

/** Phase A placeholder. TODO(phase D): schematic scene driven by p. */
export default function ScenePanel({ p, slide }: Props) {
  return (
    <section className={styles.scene} aria-label="Escena esquemática">
      <p className={styles.todo}>Escena: fase D</p>
      <div className={styles.track} aria-hidden="true">
        <i style={{ transform: `scaleX(${p})` }} />
      </div>
      <span className="sr-only">{slide.name}</span>
    </section>
  );
}
