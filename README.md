# Renuevo — Equipo de Alabanza

PWA para coordinar perfiles, servicios, roles y canciones del equipo de alabanza de Iglesia El Renuevo. Producción: https://renuevo-music.vercel.app.

## Funcionalidades

- Selección y edición de perfiles.
- Agenda semanal de servicios y asignación de directores/coro.
- Listas de canciones con tono, comienzo, notas y referencia de YouTube.
- Catálogo reutilizable, historial de tonos y métricas.
- Actualizaciones en tiempo real, instalación PWA y notificaciones push.

## Stack

Next.js 16, React 19, TypeScript, Supabase PostgreSQL/Realtime, Tailwind CSS, Web Push y Vercel.

Repositorio: `git@github.com:pmpeloc/renuevo-music.git`.

## Inicio rápido

```powershell
npm install
```

Crear `.env.local` con las variables consumidas por la aplicación:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
YOUTUBE_API_KEY=
```

```powershell
npm run dev
npm run lint
npm run build
```

## Documentación

- [Arquitectura y datos](docs/architecture.md)
- [Operación y despliegue](docs/operations.md)
- [QA manual contra producción](docs/qa.md)
