import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

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
