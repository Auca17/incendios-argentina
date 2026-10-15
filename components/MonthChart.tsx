import { MESES, MESES_L, fmt } from '../lib/fire';
import styles from './MonthChart.module.css';

type Props = { series: number[]; provs: string[]; year: number; from: number; to: number };

const W = 300, H = 96, BW = 20, GAP = 4.5;

/** Foci per month (legacy monthChart): months inside the fire window at full opacity, the peak in gold. */
export default function MonthChart({ series, provs, year, from, to }: Props) {
  const mx = Math.max(...series) || 1;
  const peak = series.indexOf(mx);
  return (
    <figure className={styles.chart}>
      <figcaption className={styles.title}>Focos de calor por mes · {provs.join(' + ')} · {year}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Focos de calor por mes">
        {series.map((v, i) => {
          const inRange = i + 1 >= from && i + 1 <= to;
          const bh = Math.max(1, (v / mx) * (H - 40));
          const x = i * (BW + GAP) + 2;
          const future = year === 2026 && i + 1 > 10; // data ends in October 2026
          return (
            <g key={MESES[i]}>
              <rect x={x} y={H - 16 - bh} width={BW} height={bh} rx={2}
                fill={future ? '#2a1d17' : i === peak ? '#ffc83d' : '#ff6a1a'} opacity={inRange ? 1 : 0.35}>
                <title>{MESES_L[i]}: {fmt(v)} focos</title>
              </rect>
              <text x={x + BW / 2} y={H - 3} fontSize={8.5} fill="#b09d92" textAnchor="middle">{MESES[i]}</text>
            </g>
          );
        })}
        <text x={peak * (BW + GAP) + 2 + BW / 2} y={H - 16 - (H - 40) - 4} fontSize={9} fill="#ffc83d" textAnchor="middle" fontWeight={700}>
          {fmt(mx)}
        </text>
      </svg>
      <p className={styles.peak}>Mes con más focos: <b>{MESES_L[peak]}</b> ({fmt(mx)}).</p>
    </figure>
  );
}
