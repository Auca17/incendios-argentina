'use client';
import { useEffect, useRef } from 'react';
import styles from './CloudCurtain.module.css';

type Props = {
  /** 0 = full clouds covering Argentina partially, 1 = clouds parted */
  openProgress: number;
  /** 0 = open, 1 = clouds returning to close over Argentina before epilogue */
  closeProgress?: number;
};

/**
 * Atmospheric procedural cloud curtain over the persistent cartographic map.
 * - Opening: Translucent cumulus clouds partially veil Argentina, parting smoothly as the user scrolls.
 * - Closing: Clouds naturally return from left and right to veil Argentina after the wide shot.
 * - Confined over the map stage (z-index: 10, behind narrative cards at z-index: 20).
 */
export default function CloudCurtain({ openProgress, closeProgress = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute effective cloud density (1 = veil in place, 0 = fully parted)
  const isClosing = closeProgress > 0.001;
  const density = isClosing
    ? Math.min(1, Math.max(0, closeProgress))
    : Math.max(0, 1 - openProgress * 1.4);

  const densityRef = useRef(density);
  densityRef.current = density;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    // Procedural atmospheric cloud puffs
    interface CloudPuff {
      xRatio: number; // 0..1 relative to canvas width
      yRatio: number; // 0..1 relative to canvas height
      rRatio: number; // relative size
      side: 'left' | 'right';
      vx: number;
      vy: number;
      alpha: number;
    }

    const puffs: CloudPuff[] = [];
    const count = 26;
    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      puffs.push({
        xRatio: isLeft ? 0.05 + Math.random() * 0.45 : 0.50 + Math.random() * 0.45,
        yRatio: Math.random(),
        rRatio: 0.28 + Math.random() * 0.24,
        side: isLeft ? 'left' : 'right',
        vx: (Math.random() - 0.5) * 0.0003,
        vy: -0.0002 - Math.random() * 0.0003,
        alpha: 0.35 + Math.random() * 0.30, // Translucent: allows Argentina to be visible underneath
      });
    }

    const render = () => {
      animId = requestAnimationFrame(render);
      const curDensity = densityRef.current;

      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (w <= 10 || h <= 10) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (curDensity <= 0.005) return;

      // Parting distance: clouds slide horizontally outwards
      const partingX = (1 - curDensity) * w * 0.75;

      puffs.forEach((puff) => {
        puff.xRatio += puff.vx;
        puff.yRatio += puff.vy;

        if (puff.yRatio < -0.3) puff.yRatio = 1.3;
        if (puff.yRatio > 1.3) puff.yRatio = -0.3;

        const px = puff.xRatio * w;
        const py = puff.yRatio * h;
        const r = Math.max(w, h) * puff.rRatio;

        const drawX = puff.side === 'left' ? px - partingX : px + partingX;
        const grad = ctx.createRadialGradient(drawX, py, r * 0.08, drawX, py, r);

        const a = puff.alpha * curDensity;
        // Natural atmospheric cloud tones: ivory-mist center, soft fading edges
        grad.addColorStop(0, `rgba(228, 222, 212, ${a * 0.75})`);
        grad.addColorStop(0.40, `rgba(198, 190, 178, ${a * 0.50})`);
        grad.addColorStop(0.75, `rgba(150, 142, 130, ${a * 0.20})`);
        grad.addColorStop(1, 'rgba(150, 142, 130, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drawX, py, r, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  if (density <= 0.005) return null;

  return (
    <div
      className={styles.curtainWrap}
      style={{
        opacity: Math.min(1, density * 1.5),
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className={styles.cloudCanvas} />
    </div>
  );
}
