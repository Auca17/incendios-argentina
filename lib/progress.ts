'use client';
import { useEffect, useState, type RefObject } from 'react';

/**
 * Scroll progress (0..1) of a scroll container. One rAF per frame, passive listener.
 * `resetKey` (e.g. the current chapter) scrolls back to the top and resets p to 0 when it changes.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, resetKey?: unknown): number {
  const [p, setP] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const max = el.scrollHeight - el.clientHeight;
      const v = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      setP((prev) => (Math.abs(prev - v) < 0.0005 ? prev : v));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    el.scrollTop = 0;
    measure();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, resetKey]);

  return p;
}
