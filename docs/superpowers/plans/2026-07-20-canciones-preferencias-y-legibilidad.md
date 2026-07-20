# Canciones, preferencias personales y legibilidad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir el alta de canciones y guardar tono, comienzo y comentario por perfil, con una escala visual más legible y cobertura QA actualizada.

**Architecture:** Mantener `songs` como catálogo global, `service_songs` como fotografía del servicio y ampliar `song_key_history` como preferencia única por perfil+canción. Corregir el flujo dentro de `AddSongModal` y aplicar la escala visual mediante el `font-size` raíz existente, sin dependencias ni componentes nuevos.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase/PostgreSQL, `node:test`.

## Global Constraints

- Texto de contenido e inputs de 15–16 px y títulos principales cercanos a 20 px.
- Conservar áreas táctiles y controles accesibles.
- No agregar librerías ni un sistema tipográfico adicional.
- No crear otra tabla de preferencias.
- Los campos opcionales vacíos se guardan como `null`.
- No informar éxito ni cerrar el modal cuando falle una escritura.

---

### Task 1: Corregir alta, buscador y enlace de YouTube

**Files:**
- Create: `tests/add-song-modal.test.mjs`
- Modify: `src/components/AddSongModal.tsx`

**Interfaces:**
- Consumes: estados existentes `showNewForm`, `newYoutube`, `youtubeUrl` y operaciones Supabase del modal.
- Produces: `handleSave(): Promise<void>` que distingue una canción recién creada y solo cierra tras guardar el servicio.

- [ ] **Step 1: Escribir pruebas de regresión que fallen**

```js
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
  assert.match(modal, /if \(error \|\| !data\) \{\s*setSaving\(false\);\s*return;/s);
  assert.match(modal, /if \(result\) \{\s*onSaved\(result\);\s*onClose\(\);\s*\}/s);
});
```

- [ ] **Step 2: Ejecutar la prueba y observar el fallo esperado**

Run: `node --test --test-isolation=none tests/add-song-modal.test.mjs`

Expected: FAIL porque no existen `createdNewSong`, la condición del buscador ni el control de error.

- [ ] **Step 3: Implementar el cambio mínimo en el modal**

En `handleSave`, conservar si el alta ocurrió en esta misma operación y usar el enlace correcto:

```tsx
const createdNewSong = !song && showNewForm;

if (createdNewSong) {
  song = await saveNewSong();
  if (!song) {
    setSaving(false);
    return;
  }
}

const cleanUrl = (createdNewSong ? newYoutube : youtubeUrl).trim() || null;
```

Mostrar la búsqueda solo antes de entrar al alta:

```tsx
{!editingSong && !showNewForm && (
  <div>{/* buscador existente */}</div>
)}
```

Capturar `error` en insert/update de `service_songs` y cerrar únicamente con resultado:

```tsx
const { data, error } = await supabase
  .from('service_songs')
  .insert(payload)
  .select('*, song:songs(*), profile:profiles(*)')
  .single();

if (error || !data) {
  setSaving(false);
  return;
}
result = data;

if (result) {
  onSaved(result);
  onClose();
}
setSaving(false);
```

Aplicar el mismo control de `error || !data` a la rama de edición.

- [ ] **Step 4: Ejecutar la prueba focalizada**

Run: `node --test --test-isolation=none tests/add-song-modal.test.mjs`

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/add-song-modal.test.mjs src/components/AddSongModal.tsx
git commit -m "fix: persist new song details on first save"
```

### Task 2: Persistir preferencias personales por perfil y canción

**Files:**
- Create: `supabase/migrations/20260720000000_profile_song_notes.sql`
- Create: `tests/profile-song-preferences.test.mjs`
- Modify: `supabase/schema.sql`
- Modify: `src/types/index.ts`
- Modify: `src/components/AddSongModal.tsx`

**Interfaces:**
- Consumes: restricción única existente `(profile_id, song_id)` y trigger `update_song_key_history()`.
- Produces: `SongKeyHistory.notes: string | null` y precarga/sincronización de `key`, `starts_in`, `notes` solo para `profileId`+`song_id`.

- [ ] **Step 1: Escribir la prueba de contrato que falle**

```js
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
```

- [ ] **Step 2: Ejecutar la prueba y confirmar el fallo**

Run: `node --test --test-isolation=none tests/profile-song-preferences.test.mjs`

Expected: FAIL porque la migración y `SongKeyHistory.notes` aún no existen.

- [ ] **Step 3: Crear la migración idempotente**

```sql
alter table public.song_key_history
  add column if not exists notes text;

