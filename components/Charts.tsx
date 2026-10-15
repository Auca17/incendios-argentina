import { YEARS } from '../lib/router';
import { MESES, MESES_L, fmt } from '../lib/fire';
import { FULL, provSeason, provYear, totalYear, type Pm } from '../lib/explore';
import styles from './Charts.module.css';

const ON = '#ffc83d', OFF = '#ff6a1a', AXIS = '#b09d92';

function onKey(fn: () => void) {
  return (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
}

/** Foci per year, one bar each (legacy yearBars). Click or Enter on a bar picks that year. */
export function YearBars({ meta, year, onPick }: { meta: any; year: number | null; onPick: (y: number) => void }) {
  const w = 320, h = 110, bw = 17.5, gap = 3;
  const mx = Math.max(...YEARS.map((y) => totalYear(meta, y)));
  return (
    <svg className={styles.bars} viewBox={`0 0 ${w} ${h}`} role="group" aria-label="Focos de calor por año">
      {YEARS.map((y, i) => {
        const v = totalYear(meta, y), bh = (v / mx) * (h - 30), x = i * (bw + gap) + 2, on = y === year;
        return (
          <g key={y}>
            <rect className={styles.pick} data-y={y} x={x} y={h - 18 - bh} width={bw} height={bh} rx={2}
              fill={on ? ON : OFF} opacity={on ? 1 : 0.55} role="button" tabIndex={0}
              aria-label={`${y}: ${fmt(v)} focos`} aria-pressed={on}
              onClick={() => onPick(y)} onKeyDown={onKey(() => onPick(y))}>
              <title>{`${y}: ${fmt(v)} focos`}</title>
            </rect>
            <text x={x + bw / 2} y={h - 5} fontSize={7.5} fill={AXIS} textAnchor="middle">{String(y).slice(2)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Annual series of one province (legacy provYearsSVG). */
export function ProvYears({ pm, prov, year, onPick }: { pm: Pm; prov: string; year: number; onPick: (y: number) => void }) {
  const w = 320, h = 104, bw = 17.5, gap = 3;
  const vals = YEARS.map((y) => provYear(pm, prov, y));
  const mx = Math.max(...vals) || 1;
  const pk = vals.indexOf(mx);
  return (
    <svg className={styles.bars} viewBox={`0 0 ${w} ${h}`} role="group" aria-label={`Focos de calor por año en ${prov}`}>
      {YEARS.map((y, i) => {
        const v = vals[i], bh = Math.max(1, (v / mx) * (h - 34)), x = i * (bw + gap) + 2, on = y === year;
        return (
          <g key={y}>
            <rect className={styles.pick} data-y={y} x={x} y={h - 18 - bh} width={bw} height={bh} rx={2}
              fill={on ? ON : OFF} opacity={on ? 1 : 0.55} role="button" tabIndex={0}
              aria-label={`${y}: ${fmt(v)} focos`} aria-pressed={on}
              onClick={() => onPick(y)} onKeyDown={onKey(() => onPick(y))}>
              <title>{`${y}: ${fmt(v)} focos`}</title>
            </rect>
            <text x={x + bw / 2} y={h - 5} fontSize={7.5} fill={AXIS} textAnchor="middle">{String(y).slice(2)}</text>
          </g>
        );
      })}
      <text x={pk * (bw + gap) + 2 + bw / 2} y={h - 18 - (h - 34) - 4} fontSize={8.5} fill={ON} textAnchor="middle" fontWeight={700}>{fmt(mx)}</text>
    </svg>
  );
}

/** Seasonality of one province: average of the complete years next to the selected year (legacy provSeasonSVG). */
export function ProvSeason({ pm, prov, year }: { pm: Pm; prov: string; year: number }) {
  const w = 320, h = 104, gw = 25;
  const { avg, sel } = provSeason(pm, prov, year);
  const mx = Math.max(...avg, ...sel.map((v) => v || 0)) || 1;
  const range = `${FULL[0]}–${FULL[FULL.length - 1]}`;
  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Estacionalidad mensual en ${prov}`} className={styles.season}>
        {MESES.map((m, i) => {
          const x = i * (gw + 1.5) + 2;
          const ha = Math.max(1, (avg[i] / mx) * (h - 30));
          const s = sel[i];
          const hs = s === null ? 0 : Math.max(1, (s / mx) * (h - 30));
          return (
            <g key={m}>
              <rect x={x} y={h - 16 - ha} width={11} height={ha} rx={1.5} fill="#8a6a58">
                <title>{`${MESES_L[i]}, promedio ${range}: ${fmt(avg[i])} focos`}</title>
              </rect>
              {s !== null && (
                <rect x={x + 12} y={h - 16 - hs} width={11} height={hs} rx={1.5} fill={OFF}>
                  <title>{`${MESES_L[i]} ${year}: ${fmt(s)} focos`}</title>
                </rect>
              )}
              <text x={x + 11.5} y={h - 4} fontSize={8} fill={AXIS} textAnchor="middle">{m}</text>
            </g>
          );
        })}
      </svg>
      <div className={styles.legend2}>
        <span><i style={{ background: '#8a6a58' }} />promedio {range}</span>
        <span><i style={{ background: OFF }} />{year}{year === 2026 ? ' (hasta el 14/10)' : ''}</span>
      </div>
    </>
  );
}
