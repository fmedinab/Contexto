-- ============================================
-- Migración 018: Limpieza de seguridad post-auditoría
-- Schema: public
--
-- 1. Elimina la política fantasma en site_settings
--    ("Authenticated users can view site_settings" con `auth.role()`),
--    creada en rls.sql y NUNCA dropeada. Es redundante con la política
--    "site_settings_authenticated_select" (migración 014) y potencial
--    fuga si se ajusta el acceso público.
--
-- 2. Agrega SET search_path a las funciones que lo omitían.
--    Riesgo: con SECURITY DEFINER + search_path del llamador, un usuario
--    malicioso puede secuestrar objetos (funciones/tablas) antepuestos
--    en su search_path y hacer que la función ejecute código con
--    privilegios elevados. Se fija un search_path seguro.
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================

-- ---------------------------------------------------------------------------
-- 1. DROP política fantasma de site_settings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view site_settings" ON public.site_settings;

-- ---------------------------------------------------------------------------
-- 2. search_path seguro en funciones
--    - Funciones que referencian tablas siempre calificadas → search_path ''
--      (solo pg_catalog implícito).
--    - check_overdue_tasks referencia therapeutic_tasks SIN calificar:
--      se califica la tabla a public.therapeutic_tasks y se fija search_path ''.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
        AND r.name = 'admin'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
        AND r.name = p_role_name
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_assessments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_overdue_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.therapeutic_tasks
    SET status = 'VENCIDA', updated_at = now()
    WHERE status = 'PENDIENTE'
    AND due_date < CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fecha_es(d date)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
RETURN (
    (array['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'])[extract(dow from d)::int + 1]
    || ' ' || to_char(d, 'DD/MM')
);

CREATE OR REPLACE FUNCTION public.urlencode(str text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
    res text := '';
    i int;
    c text;
BEGIN
    IF str IS NULL THEN RETURN ''; END IF;
    FOR i IN 1..length(str) LOOP
        c := substr(str, i, 1);
        IF c ~ '^[A-Za-z0-9._~-]$' THEN
            res := res || c;
        ELSE
            res := res || '%' || encode(convert_to(c, 'UTF8'), 'hex');
        END IF;
    END LOOP;
    RETURN res;
END $$;

-- ---------------------------------------------------------------------------
-- Verificación (opcional)
-- ---------------------------------------------------------------------------
-- SELECT p.policyname FROM pg_policies p WHERE p.tablename = 'site_settings' ORDER BY p.policyname;
-- SELECT proname, proconfig FROM pg_proc WHERE proname IN (
--     'is_user_admin', 'has_role', 'update_assessments_updated_at',
--     'check_overdue_tasks', 'fecha_es', 'urlencode'
-- );