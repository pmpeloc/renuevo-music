import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import sharp from 'sharp';

async function assertNocturnalAsset(path, width, height) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, width);
  assert.equal(info.height, height);
  assert.deepEqual([...data.subarray(0, 3)], [6, 13, 24]);
  let bluePixels = 0;
  for (let i = 0; i < data.length; i += 3) {
    if (data[i + 2] > 120 && data[i + 2] > data[i] * 1.2) bluePixels++;
  }
  assert.ok(bluePixels > width * height * 0.01);
}

const rasterAssets = [
  ['public/favicon-16.png', 16, 16],
  ['public/favicon-32.png', 32, 32],
  ['public/icons/apple-touch-icon.png', 180, 180],
  ['public/icons/badge-72.png', 72, 72],
  ...[16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512].map((size) => [
    `public/icons/icon-${size}.png`, size, size,
  ]),
  ['public/splash-750x1334.png', 750, 1334],
  ['public/splash-1170x2532.png', 1170, 2532],
  ['public/splash-1179x2556.png', 1179, 2556],
  ['public/splash-1290x2796.png', 1290, 2796],
  ['public/splash-1668x2388.png', 1668, 2388],
  ['public/splash-2048x2732.png', 2048, 2732],
];

test('brand uses one vector mark and an accessible reusable component', () => {
  assert.equal(existsSync('public/brand/renuevo-mark.svg'), true);
  const svg = readFileSync('public/brand/renuevo-mark.svg', 'utf8');
  const component = readFileSync('src/components/BrandLogo.tsx', 'utf8');

  assert.match(svg, /viewBox="0 0 112 112"/);
  assert.match(svg, /linearGradient/);
  assert.match(svg, /<stop stop-color="#4568E8"\/>/);
  assert.match(svg, /<stop offset="1" stop-color="#7594FF"\/>/);
  assert.match(svg, /<path[^>]+stroke="white"/);
  assert.match(svg, /aria-hidden="true"/);
  assert.match(component, /variant\?: 'mark' \| 'lockup'/);
  assert.match(component, /alt='Renuevo Music'/);
  assert.match(component, /object-contain/);
  assert.match(component, /return \(\s*<span className=/);
});

test('all app surfaces use the shared brand component', () => {
  const shell = readFileSync('src/components/AppShell.tsx', 'utf8');
  const profileSelection = readFileSync('src/app/page.tsx', 'utf8');
  const css = readFileSync('src/app/globals.css', 'utf8');

  assert.match(shell, /import BrandLogo from '.\/BrandLogo'/);
  assert.match(shell, /className='mobile-brand/);
  assert.match(profileSelection, /import BrandLogo from '@\/components\/BrandLogo'/);
  assert.match(profileSelection, /<h1>\s*<BrandLogo[^>]+\/>\s*<\/h1>/);
  assert.doesNotMatch(shell + profileSelection, /renuevo-music-2\.png/);
  assert.doesNotMatch(css, /\.brand-logo\s*\{[^}]*filter:/s);
});

test('all 23 raster assets retain their exact dimensions', async () => {
  assert.equal(rasterAssets.length, 23);
  for (const [path, width, height] of rasterAssets) {
    const metadata = await sharp(path).metadata();
    assert.equal(metadata.width, width, `${path} width`);
    assert.equal(metadata.height, height, `${path} height`);
  }
});

test('generated icons and splash screens use the Nocturno Azul identity', async () => {
  await assertNocturnalAsset('public/icons/icon-512.png', 512, 512);
  await assertNocturnalAsset('public/splash-1170x2532.png', 1170, 2532);
  assert.equal(existsSync('src/app/favicon.ico'), false);
});

test('splash typography and spacing scale with the mark', () => {
  const generator = readFileSync('scripts/generate-brand-assets.mjs', 'utf8');

  for (const metric of ['titleFontSize', 'subtitleFontSize', 'labelHeight', 'gap']) {
    assert.match(generator, new RegExp(`const ${metric} = Math\\.round\\(markSize \\* [^)]+\\)`));
  }
  assert.match(generator, /font-size="\$\{titleFontSize\}"/);
  assert.match(generator, /font-size="\$\{subtitleFontSize\}"/);
  assert.match(generator, /height="\$\{labelHeight\}"/);
  assert.match(generator, /markTop \+ markSize \+ gap/);
});

test('manifest and Apple metadata share one versioned install identity', () => {
  const identity = readFileSync('src/lib/pwaIdentity.ts', 'utf8');
  const manifestRoute = readFileSync('src/app/manifest.json/route.ts', 'utf8');
  const layout = readFileSync('src/app/layout.tsx', 'utf8');

  assert.match(identity, /export const PWA_ASSET_VERSION = '20260721';/);
  assert.match(identity, /export const PWA_INSTALL_ID = '\/';/);
  assert.equal(existsSync('public/manifest.json'), false);
  assert.match(manifestRoute, /id: PWA_INSTALL_ID/);
  assert.match(manifestRoute, /Cache-Control': 'no-cache, must-revalidate'/);
  assert.equal((manifestRoute.match(/\?v=\$\{PWA_ASSET_VERSION\}/g) ?? []).length, 10);
  assert.match(manifestRoute, /purpose: 'any maskable'/);
  assert.match(layout, /manifest: '\/manifest\.json'/);
  assert.match(layout, /import \{ PWA_ASSET_VERSION \} from '@\/lib\/pwaIdentity'/);
  assert.equal((layout.match(/\?v=\$\{PWA_ASSET_VERSION\}/g) ?? []).length, 10);
});

test('installed Apple users see identity refresh guidance once per visual version', () => {
  const noticePath = 'src/components/PWAIdentityUpdateNotice.tsx';
  assert.equal(existsSync(noticePath), true);

  const notice = readFileSync(noticePath, 'utf8');
  const providers = readFileSync('src/components/Providers.tsx', 'utf8');

  assert.match(notice, /import \{ PWA_ASSET_VERSION \} from '@\/lib\/pwaIdentity'/);
  assert.match(notice, /iPhone\|iPad\|iPod/);
  assert.match(notice, /navigator\.platform === 'MacIntel' && navigator\.maxTouchPoints > 1/);
  assert.match(notice, /\.standalone === true/);
  assert.match(notice, /matchMedia\('\(display-mode: standalone\)'\)\.matches/);
  assert.match(notice, /localStorage\.getItem\(STORAGE_KEY\) !== PWA_ASSET_VERSION/);
  assert.match(notice, /localStorage\.setItem\(STORAGE_KEY, PWA_ASSET_VERSION\)/);
  assert.match(notice, /renuevo-pwa-identity-version/);
  assert.match(notice, /Para actualizar el ícono y la pantalla de inicio, Apple requiere eliminar este acceso y volver a agregarlo desde Safari\./);
  assert.match(notice, /aria-live="polite"/);
  assert.match(notice, /bottom-\[calc\(5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(notice, /z-40/);
  assert.match(notice, /background: 'var\(--accent-strong\)'/);
  assert.match(notice, />\s*Entendido\s*</);
  assert.match(providers, /import PWAIdentityUpdateNotice from '@\/components\/PWAIdentityUpdateNotice'/);
  assert.match(providers, /<LoadingProvider>\{children\}<PWAIdentityUpdateNotice \/><\/LoadingProvider>/);
});
