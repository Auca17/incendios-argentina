'use client';
import { setReturnPoint } from '../lib/returnPoint';
import { scrollToY } from '../lib/smoothScroll';

/**
 * Link to the technical sources section of the same page (#fuentes). It remembers where the reader
 * was, so the section can offer a way back to that exact point.
 */
export default function SourcesLink({ className, label = 'Fuentes' }: { className?: string; label?: string }) {
  return (
    <a
      href="#fuentes"
      className={className}
      onClick={(e) => {
        const el = document.getElementById('fuentes');
        if (!el) return;
        e.preventDefault();
        setReturnPoint(window.scrollY);
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        scrollToY(Math.ceil(el.getBoundingClientRect().top + window.scrollY), !reduced);
        history.replaceState(null, '', '#fuentes');
        el.focus({ preventScroll: true });
      }}
    >
      {label}
    </a>
  );
}
