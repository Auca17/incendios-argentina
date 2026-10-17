'use client';
import { useEffect, useRef, useState } from 'react';
import { fmt } from '../lib/fire';
import { useReducedMotion } from '../lib/motion';

/** Counts from 0 to `value` once, when the number first enters view (immediately final with reduced motion). */
export default function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced || typeof IntersectionObserver === 'undefined') { setShown(value); return; }
    setShown(0);
    let raf = 0;
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now(), dur = 1300;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        setShown(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [value, reduced]);

  return <span ref={ref} className={className}>{fmt(shown)}</span>;
}
