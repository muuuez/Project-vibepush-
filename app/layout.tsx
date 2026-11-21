import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Sistem Tempahan Ruang & Peralatan',
  description:
    'Resource Booking System for campus discussion rooms, computer labs, and studio/sports equipment.',
  openGraph: {
    title: 'Sistem Tempahan Ruang & Peralatan',
    description:
      'Resource Booking System for campus discussion rooms, computer labs, and studio/sports equipment.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sistem Tempahan Ruang & Peralatan',
    description:
      'Resource Booking System for campus discussion rooms, computer labs, and studio/sports equipment.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
