import type { Metadata } from 'next';
import Experience from '../../components/Experience';

export const metadata: Metadata = {
  title: 'Explorar · Lo que el fuego se llevó: 15 años, 6 historias',
};

/** The data explorer (year player, ranking, filters, comparison) and the six fires as chapters. */
export default function ExplorePage() {
  return <Experience />;
}
