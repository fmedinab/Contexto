-- ============================================
-- Migración 022: Alinear RLS de datos clínicos con la matriz de roles.
-- Schema: public
--
-- PROBLEMA CORREGIDO
--
--   Las policies de clinical_notes y therapeutic_tasks otorgan SELECT,
--   INSERT y UPDATE al rol 'assistant' (recepcionista). Pero la matriz
--   de permisos del front (js/core/permissions.js, corregida en la 021)
--   NO le da tasks:* ni notes:*, y el dashboard ya lo restringía por rol
--   en _canOpenModal().
--
--   El resultado era una brecha: el asistente tenía datos clínicos en la
--   base de datos aunque la UI no se los mostrara. Con el token del
--   navegador (que es público por diseño — está en config/env.js y en
--   cada respuesta de la red), un atacante con una cuenta de recepción
--   podía leer todas las notas clínicas vía
--   GET /rest/v1/clinical_notes?select=*
--
--   Las notas clínicas de un consultorio son datos sensibles bajo la Ley
--   29733 (Perú). El principio de mínimo privilegio dice que el
--   recepcionista no debería verlas.
--
-- CAMBIOS
--   1. Recrea las policies de clinical_notes y therapeutic_tasks para
--      que solo admin y psychologist tengan acceso al contenido.
--   2. El paciente conserva la lectura de SUS propias notas y tareas
--      (no cambia nada para el portal).
--   3. NO toca DELETE, que ya era admin-only desde el schema original.
--
-- Si el negocio decide que recepción SÍ debe leer notas, revertir esto
-- agregando 'assistant' a las dos condiciones — pero que sea una
-- decisión consciente, no un efecto colateral del seed original.
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================

-- ---------------------------------------------------------------------------
-- 1. clinical_notes
-- ---------------------------------------------------------------------------

-- Lectura por parte del equipo clínico
DROP POLICY IF EXISTS "Clinicians can view all clinical notes" ON public.clinical_notes;
CREATE POLICY "Clinicians can view all clinical notes"
    ON public.clinical_notes FOR SELECT
    TO authenticated
    USING (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
    );

-- Crear
DROP POLICY IF EXISTS "Clinicians can create clinical notes" ON public.clinical_notes;
CREATE POLICY "Clinicians can create clinical notes"
    ON public.clinical_notes FOR INSERT
    TO authenticated
    WITH CHECK (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
    );

-- Actualizar
DROP POLICY IF EXISTS "Clinicians can update clinical notes" ON public.clinical_notes;
CREATE POLICY "Clinicians can update clinical notes"
    ON public.clinical_notes FOR UPDATE
    TO authenticated
    USING (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
    )
    WITH CHECK (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
    );

-- ---------------------------------------------------------------------------
-- 2. therapeutic_tasks
-- ---------------------------------------------------------------------------
-- Mismo criterio: el asistente gestiona agenda y pacientes, no el plan
-- terapéutico.
--
-- ATENCIÓN AL NOMBRE: en 006_tasks.sql las policies se llaman
-- "...all tasks" / "...own tasks" (sin "therapeutic"). El nombre debe
-- coincidir EXACTAMENTE o el DROP ... IF EXISTS no hace nada y la brecha
-- permanece silenciosamente. Si en esta base difieren, el CHECK 8 de
-- database/verify.sql lo detecta.

-- Lectura
DROP POLICY IF EXISTS "Clinicians can view all tasks" ON public.therapeutic_tasks;
CREATE POLICY "Clinicians can view all tasks"
    ON public.therapeutic_tasks FOR SELECT
    TO authenticated
    USING (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
    );

-- Crear
DROP POLICY IF EXISTS "Clinicians can create tasks" ON public.therapeutic_tasks;
CREATE POLICY "Clinicians can create tasks"
    ON public.therapeutic_tasks FOR INSERT
    TO authenticated
    WITH CHECK (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
    );

-- Actualizar
DROP POLICY IF EXISTS "Clinicians can update tasks" ON public.therapeutic_tasks;
CREATE POLICY "Clinicians can update tasks"
    ON public.therapeutic_tasks FOR UPDATE
    TO authenticated
    USING (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
    )
    WITH CHECK (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
    );

-- ---------------------------------------------------------------------------
-- Verificación (correr a mano)
-- ---------------------------------------------------------------------------

-- Ninguna policy de clinical_notes ni therapeutic_tasks debe mencionar
-- 'assistant' anymore.
-- SELECT tablename, policyname, cmd
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename IN ('clinical_notes', 'therapeutic_tasks')
--     AND qual LIKE '%assistant%';
--   -- debe devolver 0 filas
--
-- Comprobación funcional (con una sesión de assistant):
--   SELECT count(*) FROM clinical_notes;            -- debe dar 0
--   SELECT count(*) FROM therapeutic_tasks;         -- debe dar 0
-- Con una sesión de psychologist debe devolver las filas reales.