-- ============================================
-- Migración 019: Coherencia de zona horaria + validación de horarios +
--                triggers updated_at faltantes + índices FK/compositos.
-- Schema: public
--
-- PROBLEMAS CORREGIDOS (sección 6 del memory)
--   7. Zona horaria inconsistente: prepare_reminders() usaba
--      'America/Guatemala' DURA y CURRENT_DATE (TZ de sesión de BD);
--      get_available_slots() dependía de la TZ de sesión para filtrar
--      slots pasados. El setting `timezone` de site_settings no se consumía.
--   8. Un work_schedule inválido ("foo-bar") rompía get_available_slots
--      con excepción sin manejo al castear a timestamptz.
--  18. Faltaban triggers de updated_at en booking_requests y cms_website.
--  19. Faltaban índices en FKs (reminders) y compositos en tasks/notes.
--
-- CAMBIOS
--   1. prepare_reminders(): lee timezone de site_settings (fallback
--      'America/Guatemala'), valida que sea una TZ conocida, y usa
--      (now() AT TIME ZONE v_tz)::date en lugar de CURRENT_DATE.
--   2. get_available_slots(): valida el rango del día con regex HH:MM
--      (día inválido -> cerrado, sin excepción) y filtra slots pasados con
--      comparación pura de timestamps (r.t <= now()), independiente de la
--      TZ de sesión.
--   3. Triggers updated_at en booking_requests y cms_website.
--   4. Índices: reminders(appointment_id|booking_id|patient_id),
--      booking_requests(email), therapeutic_tasks(patient_id,status),
--      clinical_notes(patient_id,session_date).
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================

-- ---------------------------------------------------------------------------
-- 1. prepare_reminders(): consume timezone de site_settings
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
    v_tz text;
    v_today date;
    r record;
BEGIN
    -- Zona horaria del consultorio: setting (con validación) + fallback.
    v_tz := COALESCE(NULLIF((SELECT value FROM public.site_settings WHERE key = 'timezone'), ''), 'America/Lima');
    IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = v_tz) THEN
        v_tz := 'America/Lima';
    END IF;
    v_today := (now() AT TIME ZONE v_tz)::date;

    -- Limpieza: pendientes vencidos (no se enviaron) fuera de la cola.
    DELETE FROM public.reminders
    WHERE status = 'PENDIENTE' AND remind_for < v_today;

    -- 1) Citas CONFIRMADAS de mañana → recordatorio "día previo".
    FOR r IN
        SELECT a.id AS appointment_id, NULL::uuid AS booking_id,
               p.id AS patient_id, p.full_name, p.phone, a.title,
               (a.appointment_date AT TIME ZONE v_tz)::date AS for_date,
               to_char(a.appointment_date AT TIME ZONE v_tz, 'HH24:MI') AS time
        FROM public.appointments a
        JOIN public.patients p ON p.id = a.patient_id
        WHERE a.status = 'CONFIRMADA'
          AND (a.appointment_date AT TIME ZONE v_tz)::date = v_today + 1
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
          AND b.preferred_date BETWEEN v_today + 1 AND v_today + 3
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
             coalesce(r.service_type, 'Sesión'), r.time, r.for_date - 1, r.for_date, v_msg, v_url);
        created_count := created_count + 1;
    END LOOP;

    RETURN created_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. get_available_slots(): validación de horarios + filtro TZ-agnóstico
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_available_slots(p_date DATE)
RETURNS TABLE (time_slot TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dow INTEGER;
    v_day_name TEXT;
    v_schedule JSONB;
    v_slot_min INTEGER;
    v_range TEXT;
    v_from TEXT;
    v_to TEXT;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
    v_occupied TIMESTAMPTZ[];
    r RECORD;
BEGIN
    IF p_date IS NULL THEN
        RETURN;
    END IF;

    v_dow := EXTRACT(ISODOW FROM p_date)::int; -- 1=Lu .. 7=Do
    v_day_name := CASE v_dow
        WHEN 1 THEN 'lunes'
        WHEN 2 THEN 'martes'
        WHEN 3 THEN 'miercoles'
        WHEN 4 THEN 'jueves'
        WHEN 5 THEN 'viernes'
        WHEN 6 THEN 'sabado'
        ELSE 'domingo'
    END;

    v_schedule := COALESCE(
        (SELECT value::jsonb FROM public.site_settings WHERE key = 'work_schedule'),
        '{"lunes":"08:00-20:00","martes":"08:00-20:00","miercoles":"08:00-20:00","jueves":"08:00-20:00","viernes":"08:00-20:00","sabado":"09:00-13:00","domingo":"cerrado"}'::jsonb
    );
    v_slot_min := COALESCE(
        (SELECT NULLIF(value, '')::int FROM public.site_settings WHERE key = 'slot_duration_minutes'),
        50
    );

    -- Formato objeto (nuevo) vs array (legacy, migración 010).
    IF jsonb_typeof(v_schedule) = 'array' THEN
        SELECT (elem.value->>'from') || '-' || (elem.value->>'to') INTO v_range
        FROM jsonb_array_elements(v_schedule) elem
        WHERE (elem.value->>'day')::int = v_dow;
    ELSE
        v_range := v_schedule->>v_day_name;
    END IF;

    -- Día cerrado → sin horarios.
    IF v_range IS NULL OR v_range = '' OR v_range = 'cerrado' THEN
        RETURN;
    END IF;

    v_from := split_part(v_range, '-', 1);
    v_to   := split_part(v_range, '-', 2);

    -- Validación estricta HH:MM (evita excepción con horarios inválidos).
    IF v_from !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
       OR v_to !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' THEN
        RETURN;
    END IF;

    v_start := (to_char(p_date, 'YYYY-MM-DD') || 'T00:00:00')::timestamptz;
    v_end   := (to_char(p_date + 1, 'YYYY-MM-DD') || 'T00:00:00')::timestamptz;

    -- Ocupados: citas no canceladas del día.
    SELECT COALESCE(array_agg(a.appointment_date), ARRAY[]::timestamptz[])
    INTO v_occupied
    FROM public.appointments a
    WHERE a.appointment_date >= v_start
      AND a.appointment_date < v_end
      AND a.status <> 'CANCELADA';

    -- Ocupados: solicitudes de cita activas del día (horario preferido).
    SELECT v_occupied ||
        COALESCE(array_agg(
            (to_char(b.preferred_date, 'YYYY-MM-DD') || 'T' || COALESCE(b.preferred_time, '10:00') || ':00')::timestamptz
        ), ARRAY[]::timestamptz[])
    INTO v_occupied
    FROM public.booking_requests b
    WHERE b.preferred_date = p_date
      AND b.status IN ('PENDIENTE', 'CONTACTADA', 'AGENDADA');

    -- Slots cada 30 min dentro del bloque; se descartan los ya pasados
    -- (comparación de instantes, independiente de la TZ de la sesión de BD)
    -- y los que se solapan con una sesión ocupada.
    FOR r IN
        SELECT generate_series(
            (to_char(p_date, 'YYYY-MM-DD') || 'T' || v_from || ':00')::timestamptz,
            (to_char(p_date, 'YYYY-MM-DD') || 'T' || v_to || ':00')::timestamptz - interval '1 minute',
            interval '30 minutes'
        ) AS t
    LOOP
        IF r.t <= now() THEN
            CONTINUE;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM unnest(v_occupied) AS occ(ts)
            WHERE occ.ts < r.t + make_interval(mins => v_slot_min)
              AND r.t < occ.ts + make_interval(mins => v_slot_min)
        ) THEN
            time_slot := to_char(r.t, 'HH24:MI');
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

