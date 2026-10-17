'use client';
import { useEffect, useRef } from 'react';
import styles from './CloudCurtain.module.css';

type Props = {
  /** 0 = full cloud cover over Argentina, 1 = clouds parted */
  openProgress: number;
  /** 0 = open, 1 = clouds returning to close over Argentina before epilogue */
  closeProgress?: number;
};

/**
 * Cinematic edge-to-edge procedural cloud veil for Opening and Epilogue closing.
 * - Portada: A majestic, dense yet soft white atmospheric cloud blanket spanning edge-to-edge.
 * - Argentina is subtly recognizable through breaks in the cloud cover.
 * - Sincronizado: Clouds part outwards to left & right smoothly with scroll as camera approaches Misiones.
 * - Return: After the wide shot, clouds billow back in to veil the continent before the epilogue.
 * - Canvas remains permanently mounted for instant 60 FPS bidirectional responsiveness.
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
    let w = (cv.width = window.innerWidth);
    let h = (cv.height = window.innerHeight);

    const onResize = () => {
      w = cv.width = window.innerWidth;
      h = cv.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Multi-layered procedural cumulus puffs spanning edge-to-edge
    interface CloudPuff {
      xRatio: number; // 0..1 relative to viewport width
      yRatio: number; // 0..1 relative to viewport height
      rRatio: number; // relative size
      side: 'left' | 'right';
      vx: number;
      vy: number;
      alpha: number;
      lightness: number;
    }

    const puffs: CloudPuff[] = [];
    const count = 46;
    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      puffs.push({
        xRatio: isLeft ? Math.random() * 0.58 : 0.42 + Math.random() * 0.58,
        yRatio: Math.random() * 1.05,
        rRatio: 0.26 + Math.random() * 0.32,
        side: isLeft ? 'left' : 'right',
        vx: (Math.random() - 0.5) * 0.0004,
        vy: -0.00015 - Math.random() * 0.00025,
        alpha: 0.45 + Math.random() * 0.42,
        lightness: 238 + Math.floor(Math.random() * 17),
      });
    }

    const render = () => {
      animId = requestAnimationFrame(render);
      const curDensity = densityRef.current;

      ctx.clearRect(0, 0, w, h);
      if (curDensity <= 0.002) return;

      // Parting distance: clouds billow outwards laterally
      const partingX = (1 - curDensity) * w * 0.85;

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
        const l = puff.lightness;

        // Illuminated cloud tones: pure white bright crests, soft ivory body, fading mist borders
        grad.addColorStop(0, `rgba(${l}, ${l}, ${l}, ${a * 0.85})`);
        grad.addColorStop(0.35, `rgba(${l - 12}, ${l - 10}, ${l - 8}, ${a * 0.65})`);
        grad.addColorStop(0.70, `rgba(185, 192, 200, ${a * 0.28})`);
        grad.addColorStop(1, 'rgba(170, 180, 190, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drawX, py, r, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const visible = density > 0.002;

  return (
    <div
      className={styles.curtainWrap}
      style={{
        opacity: Math.min(1, density * 1.5),
        visibility: visible ? 'visible' : 'hidden',
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className={styles.cloudCanvas} />
    </div>
  );
}
