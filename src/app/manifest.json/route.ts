import { PWA_ASSET_VERSION, PWA_INSTALL_ID } from '@/lib/pwaIdentity';

const manifest = {
  id: PWA_INSTALL_ID,
  name: 'Renuevo Music — Equipo de Alabanza',
  short_name: 'Renuevo Music',
  description: 'Herramienta de coordinación para el equipo de alabanza de Iglesia El Renuevo. Organizá servicios, asigná directores, cargá canciones con tono y referencia de YouTube.',
  start_url: '/',
  display: 'standalone',
  background_color: '#060D18',
  theme_color: '#060D18',
  orientation: 'portrait',
  icons: [
    { src: `/icons/icon-48.png?v=${PWA_ASSET_VERSION}`, sizes: '48x48', type: 'image/png' },
    { src: `/icons/icon-72.png?v=${PWA_ASSET_VERSION}`, sizes: '72x72', type: 'image/png' },
    { src: `/icons/icon-96.png?v=${PWA_ASSET_VERSION}`, sizes: '96x96', type: 'image/png' },
    { src: `/icons/icon-128.png?v=${PWA_ASSET_VERSION}`, sizes: '128x128', type: 'image/png' },
    { src: `/icons/icon-144.png?v=${PWA_ASSET_VERSION}`, sizes: '144x144', type: 'image/png' },
    { src: `/icons/icon-152.png?v=${PWA_ASSET_VERSION}`, sizes: '152x152', type: 'image/png' },
    { src: `/icons/icon-192.png?v=${PWA_ASSET_VERSION}`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: `/icons/icon-256.png?v=${PWA_ASSET_VERSION}`, sizes: '256x256', type: 'image/png' },
    { src: `/icons/icon-384.png?v=${PWA_ASSET_VERSION}`, sizes: '384x384', type: 'image/png' },
    { src: `/icons/icon-512.png?v=${PWA_ASSET_VERSION}`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
  screenshots: [],
  categories: ['music', 'productivity'],
  lang: 'es',
};

export function GET() {
  return Response.json(manifest, {
    headers: { 'Cache-Control': 'no-cache, must-revalidate' },
  });
}
