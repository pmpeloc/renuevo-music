# Actualización de identidad visual de la PWA

## Objetivo

Hacer que los cambios de ícono y pantalla de inicio lleguen a las instalaciones existentes siempre que la plataforma lo permita, y guiar a los usuarios cuando el sistema operativo exige reinstalar.

## Causa

Los recursos visuales se sobrescriben bajo URLs estables (`/icons/icon-192.png`, `/icons/apple-touch-icon.png` y `/splash-*.png`). El navegador y el sistema operativo conservan la metadata de instalación fuera del caché controlado por `sw.js`, por lo que actualizar el service worker o recargar la aplicación no reemplaza necesariamente el ícono del launcher ni el splash.

## Comportamiento por plataforma

- Android con Chrome/WebAPK puede actualizar la metadata instalada cuando detecta que cambió el manifest. El proceso lo administra Chrome y no es inmediato.
- iOS/iPadOS no ofrece una API web para reemplazar el ícono o startup image de una PWA ya agregada a inicio. La instalación existente debe eliminarse y agregarse nuevamente.
- Las instalaciones nuevas deben recibir siempre los recursos visuales actuales.

## Diseño

### Versionado visual

Se agregará una versión explícita a todas las referencias de identidad instalable mediante query string, por ejemplo:

```text
/icons/icon-192.png?v=20260721
/icons/apple-touch-icon.png?v=20260721
/splash-1170x2532.png?v=20260721
```

La versión será la misma en el manifest y en la metadata de Next.js. Cada cambio futuro de ícono o splash deberá incrementar ese valor junto con la regeneración de assets. No se cambiará la URL del manifest ni la identidad de la aplicación.

El manifest incorporará un `id` estable para que los navegadores reconozcan las versiones como la misma PWA aunque cambien otros datos de instalación.

### Aviso para iOS/iPadOS

La aplicación detectará simultáneamente:

1. iOS o iPadOS.
2. Ejecución en modo standalone.
3. Una versión visual pendiente distinta de la aceptada en ese dispositivo.

En ese caso mostrará un aviso descartable explicando que Apple exige eliminar el acceso de la pantalla de inicio y volver a agregarlo para aplicar el nuevo ícono y splash. Al descartarlo se guardará la versión actual en `localStorage`, evitando mostrarlo nuevamente hasta el próximo cambio visual.

El aviso no aparecerá en Android, en navegación normal de Safari ni repetidamente para la misma versión.

### Service worker y caché HTTP

No se modificará la estrategia del service worker: ya usa red primero y no controla la metadata instalada por el sistema operativo. Las URLs versionadas bastan para separar cada revisión visual. El manifest se servirá con revalidación para que Chrome pueda detectar sus cambios.

## Flujo de una actualización futura

1. Se reemplaza la fuente visual y se ejecuta el generador existente.
2. Se incrementa una única versión visual usada por manifest, metadata y aviso.
3. Se despliega normalmente.
4. Android procesa la actualización del manifest según su ciclo de WebAPK.
5. iOS muestra una sola vez las instrucciones de reinstalación.

## Validación

Se ampliará la prueba de identidad existente para verificar que:

- el manifest tenga un `id` estable;
- todos los íconos del manifest lleven la versión vigente;
- `apple-touch-icon` y todos los startup images lleven esa misma versión;
- el aviso de iOS use esa versión como clave y solo se active en standalone;
- los assets físicos sigan existiendo y conserven sus dimensiones actuales.

También se ejecutarán lint, pruebas y build. La actualización real del launcher se comprobará manualmente en Android; en iOS se comprobará el aviso y la actualización posterior a la reinstalación.

## Fuera de alcance

- Forzar desde JavaScript una actualización que iOS no permite.
- Convertir la PWA en una aplicación nativa.
- Cambiar el ciclo general de actualizaciones o el caché de contenido de la aplicación.
