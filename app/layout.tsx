import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// The fonts live in the repository (app/fonts, the Google Fonts latin subset, SIL Open Font License)
// instead of being fetched from Google at build time: that fetch failed now and then on the CI runner
// and broke the deploy. All but New Rocker are variable fonts: one file covers every weight.
const newRocker = localFont({
  src: './fonts/rocker.woff2',
  weight: '400',
  variable: '--font-rocker',
  display: 'swap',
});

const plusJakartaSans = localFont({
  src: './fonts/jakarta.woff2',
  weight: '400 700',
  variable: '--font-jakarta',
  display: 'swap',
});

// headings: regions, story titles, dialogs and sections
const fraunces = localFont({
  src: './fonts/fraunces.woff2',
  weight: '400 600',
  variable: '--font-fraunces',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: './fonts/jetbrains.woff2',
  weight: '400 600',
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
    <html lang="es" className={`${newRocker.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
