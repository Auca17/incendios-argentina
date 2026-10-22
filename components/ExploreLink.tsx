'use client';
import { RETURN_KEY } from '../lib/returnPoint';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Link to /explorar that remembers the point of the story, so "Volver a la historia" lands there. */
export default function ExploreLink({ className, label = 'Explorar los datos' }: { className?: string; label?: string }) {
  return (
    <a
      href={BASE + '/explorar/'}
      className={className}
      onClick={() => { try { sessionStorage.setItem(RETURN_KEY, String(Math.round(window.scrollY))); } catch { /* storage blocked */ } }}
    >
      {label}
    </a>
  );
}
