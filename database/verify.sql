-- ============================================
-- Verificación de estado de la base de datos.
-- Schema: public (solo lectura, no modifica nada)
--
-- USO: pegar en el Supabase SQL Editor y ejecutar.
--      Cada check devuelve OK / FALLA + qué hacer si falla.
--
-- Por qué existe: memory.md decía que las migraciones faltaban y
-- no había forma de comprobarlo sin adivinar. Con RLS, un seed sin
-- aplicar NO da error visible: las policies simplemente denying todo
-- y el usuario ve "no tengo permisos". Este script lo detecta.
-- ============================================

-- ---------------------------------------------------------------------------
-- CHECK 1: Las 4 filas de roles existen. Sin esto, TODAS las policies
-- que llaman has_role() devuelven false y el RBAC entero está roto.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_count integer;
    v_missing text;
BEGIN
    SELECT count(*) INTO v_count FROM public.roles;
    SELECT string_agg(r, ', ') INTO v_missing
    FROM unnest(ARRAY['admin','psychologist','assistant','patient']) r
    WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = r);

    IF v_count = 0 THEN
        RAISE WARNING 'FALLA 1: la tabla roles esta VACIA. Ejecutar database/seed.sql';
    ELSIF v_missing IS NOT NULL THEN
        RAISE WARNING 'FALLA 1: faltan los roles: %', v_missing;
    ELSE
        RAISE NOTICE 'OK 1: % roles presentes', v_count;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- CHECK 2: Las 15 tablas tienen RLS habilitado.
-- Una tabla sin RLS es data leak: cualquier anon puede leerla.
-- ---------------------------------------------------------------------------
SELECT
    c.relname AS tabla,
    c.relrowsecurity AS rls_activado,
    CASE WHEN c.relrowsecurity THEN 'OK' ELSE 'FALLA - sin RLS' END AS estado
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
      'profiles','roles','permissions','role_permissions','user_roles',
      'site_settings','audit_logs','patients','appointments','assessments',
      'therapeutic_tasks','clinical_notes','booking_requests','reminders',
      'cms_website'
  )
ORDER BY c.relrowsecurity, c.relname;

-- Si algún resultado dice "FALLA - sin RLS": ejecutar database/rls.sql

-- ---------------------------------------------------------------------------
-- CHECK 3: Funciones de seguridad. Si falta is_user_admin() o
-- has_role(), las policies que las usan fallan en runtime.
-- ---------------------------------------------------------------------------
SELECT
    p.proname AS funcion,
    p.prosecdef AS security_definer,
    CASE
        WHEN p.prosecdef THEN 'OK'
        ELSE 'REVISAR - no es SECURITY DEFINER'
    END AS estado,
    COALESCE(array_to_string(p.proconfig, ', '), 'SIN search_path fijo') AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'is_user_admin','has_role','ensure_patient_account',
      'get_available_slots','prepare_reminders','check_overdue_tasks'
  )
ORDER BY p.proname;

-- Si falta alguna: aplicar la migración correspondiente (016/018/019)

-- ---------------------------------------------------------------------------
-- CHECK 4: Bucket de avatars (migración 020).
-- ---------------------------------------------------------------------------
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    CASE WHEN public THEN 'OK' ELSE 'FALLA - privado, getPublicUrl no funcionara' END AS estado
FROM storage.buckets
WHERE id = 'avatars';

-- Si no devuelve filas: ejecutar database/migrations/020_storage_avatars.sql

-- ---------------------------------------------------------------------------
-- CHECK 5: Politicas de storage para avatars.
-- ---------------------------------------------------------------------------
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'avatars%'
ORDER BY policyname;

-- Deben salir 4: avatars_public_read, avatars_owner_insert,
--                  avatars_owner_update, avatars_owner_delete

-- ---------------------------------------------------------------------------
-- CHECK 6: Indice unico de citas (constraint EXCLUDE GiST).
-- Sin esto se pueden agendar dos citas simultaneas al mismo paciente.
-- ---------------------------------------------------------------------------
SELECT
    conname AS constraint,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.appointments'::regclass
  AND contype = 'x';

-- Debe devolver 1 fila con no_overlapping_appointments_per_patient

-- ---------------------------------------------------------------------------
-- CHECK 7: Conteo de datos reales. Si algo es 0 y debería tener
-- filas, es que el seed no se aplico.
-- ---------------------------------------------------------------------------
SELECT 'profiles' AS tabla, count(*) AS filas FROM public.profiles
UNION ALL SELECT 'patients', count(*) FROM public.patients
UNION ALL SELECT 'appointments', count(*) FROM public.appointments
UNION ALL SELECT 'clinical_notes', count(*) FROM public.clinical_notes
UNION ALL SELECT 'cms_website', count(*) FROM public.cms_website
UNION ALL SELECT 'site_settings', count(*) FROM public.site_settings
UNION ALL SELECT 'user_roles', count(*) FROM public.user_roles
ORDER BY tabla;

-- ---------------------------------------------------------------------------
-- CHECK 9: Brecha de datos clínicos (migración 022).
-- Ninguna policy de clinical_notes ni therapeutic_tasks debe granting
-- acceso al rol 'assistant' (recepcionista). Si aparece, la 022 no se
-- aplicó o los nombres de las policies no coinciden.
-- ---------------------------------------------------------------------------
SELECT tablename, policyname, cmd, qual AS condicion
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clinical_notes', 'therapeutic_tasks')
  AND (qual LIKE '%assistant%' OR with_check LIKE '%assistant%')
ORDER BY tablename, policyname;

-- Debe devolver 0 filas. Si devuelve algo, el recepcionista puede leer
-- datos clinicos aunque la UI no se los muestre.

-- ---------------------------------------------------------------------------
-- CHECK 10: Permisos de tareas y notas (migración 021).
-- Debe devolver 10 filas.
-- ---------------------------------------------------------------------------
SELECT code, name, module
FROM public.permissions
WHERE code LIKE 'tasks:%' OR code LIKE 'notes:%'
ORDER BY code;

-- Reparto esperado:
--   admin: 8 · psychologist: 8 · patient: 2 · assistant: 0
SELECT r.name AS rol, count(*) AS permisos_clinicos
FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.permissions p ON p.id = rp.permission_id
WHERE p.code LIKE 'tasks:%' OR p.code LIKE 'notes:%'
GROUP BY r.name
ORDER BY r.name;

-- ---------------------------------------------------------------------------
-- CHECK 8: Usuarios sin rol asignado.
-- Si alguno aparece, entra al sistema pero cae al portal de paciente
-- sin poder ver el dashboard. Es el sintoma del bug B1.1.
-- ---------------------------------------------------------------------------
SELECT p.id, p.email, p.full_name
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.user_id IS NULL;

-- Si devuelve filas: asignar rol con
--   INSERT INTO public.user_roles (user_id, role_id)
--   SELECT p.id, r.id FROM public.profiles p, public.roles r
--   WHERE p.email = '...' AND r.name = 'admin';