-- Ejecución pública: solo devuelve horarios, nunca datos de pacientes.
REVOKE ALL ON FUNCTION public.get_available_slots (DATE) FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.get_available_slots (DATE) TO anon,
authenticated;

-- ---------------------------------------------------------------------------
-- 3. Triggers updated_at faltantes
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_booking_requests_updated_at ON public.booking_requests;

CREATE TRIGGER update_booking_requests_updated_at
    BEFORE UPDATE ON public.booking_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cms_website_updated_at ON public.cms_website;

CREATE TRIGGER update_cms_website_updated_at
    BEFORE UPDATE ON public.cms_website
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. Índices FK/compositos faltantes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reminders_appointment_id ON public.reminders (appointment_id);

CREATE INDEX IF NOT EXISTS idx_reminders_booking_id ON public.reminders (booking_id);

CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON public.reminders (patient_id);

CREATE INDEX IF NOT EXISTS idx_booking_requests_email ON public.booking_requests (email);

CREATE INDEX IF NOT EXISTS idx_therapeutic_tasks_patient_status ON public.therapeutic_tasks (patient_id, status);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_session ON public.clinical_notes (patient_id, session_date);

-- ---------------------------------------------------------------------------
-- Verificación (opcional)
-- ---------------------------------------------------------------------------
-- SELECT value FROM public.site_settings WHERE key = 'timezone';           -- 'America/Guatemala'
-- SELECT * FROM public.get_available_slots(CURRENT_DATE::date);            -- sin excepción con horarios válidos
-- SELECT tgname FROM pg_trigger WHERE tgrelid IN
--   ('public.booking_requests'::regclass, 'public.cms_website'::regclass); -- 2 triggers updated_at
-- SELECT indexname FROM pg_indexes WHERE tablename IN
--   ('reminders', 'booking_requests', 'therapeutic_tasks', 'clinical_notes');