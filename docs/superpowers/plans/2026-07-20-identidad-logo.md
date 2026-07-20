# Renuevo Music Logo Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el monograma RM por la hoja azul con onda blanca aprobada y usarla consistentemente en la interfaz, favicon, PWA y splash screens.

**Architecture:** Un SVG transparente será la fuente visual maestra. Un componente React compondrá símbolo y nombre en la UI; un script reproducible con el `sharp` ya instalado por Next generará todos los PNG derivados sin incorporar dependencias nuevas.

**Tech Stack:** Next.js 16, React 19, TypeScript, SVG, Sharp 0.34.5 (dependencia ya instalada por Next), Node Test Runner.

## Global Constraints

- Paleta: fondo `#060D18`, gradiente azul `#7594FF` a `#4568E8`, onda blanca.
- No agregar dependencias.
- No cambiar rutas, datos ni funcionalidades.
- Mantener los nombres y dimensiones actuales de iconos y splash screens.
- No estirar el símbolo; conservar siempre una relación de aspecto `1:1` con `object-fit: contain`.

---

### Task 1: Símbolo maestro y componente de marca

**Files:**
- Create: `public/brand/renuevo-mark.svg`
- Create: `src/components/BrandLogo.tsx`
- Create: `tests/brand-identity.test.mjs`

