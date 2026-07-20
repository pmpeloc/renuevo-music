import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Nocturno Azul defines the shared dark theme', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');

  assert.match(css, /--app-bg:\s*#060d18/i);
  assert.match(css, /--surface:\s*#101f33/i);
  assert.match(css, /--accent:\s*#5b7cfa/i);
  assert.match(css, /--accent-secondary:\s*#42c8b7/i);
  assert.match(css, /color-scheme:\s*dark/i);
});

test('navigation and service cards stay visually consistent', () => {
  const shell = readFileSync('src/components/AppShell.tsx', 'utf8');
  const home = readFileSync('src/app/home/page.tsx', 'utf8');

  for (const label of ['Inicio', 'Canciones', 'Métricas', 'Perfil']) {
    assert.match(shell, new RegExp(`label: '${label}'`));
  }

  assert.match(home, /className='service-card/);
  assert.match(home, /className='service-card__identity/);
  assert.doesNotMatch(home, /orange-600/);
});
