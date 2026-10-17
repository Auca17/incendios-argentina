'use client';
import CountUp from './CountUp';
import CloudPod from './CloudPod';
import styles from './StorySection.module.css';

type Props = {
  ev: any;
  index: number;
  total: number;
};


/**
 * Editorial narrative card for each province in the journey.
 * Inscribed directly on a sculpted organic cloud/smoke pod.
 */
export default function StorySection({ ev, index, total }: Props) {
  const mainFacts = ev.facts.slice(0, 3);

  return (
    <CloudPod className={styles.storyPod}>
      <article className={styles.storyContent}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.kickerRow}>
            <span className={styles.kicker}>
              {String(index + 1).padStart(2, '0')} DE {String(total).padStart(2, '0')} · {ev.region.toUpperCase()}
            </span>
            <span className={styles.timeBadge}>{ev.when}</span>
          </div>
          <h2 className={styles.title}>{ev.title}</h2>
        </header>

        {/* Hero Stat: Burnt Surface Area */}
        <div className={styles.statBox}>
          <span className={styles.statPre}>Superficie afectada</span>
          <div className={styles.statNumRow}>
            <CountUp value={ev.hero.value} className={styles.statNum} />
            <span className={styles.statUnit}>{ev.hero.unit}</span>
          </div>
          <p className={styles.statLabel}>{ev.hero.label}</p>
          <span className={styles.statSource}>Fuente: {ev.hero.src}</span>
        </div>

        {/* Lead Narrative & Origin */}
        <div className={styles.proseBlock}>
          <p className={styles.originText}>{ev.cause.text}</p>
          {ev.response && <p className={styles.responseText}>{ev.response}</p>}
        </div>

        {/* Key Documentary Facts */}
        {mainFacts.length > 0 && (
          <div className={styles.factsList}>
            {mainFacts.map((f: [string, string], i: number) => (
              <div key={i} className={styles.factItem}>
                <b className={styles.factFig}>{f[0]}</b>
                <span className={styles.factTxt}>{f[1]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Transition hint */}
        <footer className={styles.footerPrompt} aria-hidden="true">
          <span>El territorio avanza · Desplazá para continuar</span>
        </footer>
      </article>
    </CloudPod>
  );
}
