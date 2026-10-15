import type { Metadata, Viewport } from 'next';
import './globals.css';

const TITLE = 'Lo que el fuego se llevó: 15 años, 6 historias';
const DESCRIPTION =
  'Recorrido interactivo por los focos de calor detectados por satélite en Argentina entre 2012 y 2026, y por seis grandes incendios con sus cifras y fuentes.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    title: TITLE,
    description: 'Seis incendios contados con sus fuentes y los focos de calor detectados por satélite en Argentina, 2012–2026.',
  },
};

export const viewport: Viewport = { themeColor: '#0a0a0a' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