create or replace function public.update_song_key_history()
returns trigger as $$
begin
  if new.key is not null or new.starts_in is not null or new.notes is not null then
    insert into public.song_key_history (profile_id, song_id, key, starts_in, notes, updated_at)
    values (new.profile_id, new.song_id, new.key, new.starts_in, new.notes, now())
    on conflict (profile_id, song_id)
    do update set
      key = excluded.key,
      starts_in = excluded.starts_in,
      notes = excluded.notes,
      updated_at = now();
  end if;
  return new;
end;
$$ language plpgsql;
```

Replicar la columna y la función en `supabase/schema.sql`.

- [ ] **Step 4: Añadir el tipo y la precarga**

```ts
export interface SongKeyHistory {
  id: string;
  profile_id: string;
  song_id: string;
  key: MusicalKey | null;
  starts_in: MusicalKey | null;
  notes: string | null;
  updated_at: string;
}
```

En la consulta ya filtrada por perfil+canción:

```tsx
if (data && !editingSong) {
  setSelectedKey(data.key);
  setStartsIn(data.starts_in);
  setNotes(data.notes ?? '');
}
```

- [ ] **Step 5: Ejecutar las pruebas focalizadas**

Run: `node --test --test-isolation=none tests/profile-song-preferences.test.mjs tests/add-song-modal.test.mjs`

Expected: 4 PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260720000000_profile_song_notes.sql supabase/schema.sql src/types/index.ts src/components/AddSongModal.tsx tests/profile-song-preferences.test.mjs
git commit -m "feat: remember song preferences per profile"
```

### Task 3: Aplicar la escala visual equilibrada

**Files:**
- Create: `tests/readability-scale.test.mjs`
- Modify: `src/app/globals.css`
- Modify: `src/app/canciones/page.tsx`
- Modify: `src/app/metricas/page.tsx`
- Modify: `src/app/perfil/page.tsx`
- Modify: `src/app/service/[id]/page.tsx`
- Modify: `src/components/AddSongModal.tsx`

**Interfaces:**
- Consumes: escala `rem` de Tailwind existente.
- Produces: raíz de 17 px, que convierte `text-sm` en aproximadamente 15 px, más compactación puntual de espacios vacíos.

- [ ] **Step 1: Escribir la prueba visual estática que falle**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('uses the approved balanced reading scale', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  assert.match(css, /html\s*\{[^}]*font-size:\s*17px/s);
});

