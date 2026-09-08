-- ============================================
-- Migración 014: site_settings públicos (landing)
--
-- La landing (acceso anon) muestra datos del consultorio: horarios de
-- trabajo, contacto, WhatsApp y horas de confirmación. La tabla
-- site_settings originalmente solo era visible para usuarios
-- autenticados. Se agrega la columna is_public y políticas RLS:
--
--   SELECT anon            -> solo filas is_public = TRUE
--   SELECT authenticated   -> todas las filas
--   INSERT/UPDATE/DELETE   -> solo admin (política existente)
--
-- Se marcan como públicas únicamente las claves que la landing necesita
-- renderizar (sin secretos: moneda, zona horaria, etc. siguen restringidas).
--
-- Idempotente.
-- ============================================

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.site_settings.is_public IS
    'TRUE: fila visible públicamente (anon) para la landing. Nunca exponer secretos.';

CREATE INDEX IF NOT EXISTS idx_site_settings_is_public
    ON public.site_settings (is_public);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- Lectura pública (anon) solo de filas marcadas como públicas.
DROP POLICY IF EXISTS "site_settings_public_select" ON public.site_settings;
CREATE POLICY "site_settings_public_select"
    ON public.site_settings FOR SELECT
    TO anon
    USING (is_public = TRUE);

-- Los autenticados conservan lectura de todas las filas.
DROP POLICY IF EXISTS "site_settings_authenticated_select" ON public.site_settings;
CREATE POLICY "site_settings_authenticated_select"
    ON public.site_settings FOR SELECT
    TO authenticated
    USING (true);

-- ---------------------------------------------------------------------------
-- Marcar claves públicas necesarias para la landing
-- ---------------------------------------------------------------------------
UPDATE public.site_settings SET is_public = TRUE
WHERE key IN (
    'site_name',
    'site_tagline',
    'work_schedule',
    'contact_email',
    'contact_phone',
    'whatsapp_number',
    'booking_confirm_hours'
);

-- ---------------------------------------------------------------------------
-- Verificación (opcional)
-- ---------------------------------------------------------------------------
-- SELECT key, is_public FROM public.site_settings ORDER BY key;
-- SELECT p.policyname, p.cmd, p.roles FROM pg_policies p WHERE p.tablename = 'site_settings' ORDER BY p.cmd;