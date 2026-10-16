'use client';
import { useEffect, useRef } from 'react';

export interface FireCurtainProps {
  direction: 'forward' | 'backward';
  mode?: 'heroic' | 'agile';
  duration?: number;
  onFinish: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  isAsh?: boolean;
}

/**
 * FireCurtain: High-performance procedural fire sweep transition.
 *
 * Modes:
 * - 'heroic' (850ms): Dramatic full-screen transition for major milestones (Portada -> Stories, Stories -> Cierre).
 *   At apex (fullness > 0.80), renders a 100% opaque thermal wall and dense smoke veil that completely conceals
 *   the underlying slide DOM change, acting as a flawless cinematic wipe.
 * - 'agile' (380ms): Fast, sleek directional sweep between intermediate chapters.
 *   Provides tactile momentum without blacking out the screen or causing navigation fatigue.
 */
export default function FireCurtain({
  direction = 'forward',
  mode = 'heroic',
  duration = 850,
  onFinish,
}: FireCurtainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onFinish();
      return;
    }

    let animId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener('resize', resize);

    const isForward = direction === 'forward';
    const dirMult = isForward ? 1 : -1;
    const isHeroic = mode === 'heroic';

    // Particle pools for glowing embers and dark drifting ash flakes
    const particles: Particle[] = [];
    const emberColors = [
      '#ffffff',
      '#fffbeb',
      '#fef08a',
      '#f59e0b',
      '#ea580c',
      '#dc2626',
      '#991b1b',
    ];
    const ashColors = ['#1c1917', '#292524', '#44403c', '#78716c'];

    const spawnParticles = (centerX: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const isAsh = Math.random() < 0.28;
        const spreadX = (Math.random() - 0.5) * width * (isAsh ? 0.45 : 0.28);
        const x = centerX + spreadX;
        const y = height * (0.1 + Math.random() * 0.9);
        const maxLife = isAsh
          ? 35 + Math.random() * 45
          : 20 + Math.random() * 35;

        particles.push({
          x,
          y,
          vx: (Math.random() * 8 + 3) * dirMult + (Math.random() - 0.5) * (isAsh ? 6 : 4),
          vy: -(Math.random() * (isAsh ? 4 : 9) + (isAsh ? 1.5 : 3)),
          size: isAsh ? Math.random() * 3.5 + 1.2 : Math.random() * 4 + 1.5,
          life: 0,
          maxLife,
          color: isAsh
            ? ashColors[Math.floor(Math.random() * ashColors.length)]
            : emberColors[Math.floor(Math.random() * emberColors.length)],
          isAsh,
        });
      }
    };

    let startTime: number | null = null;

    const render = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Smooth quintic / cubic easing for natural wave acceleration and deceleration
      const p = progress * progress * (3.0 - 2.0 * progress);

      // Sweep center position across the entire viewport + margins
      const totalSpan = width * 1.55;
      const sweepX = isForward
        ? p * totalSpan - width * 0.28
        : (1.0 - p) * totalSpan - width * 0.28;

      // Fullness curve (0 at start, 1.0 at apex, 0 at end)
      const fullness = Math.sin(p * Math.PI);
      const wallWidth = width * (isHeroic ? 0.45 + fullness * 0.55 : 0.35 + fullness * 0.35);

      ctx.clearRect(0, 0, width, height);

      // =========================================================================
      // LAYER 1: Apex 100% Opaque Veil (Heroic mode only)
      // When fullness > 0.80, this creates an opaque solid wall of fire and dense
      // smoke so that the underlying slide background change is 100% hidden.
      // =========================================================================
      if (isHeroic && fullness > 0.8) {
        // Ramps from 0 to 1.0 at fullness = 1.0 (apex p = 0.5)
        const occlusionAlpha = Math.min(1.0, (fullness - 0.8) / 0.16);

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';

        // Deep thermal carbon background
        ctx.fillStyle = `rgba(18, 10, 7, ${occlusionAlpha})`;
        ctx.fillRect(0, 0, width, height);

        // Blazing central incandescent wall across the full height
        const apexGrad = ctx.createRadialGradient(
          sweepX,
          height * 0.5,
          width * 0.05,
          sweepX,
          height * 0.5,
          width * 0.75
        );
        apexGrad.addColorStop(0, `rgba(255, 250, 220, ${occlusionAlpha * 0.95})`);
        apexGrad.addColorStop(0.2, `rgba(245, 158, 11, ${occlusionAlpha * 0.9})`);
        apexGrad.addColorStop(0.5, `rgba(220, 38, 38, ${occlusionAlpha * 0.85})`);
        apexGrad.addColorStop(0.8, `rgba(127, 29, 29, ${occlusionAlpha * 0.75})`);
        apexGrad.addColorStop(1, `rgba(18, 10, 7, ${occlusionAlpha})`);

        ctx.fillStyle = apexGrad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // =========================================================================
      // LAYER 2: Ambient Thermal Radiation Flash
      // =========================================================================
      ctx.save();
      const flashGrad = ctx.createRadialGradient(
        sweepX,
        height * 0.5,
        width * 0.05,
        sweepX,
        height * 0.5,
        width * 0.85
      );
      const flashAlpha = fullness * (isHeroic ? 0.65 : 0.45);
      flashGrad.addColorStop(0, `rgba(245, 158, 11, ${flashAlpha})`);
      flashGrad.addColorStop(0.35, `rgba(220, 38, 38, ${flashAlpha * 0.75})`);
      flashGrad.addColorStop(0.75, `rgba(40, 10, 5, ${flashAlpha * 0.4})`);
      flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = flashGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // =========================================================================
      // LAYER 3: Main Sweeping Fire Wall (Additive Blend)
      // =========================================================================
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const wallGrad = ctx.createLinearGradient(
        sweepX - wallWidth * 0.5,
        0,
        sweepX + wallWidth * 0.5,
        0
      );

      if (isForward) {
        wallGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        wallGrad.addColorStop(0.2, `rgba(180, 20, 0, ${fullness * 0.7})`);
        wallGrad.addColorStop(0.45, `rgba(245, 90, 0, ${fullness * 0.95})`);
        wallGrad.addColorStop(0.68, `rgba(251, 191, 36, ${fullness * 1.0})`);
        wallGrad.addColorStop(0.85, `rgba(255, 255, 240, ${fullness * 0.95})`);
        wallGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        wallGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        wallGrad.addColorStop(0.15, `rgba(255, 255, 240, ${fullness * 0.95})`);
        wallGrad.addColorStop(0.32, `rgba(251, 191, 36, ${fullness * 1.0})`);
        wallGrad.addColorStop(0.55, `rgba(245, 90, 0, ${fullness * 0.95})`);
        wallGrad.addColorStop(0.8, `rgba(180, 20, 0, ${fullness * 0.7})`);
        wallGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, width, height);

      // =========================================================================
      // LAYER 4: Multi-frequency Turbulent Flame Tongues
      // =========================================================================
      const tongueCount = isHeroic ? 32 : 22;
      const stepY = height / tongueCount;

      for (let i = 0; i <= tongueCount; i++) {
        const y = i * stepY;
        const t1 = elapsed * 0.016 + i * 0.65;
        const t2 = elapsed * 0.024 - i * 0.45;
        const wave = Math.sin(t1) * 38 + Math.cos(t2 * 1.5) * 26 + Math.sin(t1 * 2.8) * 14;
        const tongueTipX = sweepX + (wave + 85 * fullness) * dirMult;

        const tongueGrad = ctx.createRadialGradient(
          tongueTipX,
          y,
          4,
          sweepX,
          y,
          wallWidth * 0.42
        );
        tongueGrad.addColorStop(0, `rgba(255, 255, 235, ${fullness * 0.95})`);
        tongueGrad.addColorStop(0.28, `rgba(251, 191, 36, ${fullness * 0.85})`);
        tongueGrad.addColorStop(0.65, `rgba(220, 38, 38, ${fullness * 0.55})`);
        tongueGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = tongueGrad;
        ctx.beginPath();
        ctx.arc(tongueTipX, y, wallWidth * 0.36, 0, Math.PI * 2);
        ctx.fill();
      }

      // =========================================================================
      // LAYER 5: Flying Incandescent Embers & Textured Ash Flakes
      // =========================================================================
      if (progress < 0.94) {
        spawnParticles(sweepX, Math.floor((isHeroic ? 5 : 3) + fullness * (isHeroic ? 9 : 5)));
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life++;
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.size *= 0.97;

        const particleAlpha = (1.0 - pt.life / pt.maxLife) * fullness;
        if (particleAlpha <= 0 || pt.life >= pt.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = particleAlpha;
        ctx.beginPath();

        if (pt.isAsh) {
          // Ash flakes render as slightly irregular drifting motes
          ctx.ellipse(pt.x, pt.y, Math.max(pt.size * 1.4, 1.2), Math.max(pt.size * 0.8, 0.8), pt.vx * 0.1, 0, Math.PI * 2);
        } else {
          // Glowing embers render as high-speed sparks with light motion trail
          ctx.arc(pt.x, pt.y, Math.max(pt.size, 0.8), 0, Math.PI * 2);
        }
        ctx.fill();
      }

      ctx.restore();

      // Continue or complete
      if (progress < 1.0) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        onFinish();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [direction, mode, duration, onFinish]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99999,
        display: 'block',
      }}
    />
  );
}
