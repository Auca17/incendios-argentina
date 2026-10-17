'use client';
import styles from './CloudPod.module.css';

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: 'story' | 'wide';
};

/**
 * Organic Cloud & Smoke Narrative Pod:
 * Seamless, sculpted silhouette that houses editorial facts directly on a
 * living cloud and smoke plume without rigid tech-card borders or awkward blisters.
 */
export default function CloudPod({ children, className = '', variant = 'story' }: Props) {
  return (
    <div className={`${styles.cloudPodWrap} ${styles[variant]} ${className}`}>
      {/* 1. Organic Billowing Smoke & Cloud Silhouette Backdrop */}
      <div className={styles.cloudBackdrop} aria-hidden="true">
        <div className={styles.smokeCrest} />
        <div className={styles.smokeGlow} />
      </div>

      {/* 2. Editorial Narrative Content */}
      <div className={styles.cloudPodContent}>
        {children}
      </div>
    </div>
  );
}
