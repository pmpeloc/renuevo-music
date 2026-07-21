# PWA Identity Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Version every installable visual URL so Android can refresh the installed identity, while showing installed iOS/iPadOS users a one-time reinstall notice for each visual revision.

**Architecture:** Keep `/manifest.json` stable by replacing the static public file with a Next route that reads one shared `PWA_ASSET_VERSION`. The root metadata and a small client notice consume the same version, so icon, splash, and user guidance cannot drift.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node test runner.

## Global Constraints

- Keep the manifest URL `/manifest.json` and PWA identity stable.
- Use query-string versioning; do not duplicate raster files.
- Do not change `public/sw.js` or the general application cache lifecycle.
- Do not add dependencies.
- Android updates remain subject to Chrome/WebAPK scheduling.
- iOS/iPadOS installations require removal and reinstallation for icon and splash replacement.

---

## File Structure

- Create `src/lib/pwaIdentity.ts`: single visual version and stable install ID.
- Create `src/app/manifest.json/route.ts`: dynamic response at the existing manifest URL.
- Modify `src/app/layout.tsx`: version favicon, Apple touch icon, and startup-image URLs.
- Delete `public/manifest.json`: avoid shadowing the route at the same URL.
- Create `src/components/PWAIdentityUpdateNotice.tsx`: one-time installed-iOS guidance.
- Modify `src/components/Providers.tsx`: mount the guidance on every application page.
- Modify `tests/brand-identity.test.mjs`: executable structural regression checks.

### Task 1: Version the manifest and metadata from one source

**Files:**
- Create: `src/lib/pwaIdentity.ts`
- Create: `src/app/manifest.json/route.ts`
- Modify: `src/app/layout.tsx`
- Delete: `public/manifest.json`
- Modify: `tests/brand-identity.test.mjs`

**Interfaces:**
- Produces: `PWA_ASSET_VERSION: string` and `PWA_INSTALL_ID: string` from `@/lib/pwaIdentity`.
- Produces: `GET(): Response` at `/manifest.json` with a revalidated manifest.

- [ ] **Step 1: Replace the static-manifest test with failing shared-version tests**

In `tests/brand-identity.test.mjs`, replace the existing `manifest uses the Nocturno Azul install identity` test with:

```js
test('manifest and Apple metadata share one versioned PWA identity', () => {
  const identity = readFileSync('src/lib/pwaIdentity.ts', 'utf8');
  const manifestRoute = readFileSync('src/app/manifest.json/route.ts', 'utf8');
  const layout = readFileSync('src/app/layout.tsx', 'utf8');

  assert.match(identity, /PWA_ASSET_VERSION = '20260721'/);
  assert.match(identity, /PWA_INSTALL_ID = '\/'/);
  assert.match(manifestRoute, /import \{ PWA_ASSET_VERSION, PWA_INSTALL_ID \}/);
  assert.match(manifestRoute, /id: PWA_INSTALL_ID/);
  assert.match(manifestRoute, /icon-\$\{size\}\.png\?v=\$\{PWA_ASSET_VERSION\}/);
  assert.match(manifestRoute, /icon\(192, 'any maskable'\)/);
  assert.match(manifestRoute, /icon\(512, 'any maskable'\)/);
  assert.match(manifestRoute, /'Cache-Control': 'no-cache, must-revalidate'/);
  assert.match(layout, /import \{ PWA_ASSET_VERSION \} from '@\/lib\/pwaIdentity'/);
  assert.match(layout, /apple-touch-icon\.png\?v=\$\{PWA_ASSET_VERSION\}/);
  assert.equal((layout.match(/splash-[^'`]+\?v=\$\{PWA_ASSET_VERSION\}/g) ?? []).length, 6);
  assert.equal(existsSync('public/manifest.json'), false);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test --test-isolation=none --test-name-pattern="manifest and Apple metadata" tests/brand-identity.test.mjs`

Expected: FAIL because `src/lib/pwaIdentity.ts` does not exist.

- [ ] **Step 3: Add the shared identity constants**

Create `src/lib/pwaIdentity.ts`:

```ts
export const PWA_ASSET_VERSION = '20260721';
export const PWA_INSTALL_ID = '/';
```

- [ ] **Step 4: Serve the versioned manifest at its existing URL**

Create `src/app/manifest.json/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { PWA_ASSET_VERSION, PWA_INSTALL_ID } from '@/lib/pwaIdentity';

