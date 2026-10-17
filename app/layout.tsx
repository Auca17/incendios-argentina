import type { Metadata, Viewport } from 'next';
import { Cinzel, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-cinzel',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

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

export const viewport: Viewport = { themeColor: "#050c16" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cinzel.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
