-- ============================================================
-- MIGRATION 007: Tabla de notas clínicas
-- Mente Serena — CONTEXTO
-- ============================================================

CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_type TEXT NOT NULL DEFAULT 'Terapia Individual'
        CHECK (session_type IN ('Terapia Individual', 'Terapia de Pareja', 'Terapia Familiar', 'Evaluación Inicial', 'Seguimiento', 'Otra')),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT,
    summary TEXT NOT NULL,
    interventions TEXT,
    observations TEXT,
    next_steps TEXT,
    risk_level TEXT DEFAULT 'BAJO'
        CHECK (risk_level IN ('BAJO', 'MODERADO', 'ALTO', 'CRISIS')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN clinical_notes.patient_id IS 'Paciente al que pertenece la nota';
COMMENT ON COLUMN clinical_notes.owner_id IS 'Profesional que redactó la nota';
COMMENT ON COLUMN clinical_notes.session_type IS 'Tipo de sesión';
COMMENT ON COLUMN clinical_notes.session_date IS 'Fecha de la sesión';
COMMENT ON COLUMN clinical_notes.title IS 'Título descriptivo de la nota';
COMMENT ON COLUMN clinical_notes.summary IS 'Resumen de la sesión (obligatorio)';
COMMENT ON COLUMN clinical_notes.interventions IS 'Intervenciones aplicadas';
COMMENT ON COLUMN clinical_notes.observations IS 'Observaciones clínicas';
COMMENT ON COLUMN clinical_notes.next_steps IS 'Próximos pasos o tareas';
COMMENT ON COLUMN clinical_notes.risk_level IS 'Nivel de riesgo: BAJO, MODERADO, ALTO, CRISIS';

-- Índices
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_id ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_owner_id ON clinical_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_session_date ON clinical_notes(session_date);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_session_type ON clinical_notes(session_type);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_risk_level ON clinical_notes(risk_level);

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at ON clinical_notes;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

-- Clínicos ven todas las notas
CREATE POLICY "Clinicians can view all clinical notes"
    ON clinical_notes FOR SELECT
    TO authenticated
    USING (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
        OR has_role(auth.uid(), 'assistant')
    );

-- Pacientes ven sus propias notas
CREATE POLICY "Patients can view own clinical notes"
    ON clinical_notes FOR SELECT
    TO authenticated
    USING (
        has_role(auth.uid(), 'patient')
        AND owner_id = auth.uid()
    );

-- Clínicos pueden crear notas
CREATE POLICY "Clinicians can create clinical notes"
    ON clinical_notes FOR INSERT
    TO authenticated
    WITH CHECK (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'psychologist')
        OR has_role(auth.uid(), 'assistant')
    );

-- Clínicos pueden actualizar notas
CREATE POLICY "Clinicians can update clinical notes"
    ON clinical_notes FOR UPDATE
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

-- Solo admin puede eliminar notas
CREATE POLICY "Only admins can delete clinical notes"
    ON clinical_notes FOR DELETE
    TO authenticated
    USING (
        has_role(auth.uid(), 'admin')
    );
