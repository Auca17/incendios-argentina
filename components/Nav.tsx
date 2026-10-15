import type { Slide } from '../lib/slides';
import styles from './Nav.module.css';

type Props = { index: number; slides: Slide[]; onGo: (i: number) => void; onStep: (delta: number) => void };

export default function Nav({ index, slides, onGo, onStep }: Props) {
  return (
    <nav className={styles.nav} aria-label="Navegación">
      <button className={styles.arrow} onClick={() => onStep(-1)} disabled={index === 0} aria-label="Anterior">
        ←
      </button>
      <div className={styles.dots} role="group" aria-label="Pantallas">
        {slides.map((s, i) => (
          <button
            key={s.name}
            className={i === index ? `${styles.dot} ${styles.on}` : styles.dot}
            onClick={() => onGo(i)}
            title={s.name}
            aria-label={`${i + 1}: ${s.name}`}
            aria-current={i === index ? 'page' : undefined}
          />
        ))}
      </div>
      <button className={styles.arrow} onClick={() => onStep(1)} disabled={index === slides.length - 1} aria-label="Siguiente">
        →
      </button>
    </nav>
  );
}
