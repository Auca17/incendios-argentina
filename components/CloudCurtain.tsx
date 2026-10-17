'use client';
import { useEffect, useRef } from 'react';
import styles from './CloudCurtain.module.css';

type Props = {
  /** 0 = full Simpsons sky with clouds, 1 = parted (left bank active, right side clear) */
  openProgress: number;
  /** 0 = normal reading, 1 = closing clouds veil over whole screen before epilogue */
  closeProgress?: number;
};

interface CloudLobe {
  dx: number; // offset from center (-1 to 1 relative to radius)
  dy: number;
  r: number;  // radius relative to cloud scale
  shade: number; // 0 = sunlit bright top, 1 = shaded bottom
}

interface StylizedCloud {
  type: 'left_bank' | 'parting_right';
  xRatio: number; // normalized position (0..1)
  yRatio: number;
  scale: number;  // base radius in px
  lobes: CloudLobe[];
  vx: number;     // horizontal drift
  vy: number;     // vertical convection
  baseAlpha: number;
  pulsePhase: number;
}

/**
 * Builds a puffy, multi-lobed cumulus cloud cluster inspired by "The Simpsons" opening.
 * Combines wide shaded base lobes with bright, fluffy sunlit dome lobes.
 */
function createCumulusCloud(type: 'left_bank' | 'parting_right', initialX: number, initialY: number, scale: number): StylizedCloud {
  const lobes: CloudLobe[] = [];

  // Bottom shaded base lobes (2 to 3)
  const baseCount = 3;
  for (let b = 0; b < baseCount; b++) {
    lobes.push({
      dx: (b - 1) * 0.55 + (Math.random() - 0.5) * 0.15,
      dy: 0.25 + Math.random() * 0.15,
      r: 0.65 + Math.random() * 0.25,
      shade: 0.85 + Math.random() * 0.15,
    });
  }

  // Mid fluffy body lobes (3 to 4)
  const midCount = 3;
  for (let m = 0; m < midCount; m++) {
    lobes.push({
      dx: (m - 1) * 0.6 + (Math.random() - 0.5) * 0.2,
      dy: -0.05 + (Math.random() - 0.5) * 0.2,
      r: 0.75 + Math.random() * 0.3,
      shade: 0.4 + Math.random() * 0.3,
    });
  }

  // Top sunlit billowing dome lobes (2 to 3)
  const topCount = 3;
  for (let t = 0; t < topCount; t++) {
    lobes.push({
      dx: (t - 1) * 0.45 + (Math.random() - 0.5) * 0.2,
      dy: -0.45 - Math.random() * 0.25,
      r: 0.70 + Math.random() * 0.35,
      shade: 0.05 + Math.random() * 0.2,
    });
  }

  // Sort lobes by shade descending so bottom shaded lobes render first, followed by top domes
  lobes.sort((a, b) => b.shade - a.shade);

  return {
    type,
    xRatio: initialX,
    yRatio: initialY,
    scale,
    lobes,
    vx: (Math.random() - 0.5) * 0.00018,
    vy: -0.00015 - Math.random() * 0.00025, // gentle upward convection
    baseAlpha: 0.65 + Math.random() * 0.30,
    pulsePhase: Math.random() * Math.PI * 2,
  };
}

/**
 * Atmospheric Simpsons-Style Cloud Curtain:
 * - Opening: Starts immersed in a radiant blue sky with fluffy white cumulus clouds.
 * - Parting: As user scrolls, center and right clouds fly out to the right, clearing the satellite map.
 * - Left Bank: Left clouds stay, clustering in the left ~42vw column as a living atmospheric cloud/smoke bank behind the story cards.
 * - Closing: Clouds billow back from both sides over the whole screen before the epilogue.
 */
