import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const modal = readFileSync('src/components/AddSongModal.tsx', 'utf8');

test('hides catalog search while creating a new song', () => {
  assert.match(modal, /\{!editingSong && !showNewForm && \(/);
});

test('keeps a pasted YouTube URL on the first save', () => {
  assert.match(modal, /const createdNewSong = !song && showNewForm/);
  assert.match(modal, /createdInThisModal \? newYoutube : youtubeUrl/);
});

test('retries a created catalog song without recreating it or losing its draft', () => {
  assert.match(modal, /const \[createdSongInModal, setCreatedSongInModal\] = useState<Song \| null>\(null\)/);
  assert.match(modal, /let song = selectedSong \?\? createdSongInModal;\s*let createdInThisModal = !!createdSongInModal/);
  assert.match(modal, /song = await saveNewSong\(\);[\s\S]*createdInThisModal = true;\s*setCreatedSongInModal\(song\);/);
  assert.match(modal, /const cleanUrl = \(createdInThisModal \? newYoutube : youtubeUrl\)\.trim\(\) \|\| null/);
  assert.match(modal, /if \(createdInThisModal\) \{\s*song = \{ \.\.\.song, youtube_url: cleanUrl \};\s*setCreatedSongInModal\(song\);\s*\}/);
  assert.match(modal, /if \(createdSongInModal\) \{[\s\S]*return;[\s\S]*if \(!selectedSong \|\| editingSong\)/);
});

test('does not close after a failed service-song write', () => {
  assert.match(modal, /if \(error \|\| !data\) \{\s*setSaving\(false\);\s*return;\s*\}/s);
  assert.match(modal, /if \(result\) \{\s*onSaved\(result\);\s*onClose\(\);\s*\}/s);
});

test('does not continue after a failed catalog-song update', () => {
  assert.match(
    modal,
    /const \{ error \} = await supabase\s*\.from\('songs'\)\s*\.update\(updatePayload\)\s*\.eq\('id', song\.id\);\s*if \(error\) \{\s*setSaving\(false\);\s*return;\s*\}/s,
  );
});
