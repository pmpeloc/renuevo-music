import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import { PWA_ASSET_VERSION } from '@/lib/pwaIdentity';

export const metadata: Metadata = {
  title: 'Renuevo Music — Equipo de Alabanza',
  description:
    'Herramienta de coordinación para el equipo de alabanza de Iglesia El Renuevo. Organizá servicios semanales, asigná directores y coro, cargá canciones con tono y referencia de YouTube, y compartí la lista al grupo de WhatsApp.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: `/favicon-16.png?v=${PWA_ASSET_VERSION}`, sizes: '16x16', type: 'image/png' },
      { url: `/favicon-32.png?v=${PWA_ASSET_VERSION}`, sizes: '32x32', type: 'image/png' },
      { url: `/icons/icon-192.png?v=${PWA_ASSET_VERSION}`, sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: `/icons/apple-touch-icon.png?v=${PWA_ASSET_VERSION}`, sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Renuevo Music',
    startupImage: [
      {
        url: `/splash-1290x2796.png?v=${PWA_ASSET_VERSION}`,
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: `/splash-1179x2556.png?v=${PWA_ASSET_VERSION}`,
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: `/splash-1170x2532.png?v=${PWA_ASSET_VERSION}`,
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: `/splash-750x1334.png?v=${PWA_ASSET_VERSION}`,
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: `/splash-2048x2732.png?v=${PWA_ASSET_VERSION}`,
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: `/splash-1668x2388.png?v=${PWA_ASSET_VERSION}`,
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#060D18',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <head>
        {/* Capturar beforeinstallprompt antes de que React monte */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
            `,
          }}
        />
      </head>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
