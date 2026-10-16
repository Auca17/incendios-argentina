'use client';
import { useEffect, useRef } from 'react';
import styles from './CloudCurtain.module.css';

type Props = {
  /** 0 = full clouds at opening, 1 = clouds parted */
  openProgress: number;
  /** 0 = open, 1 = clouds returning for the epilogue */
  closeProgress?: number;
};

/**
 * Atmospheric cloud curtain for opening and closing transitions.
 * - Opening: Starts with clouds over Argentina, opens naturally on scroll without buttons or indicators.
 * - Top-left title: "LO QUE EL FUEGO SE LLEVÓ" with subtle Argentine flag ribbon.
 * - Closing: Clouds return smoothly over the calcinated country before the epilogue.
 */
export default function CloudCurtain({ openProgress, closeProgress = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute effective cloud density (1 = fully covered, 0 = fully clear)
  const isClosing = closeProgress > 0.01;
  const density = isClosing
    ? Math.min(1, Math.max(0, closeProgress))
    : Math.max(0, 1 - openProgress * 1.5);

  const densityRef = useRef(density);
  densityRef.current = density;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let w = (cv.width = window.innerWidth);
    let h = (cv.height = window.innerHeight);

    const onResize = () => {
      w = cv.width = window.innerWidth;
      h = cv.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Procedural soft cloud puffs
    interface CloudPuff {
      x: number;
      y: number;
      r: number;
      side: 'left' | 'right';
      vx: number;
      vy: number;
      alpha: number;
    }

    const puffs: CloudPuff[] = [];
    const count = 34;
    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      const x = isLeft ? Math.random() * (w * 0.55) : w * 0.45 + Math.random() * (w * 0.55);
      puffs.push({
        x,
        y: Math.random() * h,
        r: Math.max(w, h) * (0.3 + Math.random() * 0.28),
        side: isLeft ? 'left' : 'right',
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.1 - Math.random() * 0.15,
        alpha: 0.45 + Math.random() * 0.45,
      });
    }

    const render = () => {
      animId = requestAnimationFrame(render);
      const curDensity = densityRef.current;

      ctx.clearRect(0, 0, w, h);
      if (curDensity <= 0.005) return;

      const partingX = (1 - curDensity) * w * 0.65;

      puffs.forEach((puff) => {
        puff.x += puff.vx;
        puff.y += puff.vy;

        if (puff.y + puff.r < 0) puff.y = h + puff.r;
        if (puff.y - puff.r > h) puff.y = -puff.r;

        const drawX = puff.side === 'left' ? puff.x - partingX : puff.x + partingX;
        const grad = ctx.createRadialGradient(
          drawX,
          puff.y,
          puff.r * 0.05,
          drawX,
          puff.y,
          puff.r
        );

        const a = puff.alpha * curDensity;
        grad.addColorStop(0, `rgba(247, 244, 238, ${a * 0.95})`);
        grad.addColorStop(0.45, `rgba(238, 232, 222, ${a * 0.8})`);
        grad.addColorStop(0.75, `rgba(220, 210, 198, ${a * 0.4})`);
        grad.addColorStop(1, 'rgba(220, 210, 198, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drawX, puff.y, puff.r, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  if (density <= 0.01) return null;

  const headerOpacity = Math.max(0, 1 - openProgress * 2.2);

  return (
    <div
      className={styles.curtainWrap}
      style={{
        pointerEvents: density > 0.6 ? 'auto' : 'none',
      }}
      aria-hidden={density <= 0.05}
    >
      <canvas ref={canvasRef} className={styles.cloudCanvas} />

      {/* Elegant Opening Title with Argentine Flag Ribbon Detail */}
      {!isClosing && headerOpacity > 0.01 && (
        <header
          className={styles.openingHeader}
          style={{
            opacity: headerOpacity,
            transform: `translateY(-${openProgress * 40}px)`,
          }}
        >
          <div className={styles.flagRibbon} aria-hidden="true">
            <span className={styles.flagStripeSky} />
            <span className={styles.flagStripeWhite} />
            <span className={styles.flagStripeSky} />
          </div>
          <h1 className={styles.openingTitle}>Lo que el fuego se llevó</h1>
          <p className={styles.openingKicker}>15 años de memoria ambiental · 2012–2026</p>
        </header>
      )}
    </div>
  );
}
