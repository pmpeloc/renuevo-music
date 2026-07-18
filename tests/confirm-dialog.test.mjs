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
});
