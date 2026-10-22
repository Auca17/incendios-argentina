'use client';
import { useEffect, useRef, useState } from 'react';
import { loadProvinciaMes } from '../lib/data';
import { ALT, fmt, monthSeries } from '../lib/fire';
import { CAUSE_BY, MORE_PROVINCES, TOUR_EVENTS } from '../lib/tour';
import { hold } from '../lib/scrollDriver';
import { STORY_PHOTOS } from '../lib/photos';
import { closeDialog, dialogOpener, subscribeDialog, type DialogTarget } from '../lib/storyDialog';
import MonthChart from './MonthChart';
import Locator from './Locator';
import styles from './StoryDialog.module.css';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** What the pictures of each chapter are: illustrations, never records of the fire. */
const IMAGES: Record<string, string> = {
  misiones: 'El paisaje que abre el capítulo es una ilustración de la selva. Las brasas del mapa ilustran lo que cuenta la fuente: los troncos grandes siguieron encendidos por dentro.',
  corrientes: 'El paisaje que abre el capítulo es una ilustración de los esteros. Las llamas del mapa marcan dónde el satélite acumuló más focos; no miden superficie quemada.',
  cordoba: 'El paisaje que abre el capítulo es una ilustración de las sierras. Las llamas del mapa marcan dónde el satélite acumuló más focos; no miden superficie quemada.',
  delta: 'El paisaje que abre el capítulo es una ilustración de las islas. El humo que deriva hacia Rosario en el mapa es una ilustración; la calidad del aire en la ciudad es dato de la fuente.',
  mendoza: 'Los viñedos del paisaje que abre el capítulo son un símbolo de Mendoza: el incendio de 2023 fue en el piedemonte de El Challao, no en viñedos. Los brigadistas del mapa son una ilustración; no reproducen una operación concreta.',
  chubut: 'La apertura es una recreación ilustrada de un bosque andino en llamas, no una imagen de Epuyén. El avión hidrante del mapa también es una ilustración: hubo aviones hidrantes en este incendio, pero esa pasada no reproduce una operación concreta.',
};

/**
 * "Más información": one dialog for the page, over the chapter that opened it. A real modal
 * (<dialog>.showModal(): the page behind is inert, Escape closes it, focus stays inside) that holds
 * the story where it was: the page cannot scroll, the scroll driver keeps its last frame, and on
 * closing the scroll position is put back and focus returns to the button that opened it.
 */
