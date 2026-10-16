'use client';
import { getBioImpact } from '../lib/biodiversity';
import styles from './BiodiversityCard.module.css';

interface BiodiversityCardProps {
  storyId: string;
}

export default function BiodiversityCard({ storyId }: BiodiversityCardProps) {
  const bio = getBioImpact(storyId);
  if (!bio) return null;

  return (
    <article className={`${styles.card} blk`} data-blk aria-label="Impacto ecológico y biodiversidad">
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon} aria-hidden="true">🌱</span>
          <h4 className={styles.title}>Biodiversidad afectada</h4>
        </div>
        <span className={styles.biomeBadge}>{bio.biome}</span>
      </header>

      <div className={styles.grid}>
        <div className={styles.item}>
          <span className={styles.label}>
            <span aria-hidden="true">🌲</span> Flora y cobertura
          </span>
          <p className={styles.desc}>{bio.flora}</p>
        </div>

        <div className={styles.item}>
          <span className={styles.label}>
            <span aria-hidden="true">🐾</span> Fauna vulnerable
          </span>
          <p className={styles.desc}>{bio.fauna}</p>
        </div>
      </div>

      <div className={styles.highlightRow}>
        <span className={styles.highlightLabel}>Impacto ambiental de fondo</span>
        <p className={styles.highlightText}>{bio.highlight}</p>
      </div>

      <footer className={styles.source}>
        <span>Fuente ambiental:</span> <b>{bio.source}</b>
      </footer>
    </article>
  );
}
