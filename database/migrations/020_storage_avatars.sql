-- ============================================
-- Migración 020: Bucket de Storage "avatars" + policies de acceso.
-- Schema: storage
--
-- PROBLEMA CORREGIDO (B0.3 del informe docs/produccion.md)
--   profilesService.uploadAvatar() sube a `storage.from('avatars')`,
--   pero NINGUNA migración creaba el bucket ni sus policies. El bucket
--   existía solo porque alguien lo creó a mano en el dashboard. En un
--   entorno nuevo (cliente nuevo, staging, restore de backup) la subida
--   de avatar falla con un error que el usuario solo ve como
--   "no puedo subir mi foto".
--
--   Además el bucket se crea PRIVADO por defecto y getPublicUrl() no
--   devuelve nada visible sin policy de SELECT.
--
-- CAMBIOS
--   1. Crea el bucket "avatars" (publico para lectura, 5 MB, MIME
--      limitado a imagenes). Idempotente.
--   2. SELECT publico: los avatares se muestran en el dashboard y en
--      el portal del paciente -> deben ser legibles sin sesion.
--   3. INSERT/UPDATE solo al dueno del archivo (nombre del objeto
--      = "avatars/<auth.uid()>.<ext>"). Nadie puede escribir sobre el
--      avatar de otro usuario.
--   4. DELETE solo al dueno.
--
--   NOTA sobre el path: profilesService.js:108 sube a
--   `avatars/${user.id}.${ext}`, es decir el objeto DENTRO del bucket
--   se llama "avatars/<uuid>.<ext>". Las policies de abajo asumen
--   exactamente ese formato. Si se cambia el path en el JS hay que
--   cambiarlo tambien aqui.
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================

-- ---------------------------------------------------------------------------
-- 1. Bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880,  -- 5 MB
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public             = EXCLUDED.public,
    file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. SELECT: avatares son publicos (se muestran sin sesion)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

-- ---------------------------------------------------------------------------
-- 3. INSERT: solo al dueno. auth.uid() no es null descarta anon.
--    El objeto dentro del bucket se llama "avatars/<uuid>.<ext>", o sea
--    foldername(name) = ARRAY['avatars', '<uuid>.<ext>'] y el indice [2]
--    INCLUYE la extension. Hay que quitarle la extension antes de comparar
--    con auth.uid(), por eso split_part(..., '.', 1).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = split_part((storage.foldername(name))[2], '.', 1)
    );

-- ---------------------------------------------------------------------------
-- 4. UPDATE: mismo criterio que INSERT.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = split_part((storage.foldername(name))[2], '.', 1)
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = split_part((storage.foldername(name))[2], '.', 1)
    );

-- ---------------------------------------------------------------------------
-- 5. DELETE: solo el dueno.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = split_part((storage.foldername(name))[2], '.', 1)
    );

-- ---------------------------------------------------------------------------
-- 6. Verificacion (comentar y correr a mano si se quiere comprobar)
-- ---------------------------------------------------------------------------
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'avatars';
-- SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects'
--   ORDER BY policyname;