test('removes oversized empty states in primary views', () => {
  for (const file of [
    'src/app/canciones/page.tsx',
    'src/app/metricas/page.tsx',
    'src/app/perfil/page.tsx',
    'src/app/service/[id]/page.tsx',
  ]) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /py-(?:16|20)/);
  }
});
```

- [ ] **Step 2: Ejecutar y observar el fallo**

Run: `node --test --test-isolation=none tests/readability-scale.test.mjs`

Expected: FAIL por la ausencia de `font-size: 17px` y los estados `py-16`/`py-20` existentes.

- [ ] **Step 3: Aplicar el mínimo cambio global y compactación puntual**

```css
html {
  font-size: 17px;
}
```

En las cuatro vistas principales, cambiar únicamente estados vacíos `py-16` o `py-20` por `py-10`. Mantener paddings de botones, inputs y navegación.

- [ ] **Step 4: Ejecutar prueba y lint**

Run: `node --test --test-isolation=none tests/readability-scale.test.mjs && npm run lint`

Expected: 2 PASS y ESLint exit 0.

- [ ] **Step 5: Commit**

```bash
git add tests/readability-scale.test.mjs src/app/globals.css src/app/canciones/page.tsx src/app/metricas/page.tsx src/app/perfil/page.tsx src/app/service/[id]/page.tsx src/components/AddSongModal.tsx
git commit -m "style: improve app reading scale"
```

### Task 4: Enseñar los nuevos casos al agente QA

**Files:**
- Create: `tests/production-qa-skill.test.mjs`
- Modify: `.agents/skills/renuevo-production-qa/SKILL.md`
- Modify: `docs/qa.md`

**Interfaces:**
- Consumes: identificador y reglas de limpieza existentes del agente QA.
- Produces: casos manuales secuenciales para buscador oculto, enlace pegado, edición de comentario y aislamiento entre dos perfiles.

- [ ] **Step 1: Escribir la prueba del contrato QA que falle**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('production QA covers new song and per-profile preferences', () => {
  const skill = readFileSync('.agents/skills/renuevo-production-qa/SKILL.md', 'utf8');
  assert.match(skill, /buscador del catálogo no se muestra/i);
  assert.match(skill, /pegar.*enlace.*YouTube/i);
  assert.match(skill, /comentario personal/i);
  assert.match(skill, /segundo perfil QA/i);
  assert.match(skill, /tono y comentario distintos/i);
});
```

- [ ] **Step 2: Ejecutar y confirmar el fallo**

Run: `node --test --test-isolation=none tests/production-qa-skill.test.mjs`

Expected: FAIL porque los nuevos casos no figuran en el skill.

- [ ] **Step 3: Ampliar el caso de canciones sin duplicar el flujo**

Agregar al caso 5 del skill:

```markdown
- Activar «Crear canción nueva» y confirmar que el buscador del catálogo no se muestra.
- Pegar un enlace de YouTube visible de prueba, guardar una sola vez, volver a editar y confirmar que persiste.
- Guardar tono y comentario personal con el perfil QA director; reabrir y confirmar la precarga editable.
- Crear un segundo perfil QA con el mismo identificador, asignarlo como director sin reemplazar integrantes existentes y guardar tono y comentario distintos para la misma canción.
- Alternar entre ambos perfiles directores y confirmar que cada uno recupera únicamente sus valores.
```

Extender inventario y limpieza para ambos perfiles; cada nombre debe contener el identificador exacto. Resumir estos casos también en `docs/qa.md`.

- [ ] **Step 4: Ejecutar la prueba del skill**

Run: `node --test --test-isolation=none tests/production-qa-skill.test.mjs`

Expected: 1 PASS.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/renuevo-production-qa/SKILL.md docs/qa.md tests/production-qa-skill.test.mjs
git commit -m "test: cover song preferences in production QA"
```

### Task 5: Verificación integral

**Files:**
- Modify only if verification exposes a defect in files already listed above.

**Interfaces:**
- Consumes: todos los entregables anteriores.
- Produces: evidencia fresca de pruebas, lint y build.

- [ ] **Step 1: Ejecutar toda la suite**

Run: `npm test`

Expected: todas las pruebas PASS, 0 FAIL.

- [ ] **Step 2: Ejecutar lint**

Run: `npm run lint`

Expected: exit 0 sin errores.

- [ ] **Step 3: Ejecutar build productivo**

Run: `npm run build`

Expected: exit 0 y compilación de todas las rutas.

- [ ] **Step 4: Revisar el diff y el esquema**

Run: `git diff --check && git status --short`

Expected: sin errores de whitespace; solo cambios previstos si todavía no fueron confirmados.

- [ ] **Step 5: No ejecutar QA productivo antes del despliegue**

El agente queda configurado en este cambio. Ejecutar `$renuevo-production-qa` únicamente después de desplegar y recibir autorización explícita para crear y limpiar datos QA en producción.
