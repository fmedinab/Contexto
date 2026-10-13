-- ============================================
-- Migración 021: Permisos de tareas y notas clínicas + limpieza de
--                política RLS huérfana.
-- Schema: public
--
-- PROBLEMAS CORREGIDOS
--
--   1. NO EXISTÍAN permisos para tareas terapéuticas ni notas clínicas.
--      canAccessPage() no tenía entradas para /tasks ni /notes, así que
--      caían en `required = []` y `hasAnyPermission([])` devolvía false:
--      esas dos rutasstandalone redirigían a /dashboard a TODO el mundo,
--      incluidos admin y psicólogo.
--
--      Peor: los datos clínicos de notas y tareas solo se protegían con
--      un chequeo de rol dentro de los modales del dashboard
--      (dashboard.js _canOpenModal). Las policies RLS de la BD no tenían
--      permiso granular para esas tablas.
--
--   2. Política RLS huérfana "Authenticated users can view site_settings"
--      (rls.sql:130), que usa auth.role() — una función que no existe en
--      Postgres. Nunca se dropeó al reescribir las policies en la 014.
--
-- CAMBIOS
--   1. Inserta los 10 permisos faltantes (tasks:*, notes:*) de forma
--      idempotente.
--   2. Asigna tasks:*/notes:* a admin (automático vía Object.values) y
--      psychologist. NO se asignan al assistant: es rol administrativo.
--   3. Asigna tasks:view_own y notes:view_own a patient.
--   4. Dropea la política huérfana de site_settings.
--
-- COHERENCIA CON EL CÓDIGO: los nombres deben coincidir exactamente con
-- js/core/permissions.js. Si se cambia uno, cambian ambos.
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================

-- ---------------------------------------------------------------------------
-- 1. Permisos que faltan
-- ---------------------------------------------------------------------------
INSERT INTO public.permissions (code, name, module, description) VALUES
    -- Tareas terapéuticas
    ('tasks:view', 'Ver tareas terapéuticas', 'tasks', 'Ver tareas asignadas a pacientes'),
    ('tasks:create', 'Crear tareas terapéuticas', 'tasks', 'Asignar nuevas tareas de seguimiento'),
    ('tasks:edit', 'Editar tareas terapéuticas', 'tasks', 'Modificar tareas existentes'),
    ('tasks:delete', 'Eliminar tareas terapéuticas', 'tasks', 'Eliminar tareas terapéuticas'),
    ('tasks:view_own', 'Ver mis tareas', 'tasks', 'Los pacientes ven solo sus propias tareas'),
    -- Notas clínicas
    ('notes:view', 'Ver notas clínicas', 'notes', 'Ver el historial de notas de sesión'),
    ('notes:create', 'Crear notas clínicas', 'notes', 'Registrar el resumen de una sesión'),
    ('notes:edit', 'Editar notas clínicas', 'notes', 'Modificar notas existentes'),
    ('notes:delete', 'Eliminar notas clínicas', 'notes', 'Eliminar notas clínicas'),
    ('notes:view_own', 'Ver mis notas', 'notes', 'Los pacientes ven solo sus propias notas')
ON CONFLICT (code) DO UPDATE
SET name       = EXCLUDED.name,
    module     = EXCLUDED.module,
    description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- 2. Psychologist: acceso completo a tareas y notas
--    (admin ya tiene todo por Object.values en el código; y por si el
--     admin se seedeó antes de existir estos permisos)
-- ---------------------------------------------------------------------------
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name IN ('admin', 'psychologist')
  AND p.code IN (
      'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:delete',
      'notes:view', 'notes:create', 'notes:edit', 'notes:delete'
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Patient: solo lectura de lo suyo
-- ---------------------------------------------------------------------------
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'patient'
  AND p.code IN ('tasks:view_own', 'notes:view_own')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Assistant NO debe tenerlos.
--    Si una versión anterior del seed se los dio, se retiran aquí.
--    El asistente es administrativo: agenda, pacientes, solicitudes.
-- ---------------------------------------------------------------------------
DELETE FROM public.role_permissions rp
USING public.roles r, public.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'assistant'
  AND p.code IN (
      'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:delete',
      'notes:view', 'notes:create', 'notes:edit', 'notes:delete'
  );

-- ---------------------------------------------------------------------------
-- 5. Limpieza: dropear la política huérfana de site_settings.
--    Usa auth.role(), que no existe en Postgres. Redundante con la 014.
--    Si en algún momento alguien la "arregla", abriría lectura de
--    site_settings a cualquier usuario autenticado, incluyendo pacientes.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view site_settings" ON public.site_settings;

-- ---------------------------------------------------------------------------
-- Verificación (correr a mano si se quiere comprobar)
-- ---------------------------------------------------------------------------
-- SELECT code FROM public.permissions WHERE code LIKE 'tasks:%' OR code LIKE 'notes:%'
--   ORDER BY code;
--   -- deben salir 10
--
-- SELECT r.name AS rol, string_agg(p.code, ', ' ORDER BY p.code) AS permisos
-- FROM public.role_permissions rp
-- JOIN public.roles r ON r.id = rp.role_id
-- JOIN public.permissions p ON p.id = rp.permission_id
-- WHERE p.code LIKE 'tasks:%' OR p.code LIKE 'notes:%'
-- GROUP BY r.name ORDER BY r.name;
--   -- admin: 8 · psychologist: 8 · patient: 2 · assistant: 0
--
-- SELECT policyname FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'site_settings';
--   -- NO debe aparecer "Authenticated users can view site_settings"