const icon = (size: number, purpose?: string) => ({
  src: `/icons/icon-${size}.png?v=${PWA_ASSET_VERSION}`,
  sizes: `${size}x${size}`,
  type: 'image/png',
  ...(purpose ? { purpose } : {}),
});

export function GET() {
  return NextResponse.json(
    {
      id: PWA_INSTALL_ID,
      name: 'Renuevo Music — Equipo de Alabanza',
      short_name: 'Renuevo Music',
      description:
        'Herramienta de coordinación para el equipo de alabanza de Iglesia El Renuevo. Organizá servicios, asigná directores, cargá canciones con tono y referencia de YouTube.',
      start_url: '/',
      display: 'standalone',
      background_color: '#060D18',
      theme_color: '#060D18',
      orientation: 'portrait',
      icons: [
        icon(48),
        icon(72),
        icon(96),
        icon(128),
        icon(144),
        icon(152),
        icon(192, 'any maskable'),
        icon(256),
        icon(384),
        icon(512, 'any maskable'),
      ],
      screenshots: [],
      categories: ['music', 'productivity'],
      lang: 'es',
    },
    { headers: { 'Cache-Control': 'no-cache, must-revalidate' } },
  );
}
```

Delete `public/manifest.json` after the route exists so only one resource owns `/manifest.json`.

- [ ] **Step 5: Version every visual URL in root metadata**

At the top of `src/app/layout.tsx`, add:

```ts
import { PWA_ASSET_VERSION } from '@/lib/pwaIdentity';
```

Append `?v=${PWA_ASSET_VERSION}` using template literals to the three `metadata.icons` URLs and all six `appleWebApp.startupImage` URLs. The resulting pattern is:

```ts
icons: {
  icon: [
    { url: `/favicon-16.png?v=${PWA_ASSET_VERSION}`, sizes: '16x16', type: 'image/png' },
    { url: `/favicon-32.png?v=${PWA_ASSET_VERSION}`, sizes: '32x32', type: 'image/png' },
    { url: `/icons/icon-192.png?v=${PWA_ASSET_VERSION}`, sizes: '192x192', type: 'image/png' },
  ],
  apple: [
    {
      url: `/icons/apple-touch-icon.png?v=${PWA_ASSET_VERSION}`,
      sizes: '180x180',
      type: 'image/png',
    },
  ],
},
```

For each existing startup entry, change only `url`, for example:

```ts
url: `/splash-1290x2796.png?v=${PWA_ASSET_VERSION}`,
```

- [ ] **Step 6: Run the identity tests**

Run: `node --test --test-isolation=none --test-name-pattern="brand|manifest|raster|splash" tests/brand-identity.test.mjs`

Expected: all matching tests PASS.

- [ ] **Step 7: Commit the independently working manifest update**

```bash
git add src/lib/pwaIdentity.ts src/app/manifest.json/route.ts src/app/layout.tsx public/manifest.json tests/brand-identity.test.mjs
git commit -m "fix: version installed PWA identity"
```

### Task 2: Guide installed iOS users once per visual version

**Files:**
- Create: `src/components/PWAIdentityUpdateNotice.tsx`
- Modify: `src/components/Providers.tsx`
- Modify: `tests/brand-identity.test.mjs`

**Interfaces:**
- Consumes: `PWA_ASSET_VERSION: string` from `@/lib/pwaIdentity`.
- Produces: default React component `PWAIdentityUpdateNotice` with no props.

- [ ] **Step 1: Add the failing notice behavior test**

Append to `tests/brand-identity.test.mjs`:

```js
test('installed Apple users see one reinstall notice per visual version', () => {
  const notice = readFileSync('src/components/PWAIdentityUpdateNotice.tsx', 'utf8');
  const providers = readFileSync('src/components/Providers.tsx', 'utf8');

  assert.match(notice, /PWA_ASSET_VERSION/);
  assert.match(notice, /navigator\.standalone/);
  assert.match(notice, /display-mode: standalone/);
  assert.match(notice, /navigator\.maxTouchPoints > 1/);
  assert.match(notice, /localStorage\.getItem\(storageKey\)/);
  assert.match(notice, /localStorage\.setItem\(storageKey, PWA_ASSET_VERSION\)/);
  assert.match(notice, /eliminar este acceso y volver a agregarlo/i);
  assert.match(providers, /<PWAIdentityUpdateNotice \/>/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test --test-isolation=none --test-name-pattern="installed Apple users" tests/brand-identity.test.mjs`

Expected: FAIL because `src/components/PWAIdentityUpdateNotice.tsx` does not exist.

- [ ] **Step 3: Implement the minimal platform and installation check**

Create `src/components/PWAIdentityUpdateNotice.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { PWA_ASSET_VERSION } from '@/lib/pwaIdentity';

const storageKey = 'renuevo-pwa-identity-version';

export default function PWAIdentityUpdateNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & {
      standalone?: boolean;
    };
    const isApple =
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isInstalled =
      navigatorWithStandalone.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    setVisible(
      isApple &&
        isInstalled &&
        localStorage.getItem(storageKey) !== PWA_ASSET_VERSION,
    );
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(storageKey, PWA_ASSET_VERSION);
    setVisible(false);
  }

  return (
    <aside
      role='status'
      className='fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-2xl bg-white p-4 text-gray-900 shadow-xl'
    >
      <p className='font-semibold'>Nuevo ícono disponible</p>
      <p className='mt-1 text-sm text-gray-600'>
        Para actualizar el ícono y la pantalla de inicio, Apple requiere
        eliminar este acceso y volver a agregarlo desde Safari.
      </p>
      <button
        type='button'
        onClick={dismiss}
        className='mt-3 text-sm font-semibold'
        style={{ color: 'var(--purple-600)' }}
      >
        Entendido
      </button>
    </aside>
  );
}
```

- [ ] **Step 4: Mount the notice globally**

Change `src/components/Providers.tsx` to:

```tsx
'use client';
import { ReactNode } from 'react';
import { LoadingProvider } from '@/context/LoadingContext';
import PWAIdentityUpdateNotice from '@/components/PWAIdentityUpdateNotice';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LoadingProvider>
      {children}
      <PWAIdentityUpdateNotice />
    </LoadingProvider>
  );
}
```

- [ ] **Step 5: Run the focused and full tests**

Run: `node --test --test-isolation=none --test-name-pattern="installed Apple users" tests/brand-identity.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit the iOS guidance**

