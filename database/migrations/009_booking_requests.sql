-- ============================================
-- Migración 009: Solicitudes de cita desde la landing
-- Schema: public
--
-- Los visitantes (sin sesión) pueden agendar desde la página principal;
-- sus solicitudes quedan en esta tabla. El equipo clínico las revisa en el
-- dashboard, las contacta por WhatsApp y/o las convierte en una cita real
-- de la tabla appointments.
--
-- RLS:
--   INSERT  -> anon/authenticated (cualquier visitante)
--   SELECT  -> solo admin/psychologist/assistant
--   UPDATE  -> solo admin/psychologist/assistant (marcar CONTACTADA/AGENDADA)
--   DELETE  -> solo admin
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================

CREATE TABLE IF NOT EXISTS public.booking_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    service_type TEXT NOT NULL DEFAULT 'Terapia Individual',
    modality TEXT NOT NULL DEFAULT 'Presencial',
    preferred_date DATE,
    preferred_time TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (status IN ('PENDIENTE', 'CONTACTADA', 'AGENDADA', 'CANCELADA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.booking_requests IS
    'Solicitudes de cita creadas desde la landing (acceso público).';
COMMENT ON COLUMN public.booking_requests.status IS
    'PENDIENTE → CONTACTADA → AGENDADA | CANCELADA (flujo gestionado por el clínico).';

-- Índice para el flujo del dashboard: pendientes ordenadas por fecha cercana.
CREATE INDEX IF NOT EXISTS idx_booking_requests_status_date
    ON public.booking_requests (status, preferred_date);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- INSERT: cualquier visitante (anon o con sesión).
DROP POLICY IF EXISTS "booking_requests_public_insert" ON public.booking_requests;
CREATE POLICY "booking_requests_public_insert"
    ON public.booking_requests FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- SELECT: solo equipo clínico.
DROP POLICY IF EXISTS "booking_requests_clinician_select" ON public.booking_requests;
CREATE POLICY "booking_requests_clinician_select"
    ON public.booking_requests FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'psychologist')
        OR public.has_role(auth.uid(), 'assistant')
    );

-- UPDATE: solo equipo clínico.
DROP POLICY IF EXISTS "booking_requests_clinician_update" ON public.booking_requests;
CREATE POLICY "booking_requests_clinician_update"
    ON public.booking_requests FOR UPDATE
    TO authenticated
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

-- DELETE: solo admin.
DROP POLICY IF EXISTS "booking_requests_admin_delete" ON public.booking_requests;
CREATE POLICY "booking_requests_admin_delete"
    ON public.booking_requests FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Verificación (opcional)
-- ============================================
-- SELECT p.policyname, p.cmd, p.roles
-- FROM pg_policies p
-- WHERE p.tablename = 'booking_requests'
-- ORDER BY p.cmd;