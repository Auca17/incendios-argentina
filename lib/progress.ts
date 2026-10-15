'use client';
import { useEffect, useState, type RefObject } from 'react';
import { READ_0, clamp, type Read } from './fire';

/** Where the reading line sits in the scroll container, as a fraction of its height (legacy: 0.4). */
const LINE_DESKTOP = 0.4;
const LINE_MOBILE = 0.3;

/**
 * Reading progress of a scroll container: p (0..1) plus the p at which chapter headings #ch-fire and
 * #ch-fight reach the reading line, so the scene stages line up with the text (legacy readProgress).
 * One rAF per frame, passive listeners, re-measured on resize and when the content height changes
 * (e.g. a "Ver más" is opened). `resetKey` (the chapter) scrolls back to the top.
 */
export function useReadProgress(ref: RefObject<HTMLElement | null>, resetKey?: unknown): Read {
  const [read, setRead] = useState<Read>(READ_0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const small = window.matchMedia('(max-width: 899.98px)');
    let raf = 0;
    const measure = () => {
      raf = 0;
      const top = el.scrollTop;
      const vh = el.clientHeight;
      const max = el.scrollHeight - vh;
      const line = (small.matches ? LINE_MOBILE : LINE_DESKTOP) * vh;
      const off = el.getBoundingClientRect().top;
      const at = (id: string) => {
        const n = el.querySelector('#' + id);
        return n ? clamp((n.getBoundingClientRect().top - off + top - line) / (max || 1), 0, 1) : null;
      };
      let a = at('ch-fire');
      let b = at('ch-fight');
      if (a === null || b === null || !(a > 0 && b > a && b < 1)) { a = READ_0.a; b = READ_0.b; }
      const p = max > 0 ? clamp(top / max, 0, 1) : 0;
      setRead((prev) =>
        Math.abs(prev.p - p) < 0.0005 && Math.abs(prev.a - a) < 0.0005 && Math.abs(prev.b - b) < 0.0005 ? prev : { p, a, b });
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    el.scrollTop = 0;
    measure();
    el.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (ro) {
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
    }
    return () => {
      el.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, resetKey]);

  return read;
}