```bash
git add src/components/PWAIdentityUpdateNotice.tsx src/components/Providers.tsx tests/brand-identity.test.mjs
git commit -m "feat: explain PWA identity refresh on iOS"
```

### Task 3: Verify production build and deployment behavior

**Files:**
- Modify only if verification exposes a defect in Task 1 or Task 2.

**Interfaces:**
- Consumes: `/manifest.json`, root metadata, and `PWAIdentityUpdateNotice` from prior tasks.
- Produces: a deployable build with no new interface.

- [ ] **Step 1: Run static checks and the production build**

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0 and a route entry for `/manifest.json`.

- [ ] **Step 2: Inspect the built manifest response locally**

Start the production server with `npm start`, then request `http://127.0.0.1:3000/manifest.json`.

Expected:

- HTTP 200;
- `Cache-Control: no-cache, must-revalidate`;
- `id` equals `/`;
- every icon URL ends with `?v=20260721`.

- [ ] **Step 3: Perform platform smoke checks after deployment**

On Android Chrome, open the deployed PWA, close all PWA windows, and confirm the manifest in `chrome://web-app-internals` or `about:webapks` reports the current versioned icon URL. The launcher update may be delayed by WebAPK scheduling.

On an already-installed iPhone/iPad PWA, confirm the notice appears once, dismiss it, relaunch, and confirm it stays dismissed. Remove and reinstall the PWA from Safari, then confirm the new icon and startup image are used.

- [ ] **Step 4: Record the final verified state**

Run: `git status --short`

Expected: no uncommitted implementation changes. If verification required a correction, commit only that correction with a message describing the observed defect.
