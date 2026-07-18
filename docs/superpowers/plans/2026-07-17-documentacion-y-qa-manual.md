# Renuevo Music Documentation and Manual QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document Renuevo Music, add cascade-safe song deletion to the UI, and ship a repository-local Codex skill that performs manual QA against production and cleans its own data.

**Architecture:** Keep deletion atomic in Supabase with `ON DELETE CASCADE` and issue one `songs` delete from the existing Canciones page, using the browser's native confirmation dialog. Store the QA workflow in `.agents/skills` so it travels with the repository and operates production only through the visible UI.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase PostgreSQL, native browser APIs, Codex repository skills.

## Global Constraints

- Production URL: `https://renuevo-music.vercel.app`.
- QA data prefix: `QA_AUTOMATION_<timestamp>` with UTC `YYYYMMDDTHHMMSSZ`.
- Browser interaction only; no Playwright, Selenium, direct Supabase access, scheduled execution, CI, or parallel runs.
- Song deletion cascades to `service_songs` and `song_key_history` and requires an explicit irreversible-action warning.
- Cleanup never deletes an item unless its visible text contains the current run identifier exactly.
- Global result values are `PASS`, `FAIL`, `FAIL-CLEANUP`, and `BLOCKED`; cleanup failure takes precedence.

---

## File Map

- `supabase/migrations/20260717000000_song_delete_cascade.sql`: idempotently align existing databases with the cascade constraints already present in `supabase/schema.sql`.
- `src/app/canciones/page.tsx`: expose delete, confirm it, show progress/errors, and update local song/usage state after success.
- `README.md`: concise product entry point and links to detailed documentation.
- `docs/architecture.md`: routes, components, data model, Realtime, PWA, and security boundary.
- `docs/operations.md`: environment, database migration, deploy, and production checks.
- `docs/qa.md`: user-facing invocation, safety rules, result meanings, and report handling.
- `.agents/skills/renuevo-production-qa/SKILL.md`: executable manual QA workflow and report contract.
- `.agents/skills/renuevo-production-qa/agents/openai.yaml`: skill UI metadata.

### Task 1: Guarantee database cascade behavior

**Files:**
- Create: `supabase/migrations/20260717000000_song_delete_cascade.sql`
- Verify: `supabase/schema.sql`

**Interfaces:**
- Consumes: PostgreSQL constraints on `public.service_songs.song_id` and `public.song_key_history.song_id`.
- Produces: both foreign keys referencing `public.songs(id) ON DELETE CASCADE` with stable names.

- [ ] **Step 1: Verify the source schema already expresses the intended behavior**

Run:

```powershell
rg -n "song_id.*references public\.songs\(id\) on delete cascade" supabase/schema.sql
```

Expected: exactly two matches, one in `song_key_history` and one in `service_songs`.

- [ ] **Step 2: Write the idempotent production migration**

Create `supabase/migrations/20260717000000_song_delete_cascade.sql`:

```sql
alter table public.service_songs
  drop constraint if exists service_songs_song_id_fkey,
  add constraint service_songs_song_id_fkey
    foreign key (song_id) references public.songs(id) on delete cascade;

alter table public.song_key_history
  drop constraint if exists song_key_history_song_id_fkey,
  add constraint song_key_history_song_id_fkey
    foreign key (song_id) references public.songs(id) on delete cascade;
```

- [ ] **Step 3: Check migration coverage and syntax boundaries**

Run:

```powershell
rg -n "drop constraint if exists|references public\.songs\(id\) on delete cascade" supabase/migrations/20260717000000_song_delete_cascade.sql
```

Expected: two guarded drops and two cascade references. Apply the migration to a non-production Supabase database when available; otherwise record production application as the deployment gate in Task 5 rather than pretending it ran locally.

- [ ] **Step 4: Commit the database guarantee**

```powershell
git add supabase/migrations/20260717000000_song_delete_cascade.sql
git commit -m "fix: guarantee cascading song deletion"
```

