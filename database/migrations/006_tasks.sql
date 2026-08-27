-- ============================================================
-- MIGRATION 006: Tabla de tareas terapéuticas
-- Mente Serena — CONTEXTO
-- ============================================================

-- Tabla principal de tareas terapéuticas
CREATE TABLE IF NOT EXISTS therapeutic_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Seguimiento'
        CHECK (category IN ('Seguimiento', 'Ejercicio', 'Diario', 'Cuestionario', 'Técnica', 'Lectura', 'Otra')),
    status TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (status IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'VENCIDA', 'CANCELADA')),
    priority TEXT NOT NULL DEFAULT 'MEDIA'
        CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA', 'URGENTE')),
    progress INTEGER NOT NULL DEFAULT 0
        CHECK (progress >= 0 AND progress <= 100),
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comentarios de columnas
COMMENT ON COLUMN therapeutic_tasks.patient_id IS 'Paciente al que se le asigna la tarea';
COMMENT ON COLUMN therapeutic_tasks.owner_id IS 'Psicólogo/profesional que creó la tarea';
COMMENT ON COLUMN therapeutic_tasks.category IS 'Categoría: Seguimiento, Ejercicio, Diario, Cuestionario, Técnica, Lectura, Otra';
COMMENT ON COLUMN therapeutic_tasks.status IS 'Estado: PENDIENTE, EN_PROGRESO, COMPLETADA, VENCIDA, CANCELADA';
COMMENT ON COLUMN therapeutic_tasks.priority IS 'Prioridad: BAJA, MEDIA, ALTA, URGENTE';
COMMENT ON COLUMN therapeutic_tasks.progress IS 'Porcentaje de avance (0-100)';
COMMENT ON COLUMN therapeutic_tasks.due_date IS 'Fecha límite de entrega de la tarea';

-- Índices
CREATE INDEX IF NOT EXISTS idx_therapeutic_tasks_owner_id ON therapeutic_tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_therapeutic_tasks_patient_id ON therapeutic_tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_therapeutic_tasks_status ON therapeutic_tasks(status);
CREATE INDEX IF NOT EXISTS idx_therapeutic_tasks_priority ON therapeutic_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_therapeutic_tasks_due_date ON therapeutic_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_therapeutic_tasks_category ON therapeutic_tasks(category);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_updated_at ON therapeutic_tasks;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON therapeutic_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para marcar tareas vencidas automáticamente
CREATE OR REPLACE FUNCTION check_overdue_tasks()
RETURNS void AS $$
BEGIN
    UPDATE therapeutic_tasks
    SET status = 'VENCIDA', updated_at = now()
    WHERE status = 'PENDIENTE'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE therapeutic_tasks ENABLE ROW LEVEL SECURITY;

-- Clínicos (admin/psychologist/assistant) pueden ver todas las tareas
CREATE POLICY "Clinicians can view all tasks"
    ON therapeutic_tasks FOR SELECT
    TO authenticated
    USING (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
        OR has_role(auth.uid(), 'assistant')
    );

-- Pacientes solo ven sus propias tareas
CREATE POLICY "Patients can view own tasks"
    ON therapeutic_tasks FOR SELECT
    TO authenticated
    USING (
        has_role(auth.uid(), 'patient')
        AND owner_id = auth.uid()
    );

-- Clínicos pueden crear tareas
CREATE POLICY "Clinicians can create tasks"
    ON therapeutic_tasks FOR INSERT
    TO authenticated
    WITH CHECK (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
        OR has_role(auth.uid(), 'assistant')
    );

-- Clínicos pueden actualizar tareas
CREATE POLICY "Clinicians can update tasks"
    ON therapeutic_tasks FOR UPDATE
    TO authenticated
    USING (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
        OR has_role(auth.uid(), 'assistant')
    )
    WITH CHECK (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
        OR has_role(auth.uid(), 'assistant')
    );

-- Solo admins pueden eliminar tareas
CREATE POLICY "Only admins can delete tasks"
    ON therapeutic_tasks FOR DELETE
    TO authenticated
    USING (
        has_role(auth.uid(), 'admin')
    );
