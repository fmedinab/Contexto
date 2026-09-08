-- ============================================
-- Migración 011: Cola de recordatorios de WhatsApp (sin API)
-- Schema: public | Tabla: reminders
--
-- Sin WhatsApp Business API, el envío NO puede ser 100 % automático
-- (WhatsApp bloquea el uso automatizado de cuentas personales).
-- Este diseño automatiza la parte legal y útil:
--   1) Un job diario (pg_cron / Schedules) corre prepare_reminders()
--      y deja lista la cola: quién recordar, el texto y el enlace wa.me
--      con el mensaje ya armado.
--   2) El clínico solo toca el botón verde de WhatsApp → se abre el
--      chat con el mensaje puesto → "Enviar". Luego marca "enviado".
--
-- RLS:
--   SELECT/UPDATE -> solo admin/psychologist/assistant
--   DELETE        -> solo admin
-- prepare_reminders() corre como dueño (SECURITY DEFINER) y sus
-- records NUNCA se exponen a anon (REVOKE de PUBLIC).
-- ============================================

-- ---------------------------------------------------------------------------
-- 1. Tabla reminders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.booking_requests(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service_type TEXT NOT NULL DEFAULT 'Sesión',
    appointment_time TEXT,
    remind_for DATE NOT NULL,
    for_date DATE,
    reminder_text TEXT NOT NULL,
    wa_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (status IN ('PENDIENTE', 'ENVIADO', 'SALTADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ
);

COMMENT ON TABLE public.reminders IS
    'Cola de recordatorios de WhatsApp prefabricados para 1-tap (sin API).';
COMMENT ON COLUMN public.reminders.remind_for IS
    'Día en que debe enviarse el recordatorio (día previo a la cita/solicitud).';

CREATE INDEX IF NOT EXISTS idx_reminders_status_date
    ON public.reminders (status, remind_for);

CREATE INDEX IF NOT EXISTS idx_reminders_for_date
    ON public.reminders (for_date);

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_clinician_select" ON public.reminders;
CREATE POLICY "reminders_clinician_select"
    ON public.reminders FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'psychologist')
        OR public.has_role(auth.uid(), 'assistant')
    );

DROP POLICY IF EXISTS "reminders_clinician_update" ON public.reminders;
CREATE POLICY "reminders_clinician_update"
    ON public.reminders FOR UPDATE
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

DROP POLICY IF EXISTS "reminders_admin_delete" ON public.reminders;
CREATE POLICY "reminders_admin_delete"
    ON public.reminders FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------

-- Fecha legible: "Lunes 09/09" (locales fijos en español).
CREATE OR REPLACE FUNCTION public.fecha_es(d date)
RETURNS text
LANGUAGE sql
IMMUTABLE
RETURN (
    (array['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'])[extract(dow from d)::int + 1]
    || ' ' || to_char(d, 'DD/MM')
);