### Task 2: Add song deletion to the existing Canciones page

**Files:**
- Modify: `src/app/canciones/page.tsx`

**Interfaces:**
- Consumes: `supabase.from('songs').delete().eq('id', song.id)` and React state already owned by `CancionesPage`.
- Produces: `handleDelete(song: Song): Promise<void>`, visible deletion error, and a disabled delete action while a song is being removed.

- [ ] **Step 1: Establish the failing manual check**

Run the app with `npm run dev`, open `/canciones`, and inspect an existing song.

Expected before implementation: edit is available but there is no action that warns about and deletes the catalog song.

- [ ] **Step 2: Add the minimal state and delete handler**

Import `Trash2` from `lucide-react`, then add this state beside `editingSong`:

```tsx
const [deletingSongId, setDeletingSongId] = useState<string | null>(null);
const [deleteError, setDeleteError] = useState('');
```

Add this handler beside `handleSaved`:

```tsx
async function handleDelete(song: Song) {
  const confirmed = window.confirm(
    `¿Eliminar “${song.title}”? También se eliminará de las listas de servicios y su historial de tonos. Esta acción no se puede deshacer.`,
  );
  if (!confirmed) return;

  setDeletingSongId(song.id);
  setDeleteError('');
  const { error } = await supabase.from('songs').delete().eq('id', song.id);
  setDeletingSongId(null);

  if (error) {
    setDeleteError('No se pudo eliminar la canción. Intentá de nuevo.');
    return;
  }

  setSongs((prev) => prev.filter((item) => item.id !== song.id));
  setServiceSongs((prev) => prev.filter((item) => item.song_id !== song.id));
}
```

- [ ] **Step 3: Add the native delete action to each existing song card**

Place the button next to the existing edit action, preserving the card layout:

```tsx
<button
  type='button'
  onClick={() => handleDelete(song)}
  disabled={deletingSongId === song.id}
  aria-label={`Eliminar ${song.title}`}
  className='w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center disabled:opacity-50'>
  {deletingSongId === song.id ? (
    <Loader2 size={15} className='animate-spin' />
  ) : (
    <Trash2 size={15} />
  )}
</button>
```

Render the error once above the song list:

```tsx
{deleteError && (
  <p role='alert' className='mx-4 mt-3 text-sm text-red-600'>
    {deleteError}
  </p>
)}
```

- [ ] **Step 4: Run the local behavior check**

Create a disposable song through the existing UI, cancel its first delete confirmation, then confirm deletion.

Expected: cancel preserves it; confirm shows progress and removes it only after success; a refresh does not restore it. Do not use a real team song.

- [ ] **Step 5: Run static verification and commit**

```powershell
npm run lint
npm run build
git add src/app/canciones/page.tsx
git commit -m "feat: delete songs from catalog"
```

Expected: lint and build exit with code `0` before the commit.

### Task 3: Complete repository documentation

**Files:**
- Modify: `README.md`
- Create: `docs/architecture.md`
- Create: `docs/operations.md`
- Create: `docs/qa.md`

**Interfaces:**
- Consumes: current routes under `src/app`, `supabase/schema.sql`, `package.json`, `vercel.json`, and the approved design spec.
- Produces: one concise entry point and three non-overlapping reference documents.

- [ ] **Step 1: Replace stale README setup and repository placeholders**

Keep the existing product summary and feature list, correct the clone URL to `git@github.com:pmpeloc/renuevo-music.git`, name `https://renuevo-music.vercel.app` as production, and link to:

```markdown
## Documentación

- [Arquitectura y datos](docs/architecture.md)
- [Operación y despliegue](docs/operations.md)
- [QA manual contra producción](docs/qa.md)
```

The quick start must contain only `npm install`, `.env.local` variables already consumed by the app, `npm run dev`, `npm run lint`, and `npm run build`.

