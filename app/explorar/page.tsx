import type { Metadata } from 'next';
import ExploreApp from '../../components/ExploreApp';

export const metadata: Metadata = {
  title: 'Explorar los datos · Lo que el fuego se llevó',
  description: 'Mapa de los focos de calor detectados por satélite en Argentina, año por año y por provincia, 2012–2026.',
};

export default function Page() {
  return <ExploreApp />;
}
