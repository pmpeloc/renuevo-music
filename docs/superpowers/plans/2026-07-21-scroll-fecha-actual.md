# Current Date Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centrar el día actual en la tira de fechas usando las dimensiones reales renderizadas.

**Architecture:** `HomePage` conservará una referencia al contenedor y otra al botón de hoy. El efecto inicial calculará `scrollLeft` con `offsetLeft`, `offsetWidth` y `clientWidth`, sin constantes duplicadas del CSS.

**Tech Stack:** React 19, TypeScript, Next.js 16, `node:test`.

## Global Constraints

- No agregar dependencias.
- No modificar estilos ni apariencia.
- No reposicionar después de interacción manual.
- Usar dimensiones reales del DOM, no un ancho fijo.

---

### Task 1: Centrar el botón de hoy

**Files:**
- Create: `tests/home-date-strip.test.mjs`
- Modify: `src/app/home/page.tsx:52-140,226-240`

**Interfaces:**
- Consumes: `stripRef`, `today`, `dates`, `isSameDay()` y el efecto condicionado por `profileLoading`.
- Produces: `todayRef: RefObject<HTMLButtonElement | null>` y posicionamiento inicial basado en el botón renderizado.

- [ ] **Step 1: Escribir la regresión que falle**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const home = readFileSync('src/app/home/page.tsx', 'utf8');

test('centers today using the rendered date button dimensions', () => {
  assert.match(home, /const todayRef = useRef<HTMLButtonElement>\(null\)/);
  assert.match(home, /todayButton\.offsetLeft[\s\S]*todayButton\.offsetWidth/);
  assert.match(home, /ref=\{isSameDay\(date, today\) \? todayRef : undefined\}/);
  assert.doesNotMatch(home, /const itemWidth = 52;[\s\S]*todayIndex/);
});
```

- [ ] **Step 2: Ejecutar y confirmar RED**

Run: `node --test --test-isolation=none tests/home-date-strip.test.mjs`

Expected: FAIL porque `todayRef` y el cálculo con medidas reales todavía no existen.

- [ ] **Step 3: Implementar el cambio mínimo**

Agregar junto a `stripRef`:

```tsx
const todayRef = useRef<HTMLButtonElement>(null);
```

Reemplazar el cálculo fijo del efecto:

```tsx
useEffect(() => {
  const strip = stripRef.current;
  const todayButton = todayRef.current;
  if (profileLoading || !strip || !todayButton) return;

  const scrollTo =
    todayButton.offsetLeft - strip.clientWidth / 2 + todayButton.offsetWidth / 2;
  strip.scrollLeft = Math.max(0, scrollTo);
}, [profileLoading]);
```

Asignar la referencia solamente al botón actual:

```tsx
ref={isSameDay(date, today) ? todayRef : undefined}
```

- [ ] **Step 4: Ejecutar GREEN y verificaciones**

Run: `node --test --test-isolation=none tests/home-date-strip.test.mjs && npm test && npm run lint`

Expected: regresión PASS, suite completa PASS y lint exit 0.

- [ ] **Step 5: Verificar build**

Run: `npm run build`

Expected: exit 0 con variables locales/VAPID efímeras solo en proceso si el entorno las requiere.

- [ ] **Step 6: Commit**

```bash
git add tests/home-date-strip.test.mjs src/app/home/page.tsx
git commit -m "fix: center current date in home strip"
```