export default function StoryDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [target, setTarget] = useState<DialogTarget>(null);
  const [closing, setClosing] = useState(false);
  const [series, setSeries] = useState<number[] | null>(null);
  const saved = useRef(0);

  useEffect(() => subscribeDialog(setTarget), []);

  // open / close the native dialog with the store
  useEffect(() => {
    const d = ref.current!;
    if (target === null) return;
    saved.current = window.scrollY;
    hold(true);
    document.documentElement.dataset.dialog = '1';
    if (!d.open) d.showModal();
    d.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
    return () => {
      if (d.open) d.close();
      delete document.documentElement.dataset.dialog;
      if (Math.abs(window.scrollY - saved.current) > 1) window.scrollTo(0, saved.current);
      hold(false);
      dialogOpener()?.focus({ preventScroll: true });
    };
  }, [target]);

  useEffect(() => {
    setSeries(null);
    if (typeof target !== 'number') return;
    const ev = TOUR_EVENTS[target];
    let live = true;
    loadProvinciaMes().then((pm) => { if (live) setSeries(monthSeries(pm, ev.months.prov, ev.months.year)); }, () => {});
    return () => { live = false; };
  }, [target]);

  const close = () => {
    if (closing) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { closeDialog(); return; }
    setClosing(true);
    window.setTimeout(() => { setClosing(false); closeDialog(); }, 180);
  };

  const ev = typeof target === 'number' ? TOUR_EVENTS[target] : null;
  const photos = ev ? STORY_PHOTOS[ev.id] || [] : [];
  const alt = ev ? ALT[ev.id] : undefined;

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-closing={closing ? '1' : '0'}
      aria-labelledby="dlg-h"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === ref.current) close(); }}
    >
      {target !== null && (
        <div className={styles.sheet}>
          <header className={styles.head}>
            <div>
              <p className={styles.kicker}>
                {ev ? <><span>{(target as number) + 1} de {TOUR_EVENTS.length}</span> {ev.region} · {ev.when}</> : 'Dónde más ardió'}
              </p>
              <h2 id="dlg-h" ref={heading} tabIndex={-1} className={styles.title}>
                {ev ? ev.title : 'Cómo se calculó'}
              </h2>
            </div>
            <button type="button" className={styles.close} onClick={close}>
              Cerrar <span aria-hidden="true">×</span>
            </button>
          </header>

          {ev ? (
            <div className={styles.grid}>
              <div className={styles.main}>
                <section className={styles.block}>
                  <h3 className={styles.h3}>Qué pasó</h3>
                  <p className={styles.num}>{fmt(ev.hero.value)} <span>{ev.hero.unit === 'hectáreas' ? 'ha' : ev.hero.unit}</span></p>
                  <p className={styles.body}>{cap(ev.hero.unit)} {ev.hero.label}</p>
                  <p className={styles.src}>Fuente: {ev.hero.src}</p>
                  {ev.hero.note && <p className={styles.small}>{ev.hero.note}</p>}
                </section>

                <section className={styles.block}>
                  <h3 className={styles.h3}>Por qué empezó</h3>
                  <blockquote className={styles.quote}>
                    <p>{ev.cause.text}</p>
                    <footer>{CAUSE_BY[ev.id]}</footer>
                  </blockquote>
                </section>

                <section className={styles.block}>
                  <h3 className={styles.h3}>Cómo se combatió</h3>
                  <p className={styles.body}>{ev.response}</p>
                </section>

                <section className={styles.block}>
                  <h3 className={styles.h3}>Lo que dicen las fuentes</h3>
                  <ul className={styles.facts}>
                    {(ev.facts as string[][]).map((f) => (
                      <li key={f[0]}><b>{f[0]}</b><span>{f[1]}</span></li>
                    ))}
                  </ul>
                </section>

                {alt && (
                  <section className={styles.block}>
                    <h3 className={styles.h3}>Las fuentes no coinciden</h3>
                    <ul className={styles.alt}>
                      {alt.map((a) => <li key={a[0]}><b>{a[0]}</b><span>{a[1]}</span></li>)}
                    </ul>
                  </section>
                )}

                <section className={styles.block}>
                  <h3 className={styles.h3}>Lo que vio el satélite</h3>
                  {series && <MonthChart series={series} provs={ev.months.prov} year={ev.months.year} from={ev.months.from} to={ev.months.to} />}
                  <p className={styles.small}>
                    Focos de calor por mes (NASA FIRMS, satélite VIIRS S-NPP, 375 m). Un foco es un punto caliente visto desde el
                    espacio: no es una hectárea quemada ni un incendio, e incluye quemas en el campo.
                  </p>
                </section>

                <section className={styles.block}>
                  <h3 className={styles.h3}>Fuentes</h3>
                  <ul className={styles.links}>
                    {(ev.sources as { t: string; u: string }[]).map((s) => (
                      <li key={s.u}><a href={s.u} target="_blank" rel="noopener noreferrer">{s.t}</a></li>
                    ))}
                  </ul>
                </section>
              </div>

              <aside className={styles.side}>
                <figure className={styles.map}>
                  <Locator provs={ev.provs} marker={ev.marker} mode="region" label={`Mapa de ${ev.region} con el lugar del incendio`} className={styles.mapCanvas} />
                  <figcaption>{ev.provs.join(', ')}. El punto marca el lugar de la historia.</figcaption>
                </figure>
                {photos.map((p) => (
                  <figure key={p.src} className={styles.photo}>
                    <img src={BASE + p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" />
                    <figcaption>
                      {p.credit}
                      {p.licenseUrl && p.licenseText && <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer">{p.licenseText}</a>}
                    </figcaption>
                  </figure>
                ))}
                <p className={styles.small}><b>Sobre las imágenes.</b> {IMAGES[ev.id]}</p>
              </aside>
            </div>
          ) : (
            <div className={styles.grid}>
              <div className={styles.main}>
                <section className={styles.block}>
                  <h3 className={styles.h3}>Los datos</h3>
                  <p className={styles.body}>
                    Focos de calor detectados por el satélite Suomi NPP (instrumento VIIRS, 375 m), publicados por NASA FIRMS. Este
                    trabajo los sumó por provincia y por mes, del 20 de enero de 2012 al 14 de octubre de 2026.
                  </p>
                </section>
                <section className={styles.block}>
                  <h3 className={styles.h3}>Qué se compara</h3>
                  <p className={styles.body}>
                    El ranking ordena las provincias por la cantidad de focos de todo el período, y cada porcentaje es la parte de
                    esa provincia en el total del país. {MORE_PROVINCES.join(', ').replace(/, ([^,]*)$/, ' y $1')} son las cuatro
                    con más focos fuera de las seis historias.
                  </p>
                </section>
                <section className={styles.block}>
                  <h3 className={styles.h3}>Lo que no dice</h3>
                  <p className={styles.body}>
                    Un foco no es una hectárea quemada ni un incendio: también aparecen quemas en el campo y, a veces, errores del
                    satélite. Más focos no quiere decir más superficie perdida, ni dice por qué se prendió el fuego.
                  </p>
                </section>
              </div>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
