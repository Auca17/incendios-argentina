/* meta.json is tiny, so it ships in the bundle: the home text and the year bars render without a request. */
import meta from '../public/data/meta.json';
export default meta as { total_focos: number; por_anio: Record<string, number>; desde: string; hasta: string; fuente: string };
