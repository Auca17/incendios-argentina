'use client';
import { useState } from 'react';
import { MESES, MESES_L, fmt } from '../lib/fire';
import styles from './MonthChart.module.css';

type Props = {
  series: number[];
  provs: string[];
  year: number;
  from: number;
  to: number;
};

const W = 320, H = 120, BW = 19, GAP = 5;

/**
 * MonthChart: Impeccable editorial histogram of monthly heat anomalies (foci).
 * Features rich SVG gradients (incandescent gold peak, blazing fire active window),
 * interactive bar inspection, and clear narrative peak highlighting.
 */
export default function MonthChart({ series, provs, year, from, to }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const mx = Math.max(...series) || 1;
  const peak = series.indexOf(mx);

  const activeIdx = hovered !== null ? hovered : peak;
  const activeVal = series[activeIdx] ?? mx;

  return (
    <figure className={styles.chartCard} aria-label={`Focos de calor por mes en ${provs.join(', ')} durante ${year}`}>
      <div className={styles.header}>
        <div className={styles.headerTitles}>
          <span className={styles.badge}>Distribución temporal</span>
          <figcaption className={styles.title}>
            Focos por mes · {provs.join(' + ')} · {year}
          </figcaption>
        </div>
        <div className={styles.inspectBox}>
          <span className={styles.inspectMonth}>{MESES_L[activeIdx]}</span>
          <span className={styles.inspectCount}>{fmt(activeVal)} focos</span>
        </div>
      </div>

      <div className={styles.svgWrap}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          className={styles.svg}
          aria-label="Histograma mensual de focos satelitales"
        >
          <defs>
            {/* Peak month glowing gradient */}
            <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff2a8" />
              <stop offset="30%" stopColor="#ffc83d" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* In-range active fire window gradient */}
            <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff8533" />
              <stop offset="60%" stopColor="#e64a00" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Baseline inactive months */}
            <linearGradient id="idleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d2a22" />
              <stop offset="100%" stopColor="#1e1410" />
            </linearGradient>

            {/* Glowing filter for the peak bar */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Reference baseline */}
          <line
            x1="0"
            y1={H - 20}
            x2={W}
            y2={H - 20}
            stroke="rgba(255, 255, 255, 0.12)"
            strokeDasharray="2 2"
          />

          {series.map((v, i) => {
            const inRange = i + 1 >= from && i + 1 <= to;
            const isPeak = i === peak;
            const isHover = hovered === i;
            const bh = Math.max(2, (v / mx) * (H - 46));
            const x = i * (BW + GAP) + 12;
            const future = year === 2026 && i + 1 > 10;

            let fill = 'url(#idleGrad)';
            let opacity = 0.55;

            if (isPeak) {
              fill = 'url(#peakGrad)';
              opacity = 1.0;
            } else if (inRange) {
              fill = 'url(#activeGrad)';
              opacity = 0.95;
            } else if (future) {
              fill = '#140e0b';
              opacity = 0.3;
            }

            if (isHover) {
              opacity = 1.0;
            }

            return (
              <g
                key={MESES[i]}
                className={styles.barGroup}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                tabIndex={0}
                role="button"
                aria-label={`${MESES_L[i]}: ${fmt(v)} focos`}
              >
                <rect
                  x={x}
                  y={H - 20 - bh}
                  width={BW}
                  height={bh}
                  rx={3}
                  fill={fill}
                  opacity={opacity}
                  filter={isPeak || isHover ? 'url(#glow)' : undefined}
                  className={styles.barRect}
                />

                {/* Subtle top cap highlight */}
                {(isPeak || isHover) && (
                  <rect
                    x={x + 1}
                    y={H - 20 - bh}
                    width={BW - 2}
                    height={2}
                    rx={1}
                    fill="#ffffff"
                    opacity={0.8}
                  />
                )}

                <text
                  x={x + BW / 2}
                  y={H - 6}
                  fontSize={8.5}
                  fill={isPeak ? '#ffc83d' : inRange ? '#e5e0dc' : '#78716c'}
                  fontWeight={isPeak || inRange ? 700 : 400}
                  textAnchor="middle"
                  className={styles.axisText}
                >
                  {MESES[i]}
                </text>
              </g>
            );
          })}

          {/* Peak Value Badge */}
          <g transform={`translate(${peak * (BW + GAP) + 12 + BW / 2}, ${H - 20 - (H - 46) - 5})`}>
            <text
              x={0}
              y={0}
              fontSize={9}
              fill="#ffc83d"
              textAnchor="middle"
              fontWeight={800}
              className={styles.peakLabel}
            >
              {fmt(mx)}
            </text>
          </g>
        </svg>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerItem}>
          <span className={styles.peakDot} aria-hidden="true" />
          <span className={styles.peakText}>
            Mes crítico: <b>{MESES_L[peak]}</b> con <b>{fmt(mx)} focos</b>
          </span>
        </div>
        {from && to && (
          <span className={styles.windowTag}>
            Período crítico: {MESES[from - 1]}–{MESES[to - 1]}
          </span>
        )}
      </div>
    </figure>
  );
}
