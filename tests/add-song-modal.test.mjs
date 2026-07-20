import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const modal = readFileSync('src/components/AddSongModal.tsx', 'utf8');

test('hides catalog search while creating a new song', () => {
  assert.match(modal, /\{!editingSong && !showNewForm && \(/);
});

test('keeps a pasted YouTube URL on the first save', () => {
  assert.match(modal, /const createdNewSong = !song && showNewForm/);
  assert.match(modal, /createdNewSong \? newYoutube : youtubeUrl/);
});

test('does not close after a failed service-song write', () => {
  assert.match(modal, /if \(error \|\| !data\) \{\s*setSaving\(false\);\s*return;\s*\}/s);
  assert.match(modal, /if \(result\) \{\s*onSaved\(result\);\s*onClose\(\);\s*\}/s);
});
