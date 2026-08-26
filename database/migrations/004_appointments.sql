-- ============================================
-- Migración 004: Tabla de citas
-- Schema: public | Tabla: appointments
-- ============================================
-- Campos:
--   id              — UUID PK
--   patient_id      — FK → patients.id
--   owner_id        — FK → auth.users.id
--   title           — Título de la cita
--   appointment_date — Fecha y hora de la cita
--   duration_minutes — Duración en minutos (default 50)
--   type            — Tipo de sesión
--   status          — Estado de la cita
--   notes           — Notas adicionales
--   location        — Ubicación/lugar
--   created_at      — Timestamp de creación
--   updated_at      — Timestamp de actualización
-- ============================================

-- 1. Tabla appointments (idempotente)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    appointment_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 50 NOT NULL CHECK (duration_minutes > 0),
    type TEXT NOT NULL DEFAULT 'Terapia Individual'
        CHECK (type IN ('Terapia Individual', 'Terapia de Pareja', 'Terapia Familiar', 'Evaluación', 'Otra')),
    status TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (status IN ('PENDIENTE', 'CONFIRMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA')),
    notes TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_owner_id ON public.appointments(owner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 3. Trigger: updated_at automático
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Restricción: evitar doble agendamiento del mismo paciente en el mismo rango de tiempo
-- (Un paciente no puede tener 2 citas que se superpongan)
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
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'No se pudo crear la restricción de superposición (se requiere extensión btree_gist): %', SQLERRM;
END $$;

-- 5. Habilitar RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS

-- Clinicians (admin, psychologist, assistant) ven todas las citas
CREATE POLICY "Clinicians can view all appointments"
    ON public.appointments FOR SELECT
    USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'psychologist')
        OR public.has_role(auth.uid(), 'assistant')
    );

-- Clinicians pueden crear citas
CREATE POLICY "Clinicians can create appointments"
    ON public.appointments FOR INSERT
    WITH CHECK (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'psychologist')
        OR public.has_role(auth.uid(), 'assistant')
    );

-- Clinicians pueden actualizar citas
CREATE POLICY "Clinicians can update appointments"
    ON public.appointments FOR UPDATE
    USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'psychologist')
        OR public.has_role(auth.uid(), 'assistant')
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'psychologist')
        OR public.has_role(auth.uid(), 'assistant')
    );

-- Solo admin puede eliminar citas
CREATE POLICY "Admins can delete appointments"
    ON public.appointments FOR DELETE
    USING (public.is_user_admin(auth.uid()));

-- 7. Comentarios
COMMENT ON TABLE public.appointments IS 'Citas programadas del consultorio psicológico.';
COMMENT ON COLUMN public.appointments.patient_id IS 'Paciente al que pertenece la cita.';
COMMENT ON COLUMN public.appointments.owner_id IS 'Psicólogo/profesional que agendó la cita.';
COMMENT ON COLUMN public.appointments.status IS 'Estado: PENDIENTE, CONFIRMADA, EN_CURSO, COMPLETADA, CANCELADA.';
COMMENT ON COLUMN public.appointments.duration_minutes IS 'Duración estimada en minutos (default 50).';
