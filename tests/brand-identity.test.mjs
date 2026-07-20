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

test('brand uses one vector mark and an accessible reusable component', () => {
  assert.equal(existsSync('public/brand/renuevo-mark.svg'), true);
  const svg = readFileSync('public/brand/renuevo-mark.svg', 'utf8');
  const component = readFileSync('src/components/BrandLogo.tsx', 'utf8');

  assert.match(svg, /viewBox="0 0 112 112"/);
  assert.match(svg, /linearGradient/);
  assert.match(svg, /aria-hidden="true"/);
  assert.match(component, /variant\?: 'mark' \| 'lockup'/);
  assert.match(component, /alt='Renuevo Music'/);
  assert.match(component, /object-contain/);
});

test('all app surfaces use the shared brand component', () => {
  const shell = readFileSync('src/components/AppShell.tsx', 'utf8');
  const profileSelection = readFileSync('src/app/page.tsx', 'utf8');
  const css = readFileSync('src/app/globals.css', 'utf8');

  assert.match(shell, /import BrandLogo from '.\/BrandLogo'/);
  assert.match(shell, /className='mobile-brand/);
  assert.match(profileSelection, /import BrandLogo from '@\/components\/BrandLogo'/);
  assert.doesNotMatch(shell + profileSelection, /renuevo-music-2\.png/);
  assert.doesNotMatch(css, /\.brand-logo\s*\{[^}]*filter:/s);
});

test('generated icons and splash screens use the Nocturno Azul identity', async () => {
  await assertNocturnalAsset('public/icons/icon-512.png', 512, 512);
  await assertNocturnalAsset('public/splash-1170x2532.png', 1170, 2532);
  assert.equal(existsSync('src/app/favicon.ico'), false);
});
