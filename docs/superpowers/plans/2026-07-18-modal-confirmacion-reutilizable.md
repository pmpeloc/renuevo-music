# Reusable Confirmation Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the song deletion native confirmation with an accessible, reusable in-DOM confirmation modal.

**Architecture:** Add one controlled `ConfirmDialog` component that owns only presentation and keyboard/backdrop behavior. Keep song selection, Supabase deletion, error handling, and list updates in the Canciones page.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Node.js built-in test runner, Next.js 16.

## Global Constraints

- Do not add dependencies.
- Follow the existing mobile bottom-sheet and desktop centered-card pattern.
- Do not change existing in-DOM modals.
- Leave no native `confirm()` call in `src`.
- Do not deploy or modify production data during implementation.

---

### Task 1: Controlled confirmation dialog

**Files:**
- Create: `src/components/ConfirmDialog.tsx`
- Create: `tests/confirm-dialog.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `ConfirmDialog({ title, description, cancelLabel, confirmLabel, pendingLabel, pending, onCancel, onConfirm })`.
- `onCancel` is ignored while `pending` is true; `onConfirm` is exposed only through the destructive action button.

- [ ] **Step 1: Write the failing contract test**

Create `tests/confirm-dialog.test.mjs` with `node:test`, read `src/components/ConfirmDialog.tsx`, and assert that it contains `role='dialog'`, `aria-modal='true'`, an Escape listener, backdrop cancellation, disabled pending controls, and both callbacks. Also assert recursively across `src` that no file contains a native `window.confirm(` or bare `confirm(` call.

```js
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
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/confirm-dialog.test.mjs`

Expected: FAIL because `src/components/ConfirmDialog.tsx` does not exist.

- [ ] **Step 3: Implement the minimum controlled component**

Create a client component with the exact props above. Use `useEffect` to listen for `Escape`, clean up the listener, and call `onCancel` only when not pending. Render a labelled `role='dialog'` over the existing backdrop pattern, cancel on a backdrop click only when not pending, and disable both buttons while pending. No focus-trap package or animation abstraction.

```tsx
'use client';
import { useEffect } from 'react';

type ConfirmDialogProps = {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog(props: ConfirmDialogProps) {
  const { title, description, cancelLabel, confirmLabel, pendingLabel, pending, onCancel, onConfirm } = props;
  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onCancel();
    }
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onCancel, pending]);

  return (
    <div className='fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center' style={{ background: 'rgba(0,0,0,0.5)' }} onClick={(event) => {
      if (event.target === event.currentTarget && !pending) onCancel();
    }}>
      <div role='dialog' aria-modal='true' aria-labelledby='confirm-dialog-title' className='bg-white rounded-t-3xl lg:rounded-3xl p-5 lg:max-w-sm lg:w-full mx-auto'>
        <h3 id='confirm-dialog-title' className='font-semibold text-gray-900'>{title}</h3>
        <p className='mt-2 text-sm text-gray-600'>{description}</p>
        <div className='mt-5 flex gap-3'>
          <button type='button' disabled={pending} onClick={onCancel} className='flex-1 rounded-xl border px-4 py-3 disabled:opacity-50'>{cancelLabel}</button>
          <button type='button' disabled={pending} onClick={onConfirm} className='flex-1 rounded-xl bg-red-600 px-4 py-3 text-white disabled:opacity-50'>{pending ? pendingLabel : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
```

Add `"test": "node --test tests/*.test.mjs"` to `package.json`.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add package.json src/components/ConfirmDialog.tsx tests/confirm-dialog.test.mjs
git commit -m "feat: add reusable confirmation dialog"
```

### Task 2: Song deletion integration

**Files:**
- Modify: `src/app/canciones/page.tsx`
- Modify: `tests/confirm-dialog.test.mjs`

**Interfaces:**
- Consumes: `ConfirmDialog` from Task 1.
- Produces: selecting a song opens the dialog; cancel clears the selection; confirm runs the existing Supabase deletion; success closes it and removes local associations; failure keeps it open and permits retry.

- [ ] **Step 1: Extend the contract test and verify RED**

Assert that `src/app/canciones/page.tsx` imports and renders `ConfirmDialog`, passes the cascade warning, tracks a selected song, and calls the existing deletion handler from `onConfirm`.

```js
test('song deletion uses the confirmation dialog', () => {
  const page = readFileSync('src/app/canciones/page.tsx', 'utf8');
  assert.match(page, /import ConfirmDialog/);
  assert.match(page, /songToDelete/);
  assert.match(page, /<ConfirmDialog/);
  assert.match(page, /onConfirm=\{\(\) => handleDelete\(songToDelete\)\}/);
  assert.match(page, /historial de tonos/);
  assert.doesNotMatch(page, /(?:window\.)?confirm\s*\(/);
});
```

Run: `npm test`

Expected: FAIL because Canciones still calls `window.confirm()` and does not render `ConfirmDialog`.

- [ ] **Step 2: Implement the minimum integration**

Add `songToDelete: Song | null`. Change the trash button to set that state. Make `handleDelete` accept the already-selected song without calling a native confirmation. Clear the selection after success, keep it after failure, and render `ConfirmDialog` with:

```tsx
const [songToDelete, setSongToDelete] = useState<Song | null>(null);

// The existing delete function keeps its Supabase call and local state updates,
// but removes window.confirm() and calls setSongToDelete(null) after success.

{songToDelete && (
  <ConfirmDialog
    title='Eliminar canción'
    description={`¿Eliminar “${songToDelete.title}”? También se eliminará de las listas de servicios y su historial de tonos. Esta acción no se puede deshacer.`}
    cancelLabel='Cancelar'
    confirmLabel='Eliminar'
    pendingLabel='Eliminando…'
    pending={deletingSongId === songToDelete.id}
    onCancel={() => setSongToDelete(null)}
    onConfirm={() => handleDelete(songToDelete)}
  />
)}
```

- title `Eliminar canción`
- the existing cascade and irreversible-action warning
- cancel label `Cancelar`
- confirm label `Eliminar`
- pending label `Eliminando…`

- [ ] **Step 3: Run focused checks and verify GREEN**

Run: `npm test`

Expected: PASS, including the repository scan for native confirmations.

- [ ] **Step 4: Run the delivery gate**

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 5: Commit**

```powershell
git add src/app/canciones/page.tsx tests/confirm-dialog.test.mjs
git commit -m "fix: replace native song deletion confirmation"
```
