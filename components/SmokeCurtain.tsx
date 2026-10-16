'use client';
import { useEffect, useRef } from 'react';
import styles from './SmokeCurtain.module.css';

type Props = {
  progress: number; // 0 (closed) to 1 (fully parted)
  onStartClick?: () => void;
};

/**
 * Volumetric atmospheric smoke & cloud curtain for the landing opener.
 * The clouds billow and part laterally to the left and right as the user scrolls.
 */
export default function SmokeCurtain({ progress, onStartClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (cv.width = window.innerWidth);
    let height = (cv.height = window.innerHeight);

    const onResize = () => {
      width = cv.width = window.innerWidth;
      height = cv.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Procedural cloud/smoke puffs
    interface Puff {
      x: number;
      y: number;
      r: number;
      baseX: number;
      side: 'left' | 'right';
      vx: number;
      vy: number;
      alpha: number;
      hue: number;
    }

    const puffs: Puff[] = [];
    const count = 38;
    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      const baseX = isLeft
        ? Math.random() * (width * 0.55)
        : width * 0.45 + Math.random() * (width * 0.55);
      puffs.push({
        x: baseX,
        y: Math.random() * height,
        baseX,
        side: isLeft ? 'left' : 'right',
        r: Math.max(width, height) * (0.28 + Math.random() * 0.25),
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.15 - Math.random() * 0.2,
        alpha: 0.45 + Math.random() * 0.4,
        hue: 25 + Math.random() * 15, // warm ash, amber and cream smoke tones
      });
    }

    const render = () => {
      animId = requestAnimationFrame(render);
      const p = Math.min(1, Math.max(0, progressRef.current));

      ctx.clearRect(0, 0, width, height);

      // Parting distance multiplier
      const partingDist = p * width * 0.75;
      const curtainAlpha = Math.max(0, 1 - p * 1.3);

      if (curtainAlpha <= 0.01) return;

      for (let i = 0; i < puffs.length; i++) {
        const puff = puffs[i];
        puff.y += puff.vy;
        puff.x += puff.vx;

        // Wrap vertically
        if (puff.y + puff.r < 0) puff.y = height + puff.r;
        if (puff.y - puff.r > height) puff.y = -puff.r;

        // Parting displacement
        const offset = puff.side === 'left' ? -partingDist : partingDist;
        const drawX = puff.x + offset;
        const drawY = puff.y;

        const grad = ctx.createRadialGradient(
          drawX,
          drawY,
          puff.r * 0.05,
          drawX,
          drawY,
          puff.r
        );

        // Warm light cream / ivory / smoky ash colors
        const a = puff.alpha * curtainAlpha;
        grad.addColorStop(0, `rgba(246, 241, 233, ${a})`);
        grad.addColorStop(0.45, `rgba(235, 227, 215, ${a * 0.85})`);
        grad.addColorStop(0.75, `rgba(215, 203, 190, ${a * 0.45})`);
        grad.addColorStop(1, 'rgba(215, 203, 190, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drawX, drawY, puff.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const parting = Math.min(1, Math.max(0, progress));
  const textOpacity = Math.max(0, 1 - parting * 2.2);
  const textTranslateY = -parting * 60;
  const isVisible = progress < 0.95;

  if (!isVisible) return null;

  return (
    <div
      className={styles.curtainContainer}
      style={{
        opacity: Math.max(0, 1 - (progress - 0.75) / 0.2),
        pointerEvents: progress > 0.4 ? 'none' : 'auto',
      }}
      aria-hidden={progress > 0.4}
    >
      <canvas ref={canvasRef} className={styles.smokeCanvas} />

      {/* Atmospheric center hero card emerging through the smoke */}
      <div
        className={styles.heroOverlay}
        style={{
          opacity: textOpacity,
          transform: `translateY(${textTranslateY}px)`,
        }}
      >
        <div className={styles.cloudCard}>
          <span className={styles.kicker}>Argentina · 2012–2026</span>
          <h1 className={styles.title}>
            Lo que el fuego
            <br />
            se llevó
          </h1>
          <p className={styles.subtitle}>
            Entre 2012 y 2026, el humo cubrió el país. Los satélites de la NASA detectaron{' '}
            <b>2.620.568 focos de calor</b> en suelo argentino.
          </p>
          <div className={styles.callout}>
            <span className={styles.scrollHint}>
              <span className={styles.scrollArrow}>↓</span>
              Scrolleá para abrir las nubes y descender a las provincias
            </span>
            {onStartClick && (
              <button
                type="button"
                className={styles.startBtn}
                onClick={onStartClick}
              >
                Comenzar recorrido
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