-- Percent-encoding UTF-8 para wa.me?text=...
CREATE OR REPLACE FUNCTION public.urlencode(str text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
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
-- 4. prepare_reminders(): arma la cola del día siguiente (idempotente)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prepare_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    created_count integer := 0;
    v_msg text;
    v_digits text;
    v_url text;
    r record;
BEGIN
    -- Limpieza: pendientes vencidos (no se enviaron) fuera de la cola.
    DELETE FROM public.reminders
    WHERE status = 'PENDIENTE' AND remind_for < CURRENT_DATE;

    -- 1) Citas CONFIRMADAS de mañana → recordatorio "día previo".
    FOR r IN
        SELECT a.id AS appointment_id, NULL::uuid AS booking_id,
               p.id AS patient_id, p.full_name, p.phone, a.title,
               (a.appointment_date AT TIME ZONE 'America/Guatemala')::date AS for_date,
               to_char(a.appointment_date AT TIME ZONE 'America/Guatemala', 'HH24:MI') AS time
        FROM public.appointments a
        JOIN public.patients p ON p.id = a.patient_id
        WHERE a.status = 'CONFIRMADA'
          AND (a.appointment_date AT TIME ZONE 'America/Guatemala')::date = CURRENT_DATE + 1
          AND p.phone IS NOT NULL
          AND p.phone <> ''
          AND NOT EXISTS (SELECT 1 FROM public.reminders rr WHERE rr.appointment_id = a.id)
    LOOP
        v_digits := regexp_replace(r.phone, '\D', '', 'g');
        IF length(v_digits) < 8 THEN CONTINUE; END IF;
        v_msg := 'Hola ' || r.full_name
            || ', te recordamos tu cita de ' || r.title
            || ' el ' || public.fecha_es(r.for_date)
            || ' a las ' || r.time || '. Te esperamos. — CONTEXTO Psicología';
        v_url := 'https://wa.me/' || v_digits || '?text=' || public.urlencode(v_msg);
        INSERT INTO public.reminders
            (appointment_id, booking_id, patient_id, patient_name, phone,
             service_type, appointment_time, remind_for, for_date, reminder_text, wa_url)
        VALUES
            (r.appointment_id, r.booking_id, r.patient_id, r.full_name, r.phone,
             coalesce(r.title, 'Sesión'), r.time, r.for_date - 1, r.for_date, v_msg, v_url);
        created_count := created_count + 1;
    END LOOP;

    -- 2) Solicitudes activas con fecha en los próximos 3 días.
    FOR r IN
        SELECT NULL::uuid AS appointment_id, b.id AS booking_id,
               NULL::uuid AS patient_id, b.full_name, b.phone,
               b.service_type, b.modality, b.preferred_date AS for_date,
               b.preferred_time AS time
        FROM public.booking_requests b
        WHERE b.status IN ('PENDIENTE', 'CONTACTADA')
          AND b.preferred_date BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 3
          AND b.phone IS NOT NULL
          AND b.phone <> ''
          AND NOT EXISTS (SELECT 1 FROM public.reminders rr WHERE rr.booking_id = b.id)
    LOOP
        v_digits := regexp_replace(r.phone, '\D', '', 'g');
        IF length(v_digits) < 8 THEN CONTINUE; END IF;
        v_msg := 'Hola ' || r.full_name
            || ', tu solicitud de ' || coalesce(r.service_type, 'sesión')
            || ' (' || coalesce(r.modality, 'Presencial') || ')'
            || ' para el ' || public.fecha_es(r.for_date)
            || ' está cerca. Respondé este mensaje para confirmar tu cita y la dejamos agendada. — CONTEXTO Psicología';
        v_url := 'https://wa.me/' || v_digits || '?text=' || public.urlencode(v_msg);
        INSERT INTO public.reminders
            (appointment_id, booking_id, patient_id, patient_name, phone,
             service_type, appointment_time, remind_for, for_date, reminder_text, wa_url)
        VALUES
            (r.appointment_id, r.booking_id, r.patient_id, r.full_name, r.phone,
             r.service_type, r.time, r.for_date - 1, r.for_date, v_msg, v_url);
        created_count := created_count + 1;
    END LOOP;

    RETURN created_count;
END $$;

-- Seguridad: el dueño lee appointments/booking_requests por SECURITY DEFINER;
-- nadie más debe poder invocarla (menos aun anon → fuga de datos).
REVOKE ALL ON FUNCTION public.prepare_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_reminders() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Scheduling (pg_cron). Si falla, usá Supabase → Database → Schedules
--    con la consulta:  select public.prepare_reminders();
-- ---------------------------------------------------------------------------
DO $do$
DECLARE
    job_row record;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RAISE NOTICE 'pg_cron no está activo. Programa prepare_reminders() en Supabase → Database → Schedules.';
        RETURN;
    END IF;
    FOR job_row IN SELECT jobid FROM cron.job WHERE jobname = 'contexto-recordatorios' LOOP
        PERFORM cron.unschedule(job_row.jobid);
    END LOOP;
    PERFORM cron.schedule(
        'contexto-recordatorios',
        '0 22 * * *',
        $cron$SELECT public.prepare_reminders();$cron$
    );
    RAISE NOTICE 'Recordatorios programados: todos los días a las 22:00.';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'No se pudo programar el cron (%); usá Supabase → Database → Schedules.', SQLERRM;
END $do$;

-- ---------------------------------------------------------------------------
-- Verificación (opcional)
-- ---------------------------------------------------------------------------
-- SELECT p.policyname FROM pg_policies p WHERE p.tablename = 'reminders';
-- SELECT public.prepare_reminders();
-- SELECT patient_name, service_type, remind_for, wa_url FROM public.reminders ORDER BY remind_for;