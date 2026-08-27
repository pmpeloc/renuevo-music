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
  assert.match(modal, /const songId = selectedSong\.id/);
  assert.match(modal, /\.eq\('profile_id', profileId\)[\s\S]*\.eq\('song_id', songId\)/);
});

test('clears an existing preference when every optional value is null', () => {
  for (const file of [
    'supabase/migrations/20260720000000_profile_song_notes.sql',
    'supabase/schema.sql',
  ]) {
    const sql = readFileSync(file, 'utf8');
    assert.match(sql, /begin\s+insert into public\.song_key_history/i);
    assert.doesNotMatch(sql, /if new\.key is not null/i);
  }
});

test('clears the previous song preferences before loading another song', () => {
  assert.match(
    modal,
    /if \(!selectedSong \|\| editingSong\) \{[\s\S]*if \(!editingSong\) \{[\s\S]*setSelectedKey\(null\);[\s\S]*setStartsIn\(null\);[\s\S]*setNotes\(''\);[\s\S]*return;/,
  );
  assert.match(
    modal,
    /setShowNewForm\(true\);\s*setCreatedSongInModal\(null\);\s*setSelectedSong\(null\);\s*setSelectedKey\(null\);\s*setStartsIn\(null\);\s*setNotes\(''\);/,
  );
});

test('ignores an obsolete song preference response', () => {
  assert.match(modal, /async function loadPreference\(\)[\s\S]*await supabase[\s\S]*\.maybeSingle\(\);\s*if \(cancelled\) return;/);
  assert.match(modal, /return \(\) => \{\s*cancelled = true;\s*\};/);
});

test('blocks preference edits and saving until preference loading settles', () => {
  const keySelector = readFileSync('src/components/KeySelector.tsx', 'utf8');

  assert.match(modal, /const \[preferencesLoading, setPreferencesLoading\] = useState\(false\)/);
  assert.match(modal, /function selectFromCatalog\(song: Song\) \{[\s\S]*?setPreferencesLoading\(true\);[\s\S]*?setSelectedSong\(song\);/);
  assert.match(modal, /setPreferencesLoading\(true\);[\s\S]*finally \{\s*if \(!cancelled\) setPreferencesLoading\(false\);/);
  assert.equal((modal.match(/disabled=\{preferencesBlocked\}/g) ?? []).length, 3);
  assert.match(modal, /disabled=\{!canSave \|\| saving \|\| preferencesBlocked \|\| editBlocked\}/);
  assert.match(modal, /preferencesLoading\s*\? 'Cargando preferencias\.\.\.'/);
  assert.match(keySelector, /disabled\?: boolean/);
  assert.match(keySelector, /<select[\s\S]*disabled=\{disabled\}/);
});

test('keeps preferences blocked and offers retry when history loading fails', () => {
  assert.match(modal, /const \[preferencesError, setPreferencesError\] = useState<string \| null>\(null\)/);
  assert.match(modal, /const \{ data, error \} = await supabase[\s\S]*if \(error\) \{[\s\S]*setPreferencesError\(/);
  assert.match(modal, /const preferencesBlocked = preferencesLoading \|\| !!preferencesError/);
  assert.match(modal, /role='alert'[\s\S]*No pudimos cargar tus preferencias[\s\S]*Reintentar/);
  assert.match(modal, /setPreferencesReload\(\(value\) => value \+ 1\)/);
  assert.match(modal, /\[selectedSong, profileId, editingSong, createdSongInModal, preferencesReload\]/);
});

test('normalizes blank service-song notes to null', () => {
  assert.equal((modal.match(/notes: notes\.trim\(\) \|\| null/g) ?? []).length, 2);
});
