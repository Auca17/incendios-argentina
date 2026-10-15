'use client';
import { useEffect, useState } from 'react';
import { YEARS } from './router';
import { loadGrid, loadMeta, loadProvinciaMes } from './data';
import { buildNational, type National } from './explore';

type State = { nat: National | null; failed: boolean };
let shared: Promise<National> | null = null;

/** The national data (all yearly grids, province x month, meta), fetched once and shared. */
function loadNational(): Promise<National> {
  if (!shared) {
    shared = Promise.all([loadMeta(), loadProvinciaMes(), ...YEARS.map((y) => loadGrid(y))]).then(
      ([meta, pm, ...grids]) => buildNational(meta, pm, grids),
    );
    shared.catch(() => { shared = null; });
  }
  return shared;
}

/** Starts loading when `enabled` first becomes true (the home and the method screens); stays loaded afterwards. */
export function useNational(enabled: boolean): State {
  const [state, setState] = useState<State>({ nat: null, failed: false });
  useEffect(() => {
    if (!enabled || state.nat) return;
    let live = true;
    loadNational().then(
      (nat) => { if (live) setState({ nat, failed: false }); },
      () => { if (live) setState({ nat: null, failed: true }); },
    );
    return () => { live = false; };
  }, [enabled, state.nat]);
  return state;
}
