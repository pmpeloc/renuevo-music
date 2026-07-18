# Operación y despliegue

## Variables de entorno

Configurar estas variables en `.env.local` y en Vercel:

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Acceso anónimo desde el cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones privilegiadas de rutas servidor |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Suscripción Web Push del navegador |
| `VAPID_PRIVATE_KEY` | Firma de notificaciones en el servidor |
| `VAPID_SUBJECT` | Contacto VAPID, por ejemplo `mailto:equipo@example.com` |
| `YOUTUBE_API_KEY` | Búsqueda de referencias en YouTube |

No versionar valores reales.

## Base de datos

Para una base nueva, ejecutar `supabase/schema.sql` una vez. Después, aplicar los archivos de `supabase/migrations/*.sql` en orden lexicográfico/cronológico mediante el canal de migraciones establecido para el proyecto. Registrar cada aplicación y no volver a usar `schema.sql` como migración sobre una base existente.

La migración `20260717000000_song_delete_cascade.sql` alinea las claves foráneas de canciones con `ON DELETE CASCADE`. Verificar primero en un entorno no productivo. Antes de aplicarla en producción, obtener autorización explícita y confirmar que existe un respaldo recuperable.

## Verificación local

```powershell
npm install
npm run lint
npm run build
```

El build necesita las variables públicas válidas para inicializar el cliente Supabase y valores VAPID con formato válido.

## Despliegue

`vercel.json` declara Next.js, `npm install`, `next build`, salida `.next` y encabezados sin caché para `/sw.js`. El flujo normal despliega la revisión integrada a `main` mediante la integración Git de Vercel. Aplicar primero las migraciones compatibles y recién después desplegar la aplicación que depende de ellas.

## Comprobaciones posteriores

- Abrir `https://renuevo-music.vercel.app` sin sesión previa.
- Confirmar que el selector de perfiles carga.
- Confirmar navegación a Inicio y Canciones.
- Ejecutar `$renuevo-production-qa`.
- Confirmar que el reporte no termina en `FAIL-CLEANUP`.
