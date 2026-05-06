# Renuevo — Equipo de Alabanza

App web progresiva (PWA) para coordinar el equipo de alabanza de la iglesia. Reemplaza el caos del grupo de WhatsApp con una herramienta simple, rápida y en tiempo real.

## ¿Qué resuelve?

El equipo dirige alabanzas tres días a la semana (jueves, sábado y domingo), cada uno con diferentes servicios. Coordinar quién dirige, quiénes están en el coro y cuáles son las canciones de cada reunión se volvía un enredo en el historial del grupo. Esta app centraliza todo eso en un solo lugar.

## Funcionalidades

- **Selección de perfil sin contraseña** — cada miembro del equipo elige su perfil al abrir la app, al estilo Netflix
- **Vista semanal con scroll** — strip de fechas deslizable que muestra el mes actual y resalta los días con servicios
- **Servicios auto-generados** — los 5 servicios semanales (jueves, sábado x2, domingo x2) se crean automáticamente cada semana
- **Asignación de roles** — director de alabanzas, director de adoraciones y coro, todo desde la misma pantalla
- **Lista de canciones por director** — cuando hay dos directores, cada uno gestiona su propia lista dentro del mismo servicio
- **Catálogo reutilizable** — cada canción que se carga queda guardada y se puede buscar y reutilizar en futuros servicios
- **Tono y referencia** — selector de tono mayor/menor, campo "comienza en" y notas adicionales por canción
- **Historial de tonos** — la app recuerda en qué tono cantó cada persona una canción y lo presetea la próxima vez
- **Links de YouTube** — cada canción puede tener un link de referencia con vista previa automática
- **Tiempo real** — cualquier cambio en la lista se refleja al instante en todos los dispositivos (Supabase Realtime)
- **Push notifications** — el equipo recibe una notificación cuando alguien actualiza su lista de canciones

## Stack

- [Next.js 16](https://nextjs.org) con App Router y TypeScript
- [Supabase](https://supabase.com) — base de datos PostgreSQL, Realtime y almacenamiento
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel](https://vercel.com) — deploy y hosting
- PWA con Service Worker y Web Push API (VAPID)

## Instalación local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/renuevo-music.git
cd renuevo-music
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiá el archivo de ejemplo y completá con tus claves:

```bash
cp .env.example .env.local
```

Variables necesarias:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:tu@email.com
```

Para generar las VAPID keys:

```bash
npx web-push generate-vapid-keys
```

### 4. Crear la base de datos

En el **SQL Editor** de tu proyecto Supabase, ejecutá el contenido de `supabase/schema.sql`. Eso crea todas las tablas, los triggers, las políticas RLS y genera los servicios de las próximas 8 semanas automáticamente.

### 5. Iniciar el servidor

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Deploy en Vercel

1. Subí el proyecto a GitHub
2. Importalo en [Vercel](https://vercel.com/new)
3. Cargá las mismas variables de entorno del `.env.local` en la configuración del proyecto
4. Deploy automático en cada push a `main`
