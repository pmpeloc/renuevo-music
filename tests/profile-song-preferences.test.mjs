import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('profile song preferences include editable personal notes', () => {
  const migration = readFileSync('supabase/migrations/20260720000000_profile_song_notes.sql', 'utf8');
  const modal = readFileSync('src/components/AddSongModal.tsx', 'utf8');
  const types = readFileSync('src/types/index.ts', 'utf8');

  assert.match(migration, /add column if not exists notes text/i);
  assert.match(migration, /new\.notes/);
  assert.match(migration, /notes\s*=\s*excluded\.notes/);
  assert.match(types, /interface SongKeyHistory[\s\S]*notes: string \| null/);
  assert.match(modal, /setNotes\(data\.notes \?\? ''\)/);
  assert.match(modal, /\.eq\('profile_id', profileId\)[\s\S]*\.eq\('song_id', selectedSong\.id\)/);
});
