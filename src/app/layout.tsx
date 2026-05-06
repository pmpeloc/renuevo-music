import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Renuevo — Equipo de Alabanza',
  description: 'Coordinación del equipo de alabanza de la iglesia',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Renuevo',
  },
};

export const viewport: Viewport = {
  themeColor: '#534AB7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Capturar beforeinstallprompt antes de que React monte */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.__pwaPrompt = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaPrompt = e;
            window.dispatchEvent(new Event('pwaready'));
          });
          window.addEventListener('appinstalled', function() {
            window.__pwaPrompt = null;
            window.dispatchEvent(new Event('pwainstalled'));
          });
        `}} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
