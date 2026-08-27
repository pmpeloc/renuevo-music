-- Categoría de canción: 'alabanza' (canción rápida) o 'adoracion' (canción lenta).
-- Nullable a propósito: las canciones ya cargadas quedan sin categoría y la app
-- exige definirla al editarlas. Ejecutar en el SQL Editor de Supabase.
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS category text DEFAULT null
  CHECK (category IN ('adoracion', 'alabanza') OR category IS NULL);