- [ ] **Step 2: Write `docs/architecture.md` from verified code**

Include these exact sections:

```markdown
# Arquitectura
## Superficies de usuario
## Componentes y estado
## Modelo de datos
## Tiempo real, PWA y notificaciones
## Límite de seguridad
```

Document `/`, `/home`, `/service/[id]`, `/canciones`, `/metricas`, `/perfil`, and `/offline`; list every public table and its cascade relationships; state explicitly that profile selection is not authentication and current RLS permits anonymous access.

- [ ] **Step 3: Write `docs/operations.md` with executable operations**

Include environment variables from `README.md`, database bootstrap via `supabase/schema.sql`, ordered application of `supabase/migrations/*.sql`, Vercel deployment from `vercel.json`, and this post-deploy checklist:

```markdown
- Abrir `https://renuevo-music.vercel.app` sin sesión previa.
- Confirmar que el selector de perfiles carga.
- Confirmar navegación a Inicio y Canciones.
- Ejecutar `$renuevo-production-qa`.
- Confirmar que el reporte no termina en `FAIL-CLEANUP`.
```

- [ ] **Step 4: Write `docs/qa.md` without duplicating the skill body**

Document invocation (`$renuevo-production-qa`), production URL, the identifier format, `PASS`/`FAIL`/`FAIL-CLEANUP`/`BLOCKED`, browser-only restriction, and how to escalate residual data. Link to the skill for the authoritative case sequence.

- [ ] **Step 5: Check documentation against the repository and commit**

```powershell
rg -n "tu-usuario|TBD|TODO|Playwright|Selenium" README.md docs
rg -n "renuevo-music\.vercel\.app|renuevo-production-qa" README.md docs
git diff --check
git add README.md docs/architecture.md docs/operations.md docs/qa.md
git commit -m "docs: complete project operations guide"
```

Expected: the first search finds only intentional statements that Playwright and Selenium are prohibited; it finds no placeholder. The second finds the production URL and skill invocation. `git diff --check` is clean.

### Task 4: Create the repository-local manual QA skill

**Files:**
- Create: `.agents/skills/renuevo-production-qa/SKILL.md`
- Create: `.agents/skills/renuevo-production-qa/agents/openai.yaml`

**Interfaces:**
- Consumes: browser-control capability, production UI, and the visible text contract defined in the design.
- Produces: `$renuevo-production-qa` and a Markdown report with global status plus cleanup evidence.

- [ ] **Step 1: Initialize the skill with the official generator**

Run:

```powershell
& 'C:\Users\pmpel\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\pmpel\.codex\skills\.system\skill-creator\scripts\init_skill.py' renuevo-production-qa --path .agents/skills --interface 'display_name=Renuevo Production QA' --interface 'short_description=QA manual seguro contra producción' --interface 'default_prompt=Use $renuevo-production-qa to test Renuevo Music production and clean every QA record.'
```

Expected: the two files in this task are created; do not create `scripts`, `references`, or `assets` directories.

- [ ] **Step 2: Replace the generated `SKILL.md` completely**

Use this frontmatter:

```yaml
---
name: renuevo-production-qa
description: Ejecuta QA manual de Renuevo Music con un navegador real contra producción, crea datos QA_AUTOMATION aislados, limpia siempre desde la UI y reporta fallos con evidencia. Usar cuando se pida validar, probar, hacer smoke test o revisar el despliegue productivo de Renuevo Music. No usa Playwright, Selenium ni acceso directo a Supabase.
---
```

The imperative body must contain, in order:

1. hard boundaries: exact production URL, visible UI only, no developer console/direct API, no foreign-data deletion;
2. UTC identifier generation and reuse;
3. preflight and initial-state capture;
4. numbered cases for profile creation/selection, navigation, profile edit, service role assignment, song create/edit/use, catalog/metrics verification, cascade deletion, and profile deletion;
5. safe continuation rule after functional failures;
6. mandatory cleanup attempted from Canciones then Perfil even after failure;
7. absence verification by returning to and searching each relevant list;
8. result precedence and the exact Markdown report headings `Resultado`, `Entorno`, `Casos`, `Fallos`, `Datos creados`, and `Limpieza`.

Every created profile name and song title must contain the exact run identifier. Require captures for failures when browser control supports them. If ownership is uncertain, skip deletion and emit `FAIL-CLEANUP`.

- [ ] **Step 3: Verify generated UI metadata**

Ensure `.agents/skills/renuevo-production-qa/agents/openai.yaml` is exactly:

```yaml
interface:
  display_name: "Renuevo Production QA"
  short_description: "QA manual seguro contra producción"
  default_prompt: "Use $renuevo-production-qa to test Renuevo Music production and clean every QA record."