export default function CloudCurtain({ openProgress, closeProgress = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const openRef = useRef(openProgress);
  openRef.current = openProgress;
  const closeRef = useRef(closeProgress);
  closeRef.current = closeProgress;

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

    const clouds: StylizedCloud[] = [];

    // 1. Persistent Left Bank Clouds:
    // Placed from x = -0.08 to 0.40. These stay on the left margin throughout the entire narrative.
    const leftCount = 14;
    for (let i = 0; i < leftCount; i++) {
      const x = -0.06 + (i / leftCount) * 0.44 + (Math.random() - 0.5) * 0.08;
      const y = (i / leftCount) * 1.2 - 0.1 + (Math.random() - 0.5) * 0.12;
      const scale = 110 + Math.random() * 95;
      clouds.push(createCumulusCloud('left_bank', x, y, scale));
    }

    // 2. Parting Right/Center Clouds (The Simpsons opening veil):
    // Placed from x = 0.28 to 1.12. Fly out to the right when openProgress increases.
    const rightCount = 18;
    for (let i = 0; i < rightCount; i++) {
      const x = 0.26 + (i / rightCount) * 0.82 + (Math.random() - 0.5) * 0.1;
      const y = (i / rightCount) * 1.15 - 0.08 + (Math.random() - 0.5) * 0.15;
      const scale = 130 + Math.random() * 110;
      clouds.push(createCumulusCloud('parting_right', x, y, scale));
    }

    const render = () => {
      animId = requestAnimationFrame(render);

      const curOpen = openRef.current;
      const curClose = closeRef.current;
      const isClosing = curClose > 0.001;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // ================= A. SIMPSONS CELESTIAL SKY GRADIENT =================
      // In the opening, draw radiant daytime sky. Fades out smoothly as user scrolls into the map.
      if (curOpen < 0.98 && !isClosing) {
        const skyAlpha = Math.max(0, 1 - curOpen * 1.2);
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, `rgba(30, 115, 205, ${skyAlpha * 0.95})`);
        skyGrad.addColorStop(0.4, `rgba(65, 155, 235, ${skyAlpha * 0.90})`);
        skyGrad.addColorStop(0.75, `rgba(130, 195, 250, ${skyAlpha * 0.82})`);
        skyGrad.addColorStop(1, `rgba(175, 220, 255, ${skyAlpha * 0.70})`);

        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // ================= B. SIMPSONS CUMULUS CLOUDS =================
      const partingProgress = Math.min(1, Math.max(0, curOpen));
      const partingX = Math.pow(partingProgress, 0.82) * (w * 1.05);

      clouds.forEach((cloud) => {
        // Continuous ambient drift
        cloud.xRatio += cloud.vx;
        cloud.yRatio += cloud.vy;

        // Wrap around vertically with gentle random horizontal nudge
        if (cloud.yRatio < -0.3) {
          cloud.yRatio = 1.3;
          cloud.xRatio += (Math.random() - 0.5) * 0.06;
        }
        if (cloud.yRatio > 1.3) {
          cloud.yRatio = -0.3;
        }

        let cx = cloud.xRatio * w;
        let cy = cloud.yRatio * h;
        let effectiveAlpha = 0;

        if (isClosing) {
          // Closing mode: clouds billow back from both sides across the entire screen
          const closeParting = (1 - curClose) * w * 0.9;
          cx = cloud.type === 'left_bank' ? cx - closeParting : cx + closeParting;
          effectiveAlpha = cloud.baseAlpha * curClose;
        } else if (cloud.type === 'parting_right') {
          // Right & center clouds fly off to the right like The Simpsons opening
          cx += partingX;
          const fadeOut = Math.max(0, 1 - partingProgress * 1.25);
          effectiveAlpha = cloud.baseAlpha * fadeOut;
        } else {
          // Left persistent bank:
          // In opening: covers left sky (alpha ~ 0.85).
          // When opened: stays as living atmospheric cloud/smoke bank on the left (alpha ~ 0.42 - 0.52).
          const leftBoundMax = w * 0.42;
          if (cx > leftBoundMax) {
            cx = leftBoundMax - (cx - leftBoundMax) * 0.4;
          }
          const openAlpha = 0.42 + (1 - partingProgress) * 0.48;
          effectiveAlpha = cloud.baseAlpha * openAlpha;
        }

        if (effectiveAlpha <= 0.015) return;

        // Draw each cumulus cloud cluster
        const baseRadius = cloud.scale;

        cloud.lobes.forEach((lobe) => {
          const lx = cx + lobe.dx * baseRadius;
          const ly = cy + lobe.dy * baseRadius;
          const lr = baseRadius * lobe.r;

          if (lr <= 1) return;

          const grad = ctx.createRadialGradient(
            lx - lr * 0.15,
            ly - lr * 0.25,
            lr * 0.05,
            lx,
            ly,
            lr
          );

          // Lobe shading: 0 = bright sunlit white top, 1 = shadowed underside
          const s = lobe.shade;
          const rVal = Math.round(255 - s * 45);
          const gVal = Math.round(255 - s * 40);
          const bVal = Math.round(255 - s * 25);

          // Highlights & soft volumetric occlusion
          grad.addColorStop(0, `rgba(${rVal}, ${gVal}, ${bVal}, ${effectiveAlpha * 0.92})`);
          grad.addColorStop(0.55, `rgba(${rVal - 10}, ${gVal - 8}, ${bVal - 5}, ${effectiveAlpha * 0.75})`);
          grad.addColorStop(0.85, `rgba(${rVal - 25}, ${gVal - 20}, ${bVal - 12}, ${effectiveAlpha * 0.32})`);
          grad.addColorStop(1, `rgba(${rVal - 30}, ${gVal - 25}, ${bVal - 15}, 0)`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(lx, ly, lr, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className={styles.curtainWrap} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.cloudCanvas} />
    </div>
  );
}
