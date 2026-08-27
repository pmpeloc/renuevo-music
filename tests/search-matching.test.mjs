import assert from 'node:assert/strict';
import test from 'node:test';

import { matchesSearch } from '../src/lib/utils.ts';

test('ignora acentos: "tu y solo" encuentra "Tú y solo tú"', () => {
  assert.equal(matchesSearch('Tú y solo tú', 'tu y solo'), true);
});

test('matchea por token parcial: "en espiritu" encuentra "Espíritu y Verdad"', () => {
  assert.equal(matchesSearch('Espíritu y Verdad', 'en espiritu'), true);
});

test('acentos en la consulta también normalizan', () => {
  assert.equal(matchesSearch('Tu fidelidad', 'tú'), true);
});

test('sin ningún token coincidente no matchea', () => {
  assert.equal(matchesSearch('Espíritu y Verdad', 'oceanos'), false);
});

test('consulta vacía matchea todo', () => {
  assert.equal(matchesSearch('Cualquier título', '   '), true);
});
