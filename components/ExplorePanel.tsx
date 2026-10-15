'use client';
import { useEffect, useRef, useState } from 'react';
import { YEARS, type Compare, type CompareView } from '../lib/router';
import { fmt } from '../lib/fire';
import {
  DIFF_MIN, LAST_YEAR, compareRows, largestChange, monthRangeText, noData, partialNote, periodLabel, periodRange,
  provRange, ranking, signed, totalYear, yearCaveat,
  type National,
} from '../lib/explore';
import { MESES_L } from '../lib/fire';
import { ProvSeason, ProvYears } from './Charts';
import styles from './ExplorePanel.module.css';

type Props = {
  nat: National | null;
  failed: boolean;
  provinces: string[];
  year: number;
  cmp: Compare | null;
  prov: string | null;
  period: string | null;
  onPeriod: (m: string | null) => void;
  onYear: (y: number) => void;
  onCompare: (c: Compare | null) => void;
  onProv: (p: string | null) => void;
};

const PLAY_MS = 1100;

/** Year player, one-year / two-year switch, ranking or comparison table, province card and how to read the map. */
export default function ExplorePanel({ nat, failed, provinces, year, cmp, prov, period, onPeriod, onYear, onCompare, onProv }: Props) {
  const [playing, setPlaying] = useState(false);
  const [draft, setDraft] = useState({ a: cmp ? cmp.a : 2019, b: cmp ? cmp.b : 2020 });
  const view0 = useRef<CompareView>(cmp ? cmp.view : 'd');
  const yearRef = useRef(year);
  yearRef.current = year;
  const onYearRef = useRef(onYear);
  onYearRef.current = onYear;

  /* keep the selects in step with a comparison that arrives from the address */
  useEffect(() => { if (cmp) setDraft({ a: cmp.a, b: cmp.b }); }, [cmp?.a, cmp?.b]);

  /* the player: one step per tick, stops on the last year */
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const y = yearRef.current;
      if (y >= LAST_YEAR) { setPlaying(false); return; }
      onYearRef.current(y + 1);
    }, PLAY_MS);
    return () => clearInterval(t);
  }, [playing]);

  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (year >= LAST_YEAR) onYear(YEARS[0]);
    setPlaying(true);
  };
  const pickYear = (y: number) => { setPlaying(false); onYear(y); };
  const setCompare = (c: Compare | null) => { setPlaying(false); onCompare(c); };
  const compareOf = (a: number, b: number, view: CompareView): Compare => ({ a, b, view });

  const ready = !!nat && provinces.length > 0;
  const [pf, pt] = periodRange(period);
  const cr = ready && cmp ? compareRows(nat.pm, provinces, cmp.a, cmp.b, pf, pt) : null;
  const biggest = cr && !cr.empty ? largestChange(cr.rows, cmp!.a, cmp!.b, period) : '';

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <div className={styles.tabs} role="tablist" aria-label="Modo del mapa">
          <button role="tab" id="tab1" aria-selected={!cmp} onClick={() => setCompare(null)}>Un año</button>
          <button role="tab" id="tab2" aria-selected={!!cmp}
            onClick={() => setCompare(compareOf(draft.a, draft.b, cmp ? cmp.view : view0.current))}>
            Comparar dos años
          </button>
        </div>

        {!cmp ? (
          <div id="mode1">
            <div className={styles.player}>
              <button id="pp" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>{playing ? '❚❚' : '▶'}</button>
              <input id="yr" type="range" min={YEARS[0]} max={LAST_YEAR} step={1} value={year} aria-label="Año"
                onChange={(e) => pickYear(+e.target.value)} />
            </div>
            <div className={styles.legend}><span>pocos focos</span><div className={styles.bar} /><span>muchos</span></div>
          </div>
        ) : (
          <div id="mode2">
            <div className={styles.cmpsel}>
              {(['a', 'b'] as const).map((k) => (
                <label key={k}>
                  Año {k.toUpperCase()}
                  <select id={k === 'a' ? 'ca' : 'cb'} value={cmp[k]}
                    onChange={(e) => {
                      const next = { ...draft, [k]: +e.target.value };
                      setDraft(next);
                      setCompare(compareOf(next.a, next.b, cmp.view));
                    }}>
                    {YEARS.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className={styles.seg} role="group" aria-label="Qué mostrar en el mapa">
              {(['a', 'd', 'b'] as const).map((v) => (
                <button key={v} data-v={v} aria-pressed={cmp.view === v}
                  onClick={() => setCompare(compareOf(cmp.a, cmp.b, v))}>
                  {v === 'd' ? 'Diferencia' : v === 'a' ? cmp.a : cmp.b}
                </button>
              ))}
            </div>
            <div className={styles.legend} id="cleg">
              {cmp.view === 'd'
                ? <><span>menos en {cmp.b}</span><div className={`${styles.bar} ${styles.divbar}`} /><span>más en {cmp.b}</span></>
                : <><span>pocos focos</span><div className={styles.bar} /><span>muchos</span></>}
            </div>
            <p className={styles.small} id="cnote">
              {cmp.view === 'd'
                ? `Cada celda muestra los focos de ${cmp.b} menos los de ${cmp.a}. Escala simétrica y logarítmica; no se pintan las celdas con menos de ${DIFF_MIN} focos de diferencia.`
                : 'Los dos años usan la misma escala de color, para que se puedan comparar.'}
              {biggest && ` ${biggest}`}
            </p>
            <p className={styles.warn} id="cwarn" role="status">{partialNote(cmp.a, cmp.b)}</p>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <label className={styles.period}>
          <span>Período del ranking y de la serie</span>
          <select id="period" value={period ?? 'all'} onChange={(e) => onPeriod(e.target.value === 'all' ? null : e.target.value)}>
            <option value="all">Todo el año</option>
            <optgroup label="Trimestres">
              {['t1', 't2', 't3', 't4'].map((k) => <option key={k} value={k}>{periodLabel(k)}</option>)}
            </optgroup>
            <optgroup label="Meses">
              {MESES_L.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </optgroup>
          </select>
        </label>
        {period && (
          <p className={styles.warn} id="mapnote" role="status">
            El mapa muestra el año completo: los datos por celda no tienen mes.
          </p>
        )}
      </div>

      <div id="explore" className={styles.stack}>
        {!ready ? (
          <div className={styles.card}>
            <p className={styles.small}>{failed ? 'No se pudieron cargar los datos.' : 'Cargando los datos…'}</p>
          </div>
        ) : (
          <>
            {prov && <ProvCard nat={nat} provinces={provinces} prov={prov} year={year} period={period} onYear={pickYear} onClose={() => onProv(null)} />}
            {cmp ? (
              <CompareCard cr={cr!} cmp={cmp} period={period} prov={prov} onProv={onProv} />
            ) : (
              <RankCard nat={nat} provinces={provinces} year={year} period={period} prov={prov} onProv={onProv} />
            )}
          </>
        )}
      </div>

      <div className={styles.card}>
        <h3>Cómo leer el mapa</h3>
        <p>Pasá el cursor por el mapa para ver los focos de cada celda, y hacé click en una provincia (o en el ranking) para ver su serie anual y su estacionalidad.</p>
        <p>El color de cada celda (de unos 25 km) crece con la cantidad de focos de calor detectados en el año. El norte y el litoral se encienden todos los años: hay muchas quemas agrícolas y de pastizal.</p>
        <p>Los números de cada incendio vienen de reportes oficiales y notas periodísticas, y no del satélite.</p>
      </div>
    </div>
  );
}

type Shared = { nat: National; provinces: string[] };

function ProvCard({ nat, provinces, prov, year, period, onYear, onClose }: Shared & { prov: string; year: number; period: string | null; onYear: (y: number) => void; onClose: () => void }) {
  const [f, t] = periodRange(period);
  const rk = ranking(nat.pm, provinces, year, f, t);
  const pos = rk.findIndex((r) => r.n === prov) + 1;
  const v = provRange(nat.pm, prov, year, f, t);
  const tot = period ? rk.reduce((s, r) => s + r.v, 0) : totalYear(nat.meta, year);
  const none = noData(year, f, t);
  const caveats = period ? [2012, 2026].map((y) => yearCaveat(y, f, t)).filter(Boolean).join('; ') : '';
  return (
    <div className={`${styles.card} ${styles.pcard}`}>
      <div className={styles.phead}>
        <h3>{prov}</h3>
        <button className={styles.x} id="pclose" aria-label="Quitar la selección de provincia" onClick={onClose}>×</button>
      </div>
      {none ? (
        <p className={styles.pkpi}>{year} · {periodLabel(period)}: sin datos para este período.</p>
      ) : (
      <p className={styles.pkpi}>
        <b>{fmt(v)}</b> focos en {year}{year === 2026 ? ' (hasta el 14/10)' : ''}{period ? ` · ${periodLabel(period)}` : ''} · puesto <b>{pos}</b> de {provinces.length} ·{' '}
        {tot ? ((v / tot) * 100).toFixed(1).replace('.', ',') : '0'} % del país
      </p>
      )}
      <h4>Serie anual{period ? ` · ${periodLabel(period)}` : ''} (click en un año para verlo en el mapa)</h4>
      <div id="pyrs"><ProvYears pm={nat.pm} prov={prov} year={year} onPick={onYear} f={f} t={t} /></div>
      {caveats && <p className={styles.small}>{caveats}.</p>}
      <h4>Estacionalidad: focos por mes{period ? ` · ${periodLabel(period)}` : ''}</h4>
      <ProvSeason pm={nat.pm} prov={prov} year={year} f={f} t={t} />
    </div>
  );
}

function RankCard({ nat, provinces, year, period, prov, onProv }: Shared & { year: number; period: string | null; prov: string | null; onProv: (p: string | null) => void }) {
  const [f, t] = periodRange(period);
  const rk = ranking(nat.pm, provinces, year, f, t);
  const mx = rk[0].v || 1;
  const caveat = period ? yearCaveat(year, f, t) : '';
  return (
    <div className={styles.card}>
      <h3>Ranking de provincias · {year}{period ? ` · ${periodLabel(period)}` : ''}</h3>
      {caveat && <p className={styles.warn} role="status">{caveat}.</p>}
      <ol className={styles.rank}>
        {rk.map((r, i) => (
          <li key={r.n}>
            <button data-p={r.n} className={r.n === prov ? styles.on : undefined} aria-pressed={r.n === prov}
              onClick={() => onProv(r.n === prov ? null : r.n)}>
              <span className={styles.rn}>{i + 1}</span>
              <span className={styles.rl}>{r.n}</span>
              <span className={styles.rb}><i style={{ width: ((r.v / mx) * 100).toFixed(1) + '%' }} /></span>
              <span className={styles.rv}>{fmt(r.v)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CompareCard({ cr, cmp, period, prov, onProv }: { cr: ReturnType<typeof compareRows>; cmp: Compare; period: string | null; prov: string | null; onProv: (p: string | null) => void }) {
  const { rows, from, to, full, empty } = cr;
  const [pf, pt] = periodRange(period);
  const narrowed = from !== pf || to !== pt;
  return (
    <div className={styles.card}>
      <h3>Cambio por provincia · {cmp.a} → {cmp.b}{period ? ` · ${periodLabel(period)}` : ''}</h3>
      <p className={styles.small}>
        {empty
          ? 'Sin datos para este período: no hay meses completos en común entre los dos años.'
          : <>
              {period && !narrowed ? '' : full ? 'Años completos.' : `Solo meses completos en común: ${monthRangeText(from, to)}.`}
              {' '}Ordenado de mayor aumento a mayor baja.
            </>}
      </p>
      {!empty && <table className={styles.cmpt}>
        <thead>
          <tr><th scope="col">Provincia</th><th scope="col">{cmp.a}</th><th scope="col">{cmp.b}</th><th scope="col">Cambio</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pc = r.a ? (r.d / r.a) * 100 : null;
            return (
              <tr key={r.n} className={r.n === prov ? styles.on : undefined}>
                <th scope="row"><button data-p={r.n} onClick={() => onProv(r.n === prov ? null : r.n)}>{r.n}</button></th>
                <td>{fmt(r.a)}</td>
                <td>{fmt(r.b)}</td>
                <td className={r.d > 0 ? styles.up : r.d < 0 ? styles.down : undefined}>
                  {signed(r.d)}{fmt(Math.abs(r.d))}
                  {pc !== null && <small>{signed(pc)}{Math.abs(pc).toFixed(0)} %</small>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>}
    </div>
  );
}
