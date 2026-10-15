import { forwardRef } from 'react';
import { SLIDES } from '../lib/slides';
import styles from './Sidebar.module.css';

type Props = { index: number; p: number };

const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');

/** Scroll container whose progress drives `p`. Phase A: slide titles and the EVENTS data only. */
const Sidebar = forwardRef<HTMLElement, Props>(function Sidebar({ index, p }, ref) {
  const slide = SLIDES[index];
  return (
    <aside ref={ref} className={styles.side} tabIndex={-1} aria-label="Texto de la pantalla">
      <p className={styles.kicker}>{slide.name}</p>
      {slide.type === 'event' ? (
        <>
          <h2 className={styles.heading}>{slide.ev.title}</h2>
          <p className={styles.when}>{slide.ev.when}</p>
          <p className={styles.hero}>
            <b>{fmt(slide.ev.hero.value)}</b> {slide.ev.hero.unit}
          </p>
          <p>{slide.ev.hero.label}</p>
          <ul className={styles.facts}>
            {slide.ev.facts.map((f: string[]) => (
              <li key={f[0]}>
                <b>{f[0]}</b> {f[1]}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <h2 className={styles.heading}>{slide.type === 'intro' ? 'Seis incendios, 2012–2026' : 'Cómo se hizo'}</h2>
      )}

      <nav className={styles.titles} aria-label="Todas las pantallas">
        <p className={styles.kicker}>Pantallas</p>
        <ol>
          {SLIDES.map((s, i) => (
            <li key={s.name} aria-current={i === index ? 'page' : undefined} className={i === index ? styles.on : undefined}>
              {s.type === 'event' ? s.ev.title : s.name}
            </li>
          ))}
        </ol>
      </nav>

      {/* TODO(phase B): replace with the real chapter text; this readout only proves p is wired. */}
      <p className={styles.debug}>p = {p.toFixed(3)}</p>
    </aside>
  );
});

export default Sidebar;
