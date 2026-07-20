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
