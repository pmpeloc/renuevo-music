import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('confirmation dialog is accessible and non-native', () => {
  const dialog = readFileSync('src/components/ConfirmDialog.tsx', 'utf8');

  assert.match(dialog, /role='dialog'/);
  assert.match(dialog, /aria-modal='true'/);
  assert.match(dialog, /event\.key === 'Escape'/);
  assert.match(dialog, /event\.target === event\.currentTarget/);
  assert.match(dialog, /disabled=\{pending\}/);
  assert.match(dialog, /onCancel/);
  assert.match(dialog, /onConfirm/);
  assert.match(dialog, /\{error &&/);
});

test('song deletion uses the confirmation dialog', () => {
  const page = readFileSync('src/app/canciones/page.tsx', 'utf8');

  assert.match(page, /import ConfirmDialog/);
  assert.match(page, /songToDelete/);
  assert.match(page, /<ConfirmDialog/);
  assert.match(page, /onConfirm=\{\(\) => handleDelete\(songToDelete\)\}/);
  assert.match(page, /historial de tonos/);
  assert.match(page, /error=\{deleteError\}/);
  assert.doesNotMatch(page, /(?:window\.)?confirm\s*\(/);
});