```

- [ ] **Step 4: Validate and scan the skill**

```powershell
& 'C:\Users\pmpel\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\pmpel\.codex\skills\.system\skill-creator\scripts\quick_validate.py' .agents/skills/renuevo-production-qa
rg -n "TBD|TODO|Playwright|Selenium|supabase|QA_AUTOMATION|FAIL-CLEANUP" .agents/skills/renuevo-production-qa
```

Expected: validator reports a valid skill; prohibited tools appear only in explicit prohibitions; `QA_AUTOMATION` and `FAIL-CLEANUP` are present; direct Supabase access is explicitly prohibited.

- [ ] **Step 5: Commit the portable skill**

```powershell
git add .agents/skills/renuevo-production-qa
git commit -m "feat: add production manual QA skill"
```

### Task 5: Verify, deploy, and forward-test production safely

**Files:**
- Modify only if validation exposes a defect: `.agents/skills/renuevo-production-qa/SKILL.md`, `docs/qa.md`, or implementation files from prior tasks.

**Interfaces:**
- Consumes: deployed migration and application commit plus `$renuevo-production-qa`.
- Produces: passing local checks, a real QA report, and zero visible records for the run identifier.

- [ ] **Step 1: Run the complete local gate**

```powershell
npm run lint
npm run build
& 'C:\Users\pmpel\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\pmpel\.codex\skills\.system\skill-creator\scripts\quick_validate.py' .agents/skills/renuevo-production-qa
git diff --check
git status --short
```

Expected: all commands exit `0`; the worktree is clean after the task commits.

- [ ] **Step 2: Apply the database migration before the application deploy**

Apply `supabase/migrations/20260717000000_song_delete_cascade.sql` to the production Supabase project through the project's established migration channel. Verify the two production foreign keys use delete action `CASCADE`. Stop deployment if this cannot be confirmed.

- [ ] **Step 3: Deploy the application commit**

Deploy through the existing Vercel/Git integration, then open `https://renuevo-music.vercel.app/canciones` and confirm the delete control is present. Do not test it on an existing team song.

- [ ] **Step 4: Invoke the skill for the real forward test**

Invoke:

```text
$renuevo-production-qa
```

Expected: the skill creates one run identifier, exercises the agreed browser flows, emits the complete Markdown report, deletes the QA song and profile through the UI, and verifies their absence.

- [ ] **Step 5: Resolve the run result**

If the result is `FAIL`, preserve the report and fix only the demonstrated product/skill defect before rerunning with a new identifier. If it is `FAIL-CLEANUP`, surface the residual identifiers first, clean only those exact records through the UI, and do not claim completion until absence is verified. If it is `BLOCKED`, record the unavailable prerequisite and do not mutate production further.

- [ ] **Step 6: Commit only evidence-driven corrections**

```powershell
git add .agents/skills/renuevo-production-qa/SKILL.md docs/qa.md src/app/canciones/page.tsx supabase/migrations/20260717000000_song_delete_cascade.sql
git commit -m "fix: harden production QA workflow"
```

Run this commit only when the forward test required tracked corrections; otherwise skip it.
