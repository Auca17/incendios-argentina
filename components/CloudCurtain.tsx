'use client';
import { useEffect, useRef } from 'react';
import styles from './CloudCurtain.module.css';

type Props = {
  /** 0 = full Simpsons sky with cumulus clouds, 1 = parted (left bank active, right side clear) */
  openProgress: number;
  /** 0 = normal reading, 1 = closing clouds veil over whole screen before epilogue */
  closeProgress?: number;
};

interface CloudLobe {
  dx: number;    // offset X relative to radius (-1.2 to 1.2)
  dy: number;    // offset Y relative to radius (-0.8 to 0.8)
  rRatio: number; // radius relative to cloud scale
  shade: number; // 0 = sunlit bright white, 0.5 = mid body, 1.0 = underside shadow
}

interface StylizedCloud {
  type: 'left_bank' | 'parting_right';
  xRatio: number; // normalized initial X (0..1)
  yRatio: number; // normalized initial Y (0..1)
  scale: number;  // overall cloud radius in px
  lobes: CloudLobe[];
  vx: number;     // gentle horizontal drift
  vy: number;     // gentle vertical convection
  baseAlpha: number;
}

/**
 * Builds a sculpted, volumetric cumulus cloud inspired by "The Simpsons" and Ghibli skies.
 * Composed of:
 * - Wide, cool shaded underbelly lobes (bottom).
 * - Puffy, billowy ivory-white body lobes (middle).
 * - Brilliant sunlit crest dome lobes (top).
 */
function createVolumetricCloud(
  type: 'left_bank' | 'parting_right',
  initialX: number,
  initialY: number,
  scale: number
): StylizedCloud {
  const lobes: CloudLobe[] = [];

  // 1. Underbelly base shadow lobes (3 lobes, wide and flatter)
  lobes.push({ dx: -0.65, dy: 0.32, rRatio: 0.68, shade: 0.92 });
  lobes.push({ dx: 0.05, dy: 0.38, rRatio: 0.74, shade: 0.88 });
  lobes.push({ dx: 0.72, dy: 0.30, rRatio: 0.65, shade: 0.95 });

  // 2. Mid body lobes (3 to 4 billows)
  lobes.push({ dx: -0.75, dy: 0.02, rRatio: 0.78, shade: 0.52 });
  lobes.push({ dx: -0.25, dy: -0.05, rRatio: 0.88, shade: 0.45 });
  lobes.push({ dx: 0.35, dy: -0.02, rRatio: 0.85, shade: 0.48 });
  lobes.push({ dx: 0.82, dy: 0.05, rRatio: 0.72, shade: 0.55 });

  // 3. Top sunlit billowing dome lobes (3 lofty domes catching direct sunlight)
  lobes.push({ dx: -0.42, dy: -0.38, rRatio: 0.72, shade: 0.08 });
  lobes.push({ dx: 0.12, dy: -0.48, rRatio: 0.84, shade: 0.04 }); // tallest center dome
  lobes.push({ dx: 0.58, dy: -0.32, rRatio: 0.68, shade: 0.12 });

  // 4. Fluffy side accents
  lobes.push({ dx: -1.02, dy: 0.18, rRatio: 0.45, shade: 0.70 });
  lobes.push({ dx: 1.08, dy: 0.15, rRatio: 0.48, shade: 0.72 });

  // Sort: base shadow lobes first, mid lobes second, top domes last
  lobes.sort((a, b) => b.shade - a.shade);

  return {
    type,
    xRatio: initialX,
    yRatio: initialY,
    scale,
    lobes,
    vx: (Math.random() - 0.5) * 0.00016,
    vy: -0.00018 - Math.random() * 0.00022, // gentle convection upward
    baseAlpha: 0.92 + Math.random() * 0.08, // Solid, tangible cartoon presence
  };
}

/**
 * Renders a single volumetric lobe with solid cartoon core and soft atmospheric rim.
 */
