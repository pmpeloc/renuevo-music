import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('allows the local network host used during development', () => {
  const config = readFileSync('next.config.ts', 'utf8');

  assert.match(config, /allowedDevOrigins:\s*\[['"]192\.168\.100\.33['"]\]/);
});
