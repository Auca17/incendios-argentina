import styles from './ScrollCue.module.css';

/** "Seguí bajando" cue at the bottom of the text column; hidden once the reader starts scrolling. */
export default function ScrollCue({ hidden }: { hidden: boolean }) {
  if (hidden) return null;
  return (
    <div className={styles.cue} aria-hidden="true">
      <span>
        Seguí bajando: el fuego avanza <i />
      </span>
    </div>
  );
}
