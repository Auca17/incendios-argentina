import { SITE_TITLE } from '../lib/slides';
import styles from './TopBar.module.css';

type Props = { index: number; count: number; name: string };

export default function TopBar({ index, count, name }: Props) {
  return (
    <header className={styles.bar}>
      <span className={styles.dot} aria-hidden="true" />
      <h1 className={styles.title}>{SITE_TITLE}</h1>
      <span className={styles.chapter}>
        {name}
      </span>
    </header>
  );
}
