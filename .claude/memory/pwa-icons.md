# PWA Icons — Reglas y aprendizajes

## Versionado de íconos (IMPORTANTE)

Cuando se cambian los íconos de una PWA instalada en Android, el sistema cachea
el ícono al momento de la instalación y **no lo actualiza automáticamente**.
El usuario tiene que desinstalar y reinstalar la PWA para ver el nuevo ícono.

**Solución: versionar los nombres de archivo en manifest.json**

En lugar de `/icons/icon-192.png`, usar `/icons/icon-192-v2.png` y actualizar
`manifest.json` para apuntar a los nuevos nombres. Esto fuerza un cache miss y
Chrome tiene más probabilidad de actualizar el ícono instalado sin reinstalar.

Ejemplo en `public/manifest.json`:
```json
"icons": [
  { "src": "/icons/icon-192-v2.png", "sizes": "192x192", "type": "image/png" },
  { "src": "/icons/icon-512-v2.png", "sizes": "512x512", "type": "image/png" }
]
```

Incrementar el sufijo -v2, -v3, etc. cada vez que cambien los íconos.

## Formatos requeridos

- Todos los íconos deben ser RGBA (con canal alpha/transparencia), no RGB.
- badge-72.png: blanco sobre transparente (monocromático para Android status bar).
- icon-192.png y icon-512.png: fondo sólido con esquinas redondeadas.
- Splash screens: archivos separados por resolución, fondo sólido.

## Archivos de splash screen (iOS)

Los splash screens en iOS se cachean muy agresivamente.
Para actualizarlos el usuario debe desinstalar y reinstalar la PWA desde Safari.
No hay forma de forzar la actualización programáticamente.

Archivos actuales:
- public/splash-1290x2796.png
- public/splash-1179x2556.png
- public/splash-1170x2532.png
- public/splash-750x1334.png
- public/splash-2048x2732.png
- public/splash-1668x2388.png

## Estilo visual actual (desde 2026-05-26)

- Fondo: negro oscuro #1A181C, esquinas redondeadas (~22% del tamaño)
- Logo: "RM" en crema #E6E0D5, fuente LiberationSans-Bold
- Subtítulo: "RENUEVO" bold crema + "— MUSIC —" en gris cálido #8C8478
- Badge: "RM" blanco sobre transparente
