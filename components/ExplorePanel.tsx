'use client';
import { useEffect, useRef, useState } from 'react';
import { YEARS, type Compare, type CompareView } from '../lib/router';
import { fmt } from '../lib/fire';
import {
  DIFF_MIN, LAST_YEAR, compareRows, monthRangeText, partialNote, provYear, ranking, signed, totalYear,
  type National,
} from '../lib/explore';
import { ProvSeason, ProvYears } from './Charts';
import styles from './ExplorePanel.module.css';

type Props = {
  nat: National | null;
  failed: boolean;
  provinces: string[];
  year: number;
  cmp: Compare | null;
  prov: string | null;
  onYear: (y: number) => void;
  onCompare: (c: Compare | null) => void;
  onProv: (p: string | null) => void;
};

const PLAY_MS = 1100;

/** Year player, one-year / two-year switch, ranking or comparison table, province card and how to read the map. */
export default function ExplorePanel({ nat, failed, provinces, year, cmp, prov, onYear, onCompare, onProv }: Props) {
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
            </p>
            <p className={styles.warn} id="cwarn" role="status">{partialNote(cmp.a, cmp.b)}</p>
          </div>
        )}
      </div>

      <div id="explore" className={styles.stack}>
        {!ready ? (
          <div className={styles.card}>
            <p className={styles.small}>{failed ? 'No se pudieron cargar los datos.' : 'Cargando los datos…'}</p>
          </div>
        ) : (
          <>
            {prov && <ProvCard nat={nat} provinces={provinces} prov={prov} year={year} onYear={pickYear} onClose={() => onProv(null)} />}
            {cmp ? (
              <CompareCard nat={nat} provinces={provinces} cmp={cmp} prov={prov} onProv={onProv} />
            ) : (
              <RankCard nat={nat} provinces={provinces} year={year} prov={prov} onProv={onProv} />
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

function ProvCard({ nat, provinces, prov, year, onYear, onClose }: Shared & { prov: string; year: number; onYear: (y: number) => void; onClose: () => void }) {
  const rk = ranking(nat.pm, provinces, year);
  const pos = rk.findIndex((r) => r.n === prov) + 1;
  const v = provYear(nat.pm, prov, year), tot = totalYear(nat.meta, year);
  return (
    <div className={`${styles.card} ${styles.pcard}`}>
      <div className={styles.phead}>
        <h3>{prov}</h3>
        <button className={styles.x} id="pclose" aria-label="Quitar la selección de provincia" onClick={onClose}>×</button>
      </div>
      <p className={styles.pkpi}>
        <b>{fmt(v)}</b> focos en {year}{year === 2026 ? ' (hasta el 14/10)' : ''} · puesto <b>{pos}</b> de {provinces.length} ·{' '}
        {tot ? ((v / tot) * 100).toFixed(1).replace('.', ',') : '0'} % del país
      </p>
      <h4>Serie anual (click en un año para verlo en el mapa)</h4>
      <div id="pyrs"><ProvYears pm={nat.pm} prov={prov} year={year} onPick={onYear} /></div>
      <h4>Estacionalidad: focos por mes</h4>
      <ProvSeason pm={nat.pm} prov={prov} year={year} />
    </div>
  );
}

function RankCard({ nat, provinces, year, prov, onProv }: Shared & { year: number; prov: string | null; onProv: (p: string | null) => void }) {
  const rk = ranking(nat.pm, provinces, year);
  const mx = rk[0].v || 1;
  return (
    <div className={styles.card}>
      <h3>Ranking de provincias · {year}</h3>
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

function CompareCard({ nat, provinces, cmp, prov, onProv }: Shared & { cmp: Compare; prov: string | null; onProv: (p: string | null) => void }) {
  const { rows, from, to, full } = compareRows(nat.pm, provinces, cmp.a, cmp.b);
  return (
    <div className={styles.card}>
      <h3>Cambio por provincia · {cmp.a} → {cmp.b}</h3>
      <p className={styles.small}>
        {full ? 'Años completos.' : `Solo meses completos en común: ${monthRangeText(from, to)}.`} Ordenado de mayor aumento a mayor baja.
      </p>
      <table className={styles.cmpt}>
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
      </table>
    </div>
  );
}
