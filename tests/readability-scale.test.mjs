import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
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

test('keeps form fields on the compact reading scale', () => {
  const formFieldWithBaseText = /<(?:input|select)(?:(?!\/>|<\/select>)[\s\S])*\btext-base\b/s;

  for (const file of readdirSync('src', { recursive: true }).filter((file) => file.endsWith('.tsx'))) {
    assert.doesNotMatch(readFileSync(join('src', file), 'utf8'), formFieldWithBaseText, file);
  }
});