**Interfaces:**
- Produces: `BrandLogo({ variant?: 'mark' | 'lockup', size?: number, className?: string, priority?: boolean })`
- Produces: `/brand/renuevo-mark.svg`, símbolo cuadrado transparente.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('brand uses one vector mark and an accessible reusable component', () => {
  assert.equal(existsSync('public/brand/renuevo-mark.svg'), true);
  const svg = readFileSync('public/brand/renuevo-mark.svg', 'utf8');
  const component = readFileSync('src/components/BrandLogo.tsx', 'utf8');

  assert.match(svg, /viewBox="0 0 112 112"/);
  assert.match(svg, /linearGradient/);
  assert.match(svg, /aria-hidden="true"/);
  assert.match(component, /variant\?: 'mark' \| 'lockup'/);
  assert.match(component, /alt='Renuevo Music'/);
  assert.match(component, /object-contain/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-isolation=none tests/brand-identity.test.mjs`

Expected: FAIL because `public/brand/renuevo-mark.svg` does not exist.

- [ ] **Step 3: Create the master SVG**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="leaf" x1="18" y1="92" x2="91" y2="9" gradientUnits="userSpaceOnUse">
      <stop stop-color="#4568E8"/>
      <stop offset="1" stop-color="#7594FF"/>
    </linearGradient>
  </defs>
  <path fill="url(#leaf)" d="M14 64C14 40 33 31 55 23C70 17 79 8 84 0C90 29 88 56 73 78C61 95 43 106 20 110C28 96 32 85 33 78C22 76 14 71 14 64Z"/>
  <path d="M25 58H76M30 50V66M38 42V74M46 34V82M54 27V89M62 37V79M70 46V70" stroke="white" stroke-width="3" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 4: Create the minimal React component**

```tsx
import Image from 'next/image';

interface BrandLogoProps {
  variant?: 'mark' | 'lockup';
  size?: number;
  className?: string;
  priority?: boolean;
}

export default function BrandLogo({
  variant = 'lockup',
  size = 48,
  className = '',
  priority = false,
}: BrandLogoProps) {
  return (
    <div className={`brand-lockup ${className}`.trim()}>
      <Image
        src='/brand/renuevo-mark.svg'
        alt='Renuevo Music'
        width={size}
        height={size}
        className='brand-lockup__mark object-contain'
        priority={priority}
      />
      {variant === 'lockup' && (
        <span className='brand-lockup__name' aria-hidden='true'>
          <span>Renuevo</span>
          <span>Music</span>
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the focused test**

Run: `node --test --test-isolation=none tests/brand-identity.test.mjs`

Expected: PASS, 1 test.

- [ ] **Step 6: Commit**

```powershell
git add public/brand/renuevo-mark.svg src/components/BrandLogo.tsx tests/brand-identity.test.mjs
git commit -m "feat: add Renuevo Music vector identity"
```

---

### Task 2: Aplicar la marca en desktop y mobile

**Files:**
- Modify: `tests/brand-identity.test.mjs`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `BrandLogo` from Task 1.
- Produces: lockup desktop, lockup de selección de perfil y encabezado compacto mobile.

- [ ] **Step 1: Add the failing UI integration test**

```js
test('all app surfaces use the shared brand component', () => {
  const shell = readFileSync('src/components/AppShell.tsx', 'utf8');
  const profileSelection = readFileSync('src/app/page.tsx', 'utf8');
  const css = readFileSync('src/app/globals.css', 'utf8');

  assert.match(shell, /import BrandLogo from '.\/BrandLogo'/);
  assert.match(shell, /className='mobile-brand/);
  assert.match(profileSelection, /import BrandLogo from '@\/components\/BrandLogo'/);
  assert.doesNotMatch(shell + profileSelection, /renuevo-music-2\.png/);
  assert.doesNotMatch(css, /\.brand-logo\s*\{[^}]*filter:/s);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-isolation=none tests/brand-identity.test.mjs`

Expected: FAIL because both screens still reference `renuevo-music-2.png`.

- [ ] **Step 3: Replace the sidebar logo and add the mobile header**

In `src/components/AppShell.tsx`, remove the `next/image` import, add `import BrandLogo from './BrandLogo';`, replace the sidebar logo block with:

```tsx
<div className='app-sidebar__logo px-5 py-6'>
  <BrandLogo size={52} priority />
</div>
```

Add immediately before the content area:

```tsx
<header className='mobile-brand lg:hidden'>
  <BrandLogo size={36} />
</header>
```

- [ ] **Step 4: Replace the selection-screen image**

In `src/app/page.tsx`, remove the `next/image` import and replace the image wrapper and `h1` with:

```tsx
<BrandLogo className='justify-center' size={88} priority />
```

- [ ] **Step 5: Add shared brand styles and remove the legacy filter**

Replace `.brand-logo` in `src/app/globals.css` with:

```css
.brand-lockup { display: inline-flex; align-items: center; gap: 12px; }
.brand-lockup__mark { flex: 0 0 auto; aspect-ratio: 1; }
.brand-lockup__name { color: var(--text-primary); display: flex; flex-direction: column; font-size: 1rem; font-weight: 650; line-height: .96; letter-spacing: -.02em; }
.mobile-brand { min-height: 64px; padding: 10px 20px; background: var(--sidebar); border-bottom: 1px solid var(--border); }
```

- [ ] **Step 6: Run focused and full checks**

Run: `node --test --test-isolation=none tests/brand-identity.test.mjs`

Expected: PASS, 2 tests.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 7: Commit**

```powershell
git add src/components/AppShell.tsx src/app/page.tsx src/app/globals.css tests/brand-identity.test.mjs
git commit -m "feat: apply shared brand logo across app shell"
```

---

### Task 3: Generar favicon, iconos PWA y splash screens

**Files:**
- Create: `scripts/generate-brand-assets.mjs`
- Modify: `package.json`
- Modify: `tests/brand-identity.test.mjs`
- Regenerate: `public/favicon-16.png`, `public/favicon-32.png`, `public/icons/*.png`, `public/splash-*.png`
- Delete: `src/app/favicon.ico`

**Interfaces:**
- Consumes: `public/brand/renuevo-mark.svg`.
- Produces: `npm run brand:assets` and every raster asset referenced by metadata/manifest.

- [ ] **Step 1: Add a failing raster validation test**

```js
import sharp from 'sharp';

async function assertNocturnalAsset(path, width, height) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, width);
  assert.equal(info.height, height);
  assert.deepEqual([...data.subarray(0, 3)], [6, 13, 24]);
  let bluePixels = 0;
  for (let i = 0; i < data.length; i += 3) {
    if (data[i + 2] > 120 && data[i + 2] > data[i] * 1.2) bluePixels++;
  }
  assert.ok(bluePixels > width * height * 0.01);
}

test('generated icons and splash screens use the Nocturno Azul identity', async () => {
  await assertNocturnalAsset('public/icons/icon-512.png', 512, 512);
  await assertNocturnalAsset('public/splash-1170x2532.png', 1170, 2532);
  assert.equal(existsSync('src/app/favicon.ico'), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-isolation=none tests/brand-identity.test.mjs`

Expected: FAIL because the current raster assets use the old dark-gray RM identity and `src/app/favicon.ico` still exists.

- [ ] **Step 3: Add the reproducible generator**

Create `scripts/generate-brand-assets.mjs`:

```js
import { copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const mark = await readFile(path.join(root, 'public/brand/renuevo-mark.svg'));
const background = { r: 6, g: 13, b: 24, alpha: 1 };
const iconSizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];
const splashes = [[1170, 2532], [1179, 2556], [1290, 2796], [1668, 2388], [2048, 2732], [750, 1334]];

async function renderIcon(size) {
  const markSize = Math.round(size * (size <= 32 ? 0.84 : 0.68));
  const renderedMark = await sharp(mark).resize(markSize, markSize, { fit: 'contain' }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: renderedMark, gravity: 'center' }])
    .png()
    .toFile(path.join(root, `public/icons/icon-${size}.png`));
}

for (const size of iconSizes) await renderIcon(size);
await copyFile(path.join(root, 'public/icons/icon-16.png'), path.join(root, 'public/favicon-16.png'));
await copyFile(path.join(root, 'public/icons/icon-32.png'), path.join(root, 'public/favicon-32.png'));
await copyFile(path.join(root, 'public/icons/icon-180.png'), path.join(root, 'public/icons/apple-touch-icon.png'));

const whiteBadge = await sharp(mark).resize(54, 54, { fit: 'contain' }).tint('#ffffff').png().toBuffer();
await sharp({ create: { width: 72, height: 72, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: whiteBadge, gravity: 'center' }])
  .png()
  .toFile(path.join(root, 'public/icons/badge-72.png'));

for (const [width, height] of splashes) {
  const markSize = Math.round(Math.min(width, height) * 0.2);
  const renderedMark = await sharp(mark).resize(markSize, markSize, { fit: 'contain' }).png().toBuffer();
  const label = Buffer.from(`<svg width="${width}" height="180"><text x="50%" y="70" text-anchor="middle" fill="#F4F7FA" font-family="Arial, sans-serif" font-size="64" font-weight="700">Renuevo</text><text x="50%" y="132" text-anchor="middle" fill="#AAB8C7" font-family="Arial, sans-serif" font-size="48" font-weight="500">Music</text></svg>`);
  const markTop = Math.round(height * 0.42 - markSize);
  await sharp({ create: { width, height, channels: 4, background } })
    .composite([
      { input: renderedMark, left: Math.round((width - markSize) / 2), top: markTop },
      { input: label, left: 0, top: markTop + markSize + 24 },
    ])
    .png()
    .toFile(path.join(root, `public/splash-${width}x${height}.png`));
}
```

- [ ] **Step 4: Expose and run the generator**

Add to `package.json` scripts:

```json
"brand:assets": "node scripts/generate-brand-assets.mjs"
```

Run: `npm run brand:assets`

Expected: exit 0 and all PNG timestamps updated.

- [ ] **Step 5: Remove the conflicting legacy favicon**

Delete `src/app/favicon.ico`; metadata in `src/app/layout.tsx` already references `/favicon-16.png` and `/favicon-32.png`.

- [ ] **Step 6: Run raster validation**

Run: `node --test --test-isolation=none tests/brand-identity.test.mjs`

Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```powershell
git add package.json scripts/generate-brand-assets.mjs public src/app/favicon.ico tests/brand-identity.test.mjs
git commit -m "feat: regenerate PWA and splash brand assets"
```

---

### Task 4: Sincronizar manifest y ejecutar verificación final

**Files:**
- Modify: `public/manifest.json`
- Modify: `tests/brand-identity.test.mjs`

**Interfaces:**
- Consumes: raster assets from Task 3.
- Produces: PWA installable con colores Nocturno Azul y rutas existentes.

- [ ] **Step 1: Add the failing manifest test**

```js
test('manifest uses the Nocturno Azul install identity', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
  assert.equal(manifest.background_color, '#060D18');
  assert.equal(manifest.theme_color, '#060D18');
  assert.ok(manifest.icons.some(({ sizes }) => sizes === '192x192'));
  assert.ok(manifest.icons.some(({ sizes }) => sizes === '512x512'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-isolation=none tests/brand-identity.test.mjs`

Expected: FAIL because manifest still uses `#17181f` and `#0b8770`.

- [ ] **Step 3: Update manifest colors**

Set in `public/manifest.json`:

```json
"background_color": "#060D18",
"theme_color": "#060D18"
```

- [ ] **Step 4: Run all verification commands**

Run: `npm test`

Expected: all tests pass.

Run: `npm run lint`

Expected: exit 0.

Run: `npx tsc --noEmit`

Expected: exit 0.

Run: `npm run build`

Expected: exit 0 when `.env.local` contains the required Supabase values.

- [ ] **Step 5: Visually inspect generated assets**

Open `public/brand/renuevo-mark.svg`, `public/icons/icon-512.png` and one phone splash. Confirm transparent SVG edges, centered safe-area icon, `1:1` proportions and no stretching.

- [ ] **Step 6: Commit**

```powershell
git add public/manifest.json tests/brand-identity.test.mjs
git commit -m "feat: align PWA manifest with Nocturno Azul"
```
