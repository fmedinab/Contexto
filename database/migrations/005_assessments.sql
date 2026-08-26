-- ============================================================
-- MIGRATION 005: Tabla de evaluaciones/assessments
-- Mente Serena — CONTEXTO
-- ============================================================

-- Tabla principal de evaluaciones
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    instrument_name TEXT NOT NULL,
    instrument_code TEXT,
    instrument_category TEXT,
    status TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (status IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA')),
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    result_score NUMERIC,
    result_interpretation TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_assessments_owner_id ON assessments(owner_id);
CREATE INDEX IF NOT EXISTS idx_assessments_patient_id ON assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_instrument ON assessments(instrument_name);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON assessments;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_assessments_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Clínicos (admin/psychologist/assistant) pueden ver todas las evaluaciones
CREATE POLICY "Clinicians can view all assessments"
    ON assessments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'psychologist', 'assistant')
        )
    );

-- Pacientes solo ven sus propias evaluaciones
CREATE POLICY "Patients can view own assessments"
    ON assessments FOR SELECT
    TO authenticated
    USING (
        patient_id IN (
            SELECT id FROM patients WHERE id = patient_id
        )
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
            AND r.name = 'patient'
        )
    );

-- Clínicos pueden crear evaluaciones
CREATE POLICY "Clinicians can create assessments"
    ON assessments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'psychologist', 'assistant')
        )
    );

-- Clínicos pueden actualizar evaluaciones
CREATE POLICY "Clinicians can update assessments"
    ON assessments FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'psychologist', 'assistant')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'psychologist', 'assistant')
        )
    );

-- Solo admins pueden eliminar evaluaciones
CREATE POLICY "Only admins can delete assessments"
    ON assessments FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
            AND r.name = 'admin'
        )
    );
