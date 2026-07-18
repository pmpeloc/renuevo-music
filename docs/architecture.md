# Arquitectura

Renuevo Music es una aplicación Next.js con App Router. Las superficies interactivas usan React en el cliente y acceden a Supabase mediante `src/lib/supabase.ts`; las integraciones que necesitan secretos viven en rutas API.

## Superficies de usuario

- `/`: selector y alta de perfiles.
- `/home`: calendario semanal y servicios del día.
- `/service/[id]`: asignación de roles y lista de canciones del servicio.
- `/canciones`: catálogo, búsqueda, métricas de uso, edición y eliminación.
- `/metricas`: agregados de canciones, servicios y miembros.
- `/perfil`: datos del perfil activo, historial, foto, notificaciones y baja.
- `/offline`: fallback de la PWA cuando no hay conexión.

`AppShell` comparte la navegación Inicio, Canciones, Métricas y Perfil entre sidebar y barra móvil.

## Componentes y estado

El perfil seleccionado se guarda como un identificador en `localStorage` y `useActiveProfile` carga su fila desde Supabase. Esto conserva la selección entre visitas, pero no crea una sesión autenticada.

Las páginas mantienen estado local con React. `AddSongModal` busca o crea canciones y registra tono, comienzo y notas en un servicio. `LoadingContext` centraliza la indicación de carga. Las rutas `/api/avatar`, `/api/push`, `/api/services` y `/api/youtube-search` encapsulan almacenamiento, push, generación de servicios y búsqueda de YouTube.

## Modelo de datos

Tablas públicas definidas en `supabase/schema.sql`:

| Tabla | Responsabilidad | Borrado en cascada |
| --- | --- | --- |
| `profiles` | Integrantes y preferencias visibles | Elimina `service_members`, `song_key_history`, `service_songs` y `push_subscriptions` relacionados |
| `services` | Reuniones por fecha y tipo | Elimina `service_members` y `service_songs` relacionados |
| `service_members` | Perfil y rol dentro de un servicio | Depende de `services` y `profiles` |
| `songs` | Catálogo de canciones | Elimina `song_key_history` y `service_songs` relacionados |
| `song_key_history` | Último tono/comienzo por perfil y canción | Depende de `profiles` y `songs` |
| `service_songs` | Canción, director, orden y ejecución por servicio | Depende de `services`, `profiles` y `songs` |
| `push_subscriptions` | Suscripción Web Push de un perfil | Depende de `profiles` |

El trigger `trg_update_key_history` actualiza el historial al escribir `service_songs`. `generate_weekly_services` crea los servicios semanales previstos.

## Tiempo real, PWA y notificaciones

Supabase Realtime publica cambios de `services`, `service_members` y `service_songs`; la pantalla de servicio se suscribe a su canal. El manifest, los iconos, `ServiceWorkerRegister` y `/offline` sostienen la experiencia PWA. Web Push usa una suscripción del navegador y claves VAPID; el envío se realiza desde `/api/push`.

## Límite de seguridad

La selección de perfil no es autenticación ni autorización. El esquema habilita RLS, pero las políticas actuales `allow_all` permiten acceso anónimo de lectura y escritura a todas las tablas públicas. `NEXT_PUBLIC_SUPABASE_ANON_KEY` llega al navegador; `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` y `YOUTUBE_API_KEY` deben permanecer solo en el servidor. Antes de exponer información sensible o ampliar el público, hay que incorporar autenticación y políticas RLS restrictivas.
