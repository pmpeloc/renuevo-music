-- Agregar columna instrumento a perfiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instrument text DEFAULT null;

-- Bucket de Supabase Storage para fotos de perfil (ejecutar en SQL Editor de Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso público al bucket
CREATE POLICY IF NOT EXISTS "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "avatars_anon_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "avatars_anon_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "avatars_anon_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars');
