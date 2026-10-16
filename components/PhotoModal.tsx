'use client';
import { useEffect } from 'react';
import type { StoryPhoto } from '../lib/photos';
import styles from './PhotoModal.module.css';

type Props = {
  photo: StoryPhoto | null;
  onClose: () => void;
};

export default function PhotoModal({ photo, onClose }: Props) {
  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photo, onClose]);

  if (!photo) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Fotografía documental en alta resolución"
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Cerrar fotografía"
        >
          ✕
        </button>
        <div className={styles.imgWrap}>
          <img src={photo.src} alt={photo.caption} className={styles.img} />
        </div>
        <div className={styles.meta}>
          <p className={styles.caption}>{photo.caption}</p>
          <div className={styles.creditsRow}>
            <span>
              Fuente:{' '}
              {photo.sourceUrl ? (
                <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {photo.credit}
                </a>
              ) : (
                photo.credit
              )}
            </span>
            <span className={styles.licenseTag}>{photo.license}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