function renderVolumetricLobe(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  shade: number,
  alpha: number
) {
  if (r <= 2 || alpha <= 0.015) return;

  const grad = ctx.createRadialGradient(
    cx - r * 0.18,
    cy - r * 0.26,
    r * 0.08,
    cx,
    cy,
    r
  );

  // Compute color based on 3-tier lighting:
  // - Top dome (0.0): #ffffff (pure brilliant sunlit white)
  // - Mid body (0.5): #f2f7fc (clean ivory white)
  // - Shadow underbelly (1.0): #9cb2cc (cool periwinkle slate)
  let rC: number, gC: number, bC: number;
  if (shade < 0.35) {
    rC = 255;
    gC = 255;
    bC = 255;
  } else if (shade < 0.75) {
    const t = (shade - 0.35) / 0.4;
    rC = Math.round(255 - t * 14);
    gC = Math.round(255 - t * 10);
    bC = Math.round(255 - t * 4);
  } else {
    const t = (shade - 0.75) / 0.25;
    rC = Math.round(241 - t * 85);
    gC = Math.round(245 - t * 67);
    bC = Math.round(251 - t * 47);
  }

  // SOLID cartoon core: 0 to 74% radius is opaque; 74% to 100% provides clean antialiased contour
  grad.addColorStop(0, `rgba(${rC}, ${gC}, ${bC}, ${alpha * 0.98})`);
  grad.addColorStop(0.74, `rgba(${rC}, ${gC}, ${bC}, ${alpha * 0.95})`);
  grad.addColorStop(0.90, `rgba(${rC}, ${gC}, ${bC}, ${alpha * 0.55})`);
  grad.addColorStop(1, `rgba(${rC}, ${gC}, ${bC}, 0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Atmospheric Simpsons-Style Cloud Curtain:
 * - Opening: Starts immersed in a radiant celestial blue sky with sculpted, puffy cumulus clouds.
 * - Parting: As user scrolls, center and right clouds fly out to the right like The Simpsons intro, clearing the satellite map.
 * - Left Bank: Left clouds stay, clustering in the left ~42vw column as living atmospheric clouds/smoke behind the story pods.
 * - Closing: Clouds billow back across the whole screen before the epilogue.
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
    // Flank the left side (-0.1 to 0.38) and remain active throughout the narrative.
    const leftCount = 12;
    for (let i = 0; i < leftCount; i++) {
      const x = -0.06 + (i / leftCount) * 0.40 + (Math.random() - 0.5) * 0.06;
      const y = (i / leftCount) * 1.25 - 0.12 + (Math.random() - 0.5) * 0.1;
      const scale = 125 + Math.random() * 85;
      clouds.push(createVolumetricCloud('left_bank', x, y, scale));
    }

    // 2. Parting Right/Center Clouds (The Simpsons opening veil):
    // Fill the center and right sky in the opening, and fly out to the right when scrolling.
    const rightCount = 16;
    for (let i = 0; i < rightCount; i++) {
      const x = 0.22 + (i / rightCount) * 0.86 + (Math.random() - 0.5) * 0.08;
      const y = (i / rightCount) * 1.20 - 0.10 + (Math.random() - 0.5) * 0.12;
      const scale = 140 + Math.random() * 100;
      clouds.push(createVolumetricCloud('parting_right', x, y, scale));
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
      // Vivid celestial daytime sky. Fades out smoothly as the user descends into the territory.
      if (curOpen < 0.98 && !isClosing) {
        const skyAlpha = Math.max(0, 1 - curOpen * 1.25);
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, `rgba(22, 92, 185, ${skyAlpha * 0.96})`); // deep royal sky
        skyGrad.addColorStop(0.42, `rgba(50, 142, 235, ${skyAlpha * 0.92})`); // Simpsons azure
        skyGrad.addColorStop(0.78, `rgba(125, 195, 252, ${skyAlpha * 0.85})`);
        skyGrad.addColorStop(1, `rgba(180, 225, 255, ${skyAlpha * 0.75})`); // soft horizon

        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // ================= B. VOLUMETRIC CUMULUS CLOUDS =================
      const partingProgress = Math.min(1, Math.max(0, curOpen));
      const partingX = Math.pow(partingProgress, 0.8) * (w * 1.15);

      clouds.forEach((cloud) => {
        // Continuous organic drift
        cloud.xRatio += cloud.vx;
        cloud.yRatio += cloud.vy;

        // Wrap around vertically
        if (cloud.yRatio < -0.35) {
          cloud.yRatio = 1.35;
          cloud.xRatio += (Math.random() - 0.5) * 0.05;
        }
        if (cloud.yRatio > 1.35) {
          cloud.yRatio = -0.35;
        }

        let cx = cloud.xRatio * w;
        let cy = cloud.yRatio * h;
        let effectiveAlpha = 0;

        if (isClosing) {
          // Closing mode: clouds billow back from both sides across the whole screen
          const closeParting = (1 - curClose) * w * 0.95;
          cx = cloud.type === 'left_bank' ? cx - closeParting : cx + closeParting;
          effectiveAlpha = cloud.baseAlpha * curClose;
        } else if (cloud.type === 'parting_right') {
          // Right & center clouds fly off to the right like The Simpsons opening
          cx += partingX;
          const fadeOut = Math.max(0, 1 - partingProgress * 1.28);
          effectiveAlpha = cloud.baseAlpha * fadeOut;
        } else {
          // Left persistent bank:
          // In opening: covers left sky (alpha ~ 0.95).
          // When opened: stays as living atmospheric cloud/smoke bank on the left (alpha ~ 0.45 - 0.55).
          // Pull gently inward to left margin as parting occurs to keep map 100% clear:
          const targetX = cloud.xRatio * (1 - partingProgress * 0.45);
          cx = targetX * w;
          const maxAllowedCx = w * 0.22;
          if (cx > maxAllowedCx) {
            cx = maxAllowedCx;
          }
          const openAlpha = 0.45 + (1 - partingProgress) * 0.52;
          effectiveAlpha = cloud.baseAlpha * openAlpha;
        }

        if (effectiveAlpha <= 0.015) return;

        // Render each lobe of the cloud
        const baseRadius = cloud.scale;

        cloud.lobes.forEach((lobe) => {
          const lx = cx + lobe.dx * baseRadius;
          const ly = cy + lobe.dy * baseRadius;
          const lr = baseRadius * lobe.rRatio;

          renderVolumetricLobe(ctx, lx, ly, lr, lobe.shade, effectiveAlpha);
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
