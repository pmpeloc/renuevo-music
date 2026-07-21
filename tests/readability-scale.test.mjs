import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('uses the approved balanced reading scale', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  assert.match(css, /html\s*\{[^}]*font-size:\s*17px/s);
});

test('removes oversized empty states in primary views', () => {
  for (const file of [
    'src/app/canciones/page.tsx',
    'src/app/metricas/page.tsx',
    'src/app/perfil/page.tsx',
    'src/app/service/[id]/page.tsx',
  ]) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /py-(?:16|20)/);
  }
});
