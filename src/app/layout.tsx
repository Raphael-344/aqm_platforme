import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AQM Platform — NOSE x SMART_IO',
  description: 'Monitoring qualité de l\'air — capteurs zone euro',
  keywords: 'qualité air, AQM, SIGFOX, Arduino, monitoring, Europe',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-background text-white min-h-screen`}>
        <Navigation />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
