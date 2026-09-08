-- ============================================
-- Migración 008: Fixes de seguridad post-auditoría
-- Schema: public
--
-- Aplica los cambios de las migraciones 005/006/007 y schema.sql
-- DENTRO de una base ya existente (donde las tablas y políticas
-- ya se crearon con las versiones defectuosas).
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================

-- 1. Habilita la extensión gist+btree requerida por el constraint
--    de superposición de citas (migración 004 fallaba en silencio sin ella).
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1b. Asegurar funciones SECURITY DEFINER usadas por las políticas
--     (idempotente: si ya existen de rls.sql/002, se reemplazan sin error).
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 2. Agrega el constraint EXCLUDE de no-superposición si aún no existe
--    (solo si fue omitido por falta de btree_gist en la migración 004).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_appointments_per_patient'
    ) THEN
        ALTER TABLE public.appointments
            ADD CONSTRAINT no_overlapping_appointments_per_patient
            EXCLUDE USING gist (
                patient_id WITH =,
                tstzrange(
                    appointment_date,
                    appointment_date + (duration_minutes || ' minutes')::interval,
                    '[]'
                ) WITH &&
            ) WHERE (status NOT IN ('CANCELADA'));
    ELSE
        RAISE NOTICE 'El constraint no_overlapping_appointments_per_patient ya existe.';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'No se pudo crear la restricción de superposición: %', SQLERRM;
END $$;

-- ============================================
-- 3. FIX SECURITY: assessments — pacientes solo ven sus propias evaluaciones.
--    La política anterior era una tautología:
--      patient_id IN (SELECT id FROM patients WHERE id = patient_id)
--    → TODO paciente podía ver TODAS las evaluaciones (fuga de datos).
--    Reemplazo por join contra patients.owner_id.
-- ============================================

DROP POLICY IF EXISTS "Patients can view own assessments" ON public.assessments;

CREATE POLICY "Patients can view own assessments"
    ON public.assessments FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'patient')
        AND EXISTS (
            SELECT 1 FROM public.patients p
            WHERE p.id = public.assessments.patient_id
            AND p.owner_id = auth.uid()
        )
    );

-- ============================================
-- 4. FIX SECURITY: therapeutic_tasks — pacientes ven solo las tareas
--    de sus propios expedientes. La política anterior usaba
--    owner_id = auth.uid() (el owner es el clínico, nunca el paciente)
--    → los pacientes no podían ver sus propias tareas.
-- ============================================

DROP POLICY IF EXISTS "Patients can view own tasks" ON public.therapeutic_tasks;

CREATE POLICY "Patients can view own tasks"
    ON public.therapeutic_tasks FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'patient')
        AND EXISTS (
            SELECT 1 FROM public.patients p
            WHERE p.id = public.therapeutic_tasks.patient_id
            AND p.owner_id = auth.uid()
        )
    );

-- ============================================
-- 5. FIX SECURITY: clinical_notes — misma corrección que tareas.
-- ============================================

DROP POLICY IF EXISTS "Patients can view own clinical notes" ON public.clinical_notes;

CREATE POLICY "Patients can view own clinical notes"
    ON public.clinical_notes FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'patient')
        AND EXISTS (
            SELECT 1 FROM public.patients p
            WHERE p.id = public.clinical_notes.patient_id
            AND p.owner_id = auth.uid()
        )
    );

-- ============================================
-- Verificación (opcional): listar políticas corregidas
-- ============================================
-- SELECT p.tablename, p.policyname, p.cmd
-- FROM pg_policies p
-- WHERE p.policyname IN (
--     'Patients can view own assessments',
--     'Patients can view own tasks',
--     'Patients can view own clinical notes'
-- )
-- ORDER BY p.tablename;