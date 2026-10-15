'use client';
import { useEffect, useRef } from 'react';

interface FireCurtainProps {
  direction: 'forward' | 'backward';
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
}

/**
 * FireCurtain: High-performance, bulletproof procedural fire sweep transition.
 * Uses Canvas 2D with 'lighter' composite mode for guaranteed 60fps across all browsers and GPUs.
 *
 * Direction:
 * - 'forward': sweeps Left-to-Right with aerodynamic forward flame tongues and flying ember sparks.
 * - 'backward': sweeps Right-to-Left with reverse aerodynamics.
 */
export default function FireCurtain({
  direction = 'forward',
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

    // Ember particles pool
    const particles: Particle[] = [];
    const colors = [
      '#ffffff',
      '#fffae0',
      '#ffcc00',
      '#ff8800',
      '#ff3b00',
      '#cc1100',
    ];

    const spawnEmbers = (centerX: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const spreadX = (Math.random() - 0.5) * width * 0.25;
        const x = centerX + spreadX;
        const y = height * (0.15 + Math.random() * 0.85);
        const maxLife = 20 + Math.random() * 40;
        particles.push({
          x,
          y,
          vx: (Math.random() * 8 + 3) * dirMult + (Math.random() - 0.5) * 4,
          vy: -(Math.random() * 8 + 4),
          size: Math.random() * 4 + 1.5,
          life: 0,
          maxLife,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    let startTime: number | null = null;

    const render = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Custom smooth-step acceleration curve
      const p = progress * progress * (3.0 - 2.0 * progress);

      // Sweep center position across the entire viewport + margins
      const totalSpan = width * 1.5;
      const sweepX = isForward
        ? p * totalSpan - width * 0.25
        : (1.0 - p) * totalSpan - width * 0.25;

      // Fullness curve (0 at start, 1.0 at apex, 0 at end)
      const fullness = Math.sin(p * Math.PI);
      const wallWidth = width * (0.35 + fullness * 0.45);

      ctx.clearRect(0, 0, width, height);

      // --- Layer 1: Ambient thermal heat flash ---
      ctx.save();
      const flashGrad = ctx.createRadialGradient(
        sweepX,
        height * 0.5,
        width * 0.05,
        sweepX,
        height * 0.5,
        width * 0.8
      );
      const flashAlpha = fullness * 0.55;
      flashGrad.addColorStop(0, `rgba(255, 140, 0, ${flashAlpha})`);
      flashGrad.addColorStop(0.4, `rgba(200, 40, 0, ${flashAlpha * 0.7})`);
      flashGrad.addColorStop(0.8, `rgba(40, 10, 0, ${flashAlpha * 0.4})`);
      flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = flashGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // --- Layer 2: Main sweeping wall of roaring flames ---
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
        wallGrad.addColorStop(0.45, `rgba(255, 90, 0, ${fullness * 0.95})`);
        wallGrad.addColorStop(0.65, `rgba(255, 200, 20, ${fullness * 1.0})`);
        wallGrad.addColorStop(0.8, `rgba(255, 255, 230, ${fullness * 0.95})`);
        wallGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        wallGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        wallGrad.addColorStop(0.2, `rgba(255, 255, 230, ${fullness * 0.95})`);
        wallGrad.addColorStop(0.35, `rgba(255, 200, 20, ${fullness * 1.0})`);
        wallGrad.addColorStop(0.55, `rgba(255, 90, 0, ${fullness * 0.95})`);
        wallGrad.addColorStop(0.8, `rgba(180, 20, 0, ${fullness * 0.7})`);
        wallGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, width, height);

      // --- Layer 3: Organic licking flame tongues ---
      const tongueCount = 28;
      const stepY = height / tongueCount;

      for (let i = 0; i <= tongueCount; i++) {
        const y = i * stepY;
        const timeOffset = elapsed * 0.015 + i * 0.7;
        const wave = Math.sin(timeOffset) * 45 + Math.cos(timeOffset * 1.6) * 30;
        const tongueTipX = sweepX + (wave + 80 * fullness) * dirMult;

        const tongueGrad = ctx.createRadialGradient(
          tongueTipX,
          y,
          5,
          sweepX,
          y,
          wallWidth * 0.4
        );
        tongueGrad.addColorStop(0, `rgba(255, 255, 220, ${fullness * 0.9})`);
        tongueGrad.addColorStop(0.3, `rgba(255, 140, 10, ${fullness * 0.8})`);
        tongueGrad.addColorStop(0.7, `rgba(200, 30, 0, ${fullness * 0.5})`);
        tongueGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = tongueGrad;
        ctx.beginPath();
        ctx.arc(tongueTipX, y, wallWidth * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Layer 4: Top and bottom edge licking tongues ---
      for (let x = sweepX - wallWidth * 0.4; x <= sweepX + wallWidth * 0.4; x += 35) {
        const tWave = Math.sin(x * 0.04 + elapsed * 0.02) * 50 * fullness;
        // Top edge
        const topGrad = ctx.createRadialGradient(x, 0, 2, x, 0, 90 + tWave);
        topGrad.addColorStop(0, `rgba(255, 200, 30, ${fullness * 0.85})`);
        topGrad.addColorStop(0.5, `rgba(220, 50, 0, ${fullness * 0.6})`);
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(x - 30, 0, 60, 120 + tWave);

        // Bottom edge
        const btmGrad = ctx.createRadialGradient(x, height, 2, x, height, 90 + tWave);
        btmGrad.addColorStop(0, `rgba(255, 200, 30, ${fullness * 0.85})`);
        btmGrad.addColorStop(0.5, `rgba(220, 50, 0, ${fullness * 0.6})`);
        btmGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = btmGrad;
        ctx.fillRect(x - 30, height - 120 - tWave, 60, 120 + tWave);
      }

      // --- Layer 5: Flying incandescent sparks & embers ---
      if (progress < 0.92) {
        spawnEmbers(sweepX, Math.floor(4 + fullness * 8));
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life++;
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.size *= 0.96;

        const particleAlpha = (1.0 - pt.life / pt.maxLife) * fullness;
        if (particleAlpha <= 0 || pt.life >= pt.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = particleAlpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(pt.size, 0.8), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Next frame
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
  }, [direction, duration, onFinish]);

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
