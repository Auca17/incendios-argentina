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
          <img
            src={photo.src}
            alt={photo.caption}
            className={styles.img}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="100%" height="100%" fill="%23141210"/><circle cx="400" cy="230" r="40" fill="%232b2622"/><path d="M385 230a15 15 0 1 0 30 0 15 15 0 0 0-30 0" fill="%23c55221"/><text x="50%" y="300" fill="%239e948c" font-family="monospace" font-size="14" text-anchor="middle" letter-spacing="1">REGISTRO DOCUMENTAL NO DISPONIBLE</text></svg>';
            }}
          />
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
