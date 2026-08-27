import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const types = readFileSync('src/types/index.ts', 'utf8');
const modal = readFileSync('src/components/AddSongModal.tsx', 'utf8');
const canciones = readFileSync('src/app/canciones/page.tsx', 'utf8');
const picker = readFileSync('src/components/CategoryPicker.tsx', 'utf8');
const sql = readFileSync('supabase/add_song_category.sql', 'utf8');

test('la migración agrega la columna category con CHECK', () => {
  assert.match(sql, /ALTER TABLE public\.songs/i);
  assert.match(sql, /category text/i);
  assert.match(sql, /CHECK \(category IN \('adoracion', 'alabanza'\)/i);
});

test('el tipo Song incluye la categoría', () => {
  assert.match(types, /export type SongCategory = 'adoracion' \| 'alabanza'/);
  assert.match(types, /category: SongCategory \| null/);
});

test('el selector ofrece Alabanza (rápida) y Adoración (lenta)', () => {
  assert.match(picker, /value: 'alabanza', label: 'Alabanza', hint: 'Canción rápida'/);
  assert.match(picker, /value: 'adoracion', label: 'Adoración', hint: 'Canción lenta'/);
});

test('crear canción exige categoría', () => {
  // El insert la incluye y el guardado se bloquea sin ella
  assert.match(modal, /if \(!newTitle\.trim\(\) \|\| !newCategory\) return null;/);
  assert.match(modal, /category: newCategory,/);
  assert.match(modal, /showNewForm && newTitle\.trim\(\) && newCategory/);
});

test('editar desde un servicio bloquea el guardado sin categoría', () => {
  assert.match(modal, /const editBlocked = !!editingSong && !editCategory;/);
  assert.match(modal, /disabled=\{!canSave \|\| saving \|\| preferencesBlocked \|\| editBlocked\}/);
  assert.match(modal, /No se guardarán los\s+cambios hasta que definas la categoría/);
});

test('editar desde Canciones bloquea el guardado sin categoría', () => {
  assert.match(canciones, /if \(!category\) \{/);
  assert.match(canciones, /No se guardarán los cambios\s+hasta que definas la categoría/);
  assert.match(canciones, /category,\s*\}\)\s*\.eq\('id', song\.id\)/);
});

test('el listado de Canciones se divide por categoría', () => {
  assert.match(canciones, /\{ key: 'adoracion', label: 'Adoración' \}/);
  assert.match(canciones, /\{ key: 'alabanza', label: 'Alabanza' \}/);
  assert.match(canciones, /\{ key: 'none', label: 'Sin categoría' \}/);
});
