import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const modal = readFileSync('src/components/AddSongModal.tsx', 'utf8');

test('profile song preferences include editable personal notes', () => {
  const migration = readFileSync('supabase/migrations/20260720000000_profile_song_notes.sql', 'utf8');
  const types = readFileSync('src/types/index.ts', 'utf8');

  assert.match(migration, /add column if not exists notes text/i);
  assert.match(migration, /new\.notes/);
  assert.match(migration, /notes\s*=\s*excluded\.notes/);
  assert.match(types, /interface SongKeyHistory[\s\S]*notes: string \| null/);
  assert.match(modal, /setNotes\(data\.notes \?\? ''\)/);
  assert.match(modal, /\.eq\('profile_id', profileId\)[\s\S]*\.eq\('song_id', selectedSong\.id\)/);
});

test('clears the previous song preferences before loading another song', () => {
  assert.match(
    modal,
    /if \(!editingSong\) \{[\s\S]*setSelectedKey\(null\);[\s\S]*setStartsIn\(null\);[\s\S]*setNotes\(''\);[\s\S]*\}\s*supabase/,
  );
});

test('ignores an obsolete song preference response', () => {
  assert.match(modal, /let cancelled = false;[\s\S]*\.then\(\(\{ data \}\) => \{\s*if \(cancelled\) return;/);
  assert.match(modal, /return \(\) => \{\s*cancelled = true;\s*\};/);
});
