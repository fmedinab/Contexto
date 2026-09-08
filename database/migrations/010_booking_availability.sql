-- ============================================
-- Migración 010: Disponibilidad de horarios (get_available_slots)
-- Schema: public
--
-- Un visitante anónimo NO puede leer appointments/booking_requests (RLS).
-- Para que la landing muestre solo horarios libres se usa una función
-- SECURITY DEFINER que calcula la disponibilidad y devuelve únicamente
-- los slots libres del día (nunca datos de pacientes).
--
-- Cálculo: horario de trabajo (site_settings.work_schedule) MENOS
--   - citas del día (status <> CANCELADA)
--   - solicitudes de cita activas del día (PENDIENTE/CONTACTADA/AGENDADA)
--   - slots ya pasados si consultan el día de hoy
--
-- El horario se configura en public.site_settings:
--   work_schedule         JSON  [{"day":0..6,"from":"08:00","to":"20:00"}]
--   slot_duration_minutes number  duración estimada por sesión
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================

-- Horario de atención por defecto (editable via site_settings):
--   día 1=Lu..6=Sa, 0=Do (cerrado)
INSERT INTO public.site_settings (key, value, type, description) VALUES
    ('work_schedule',
     '[{"day":1,"from":"08:00","to":"20:00"},{"day":2,"from":"08:00","to":"20:00"},{"day":3,"from":"08:00","to":"20:00"},{"day":4,"from":"08:00","to":"20:00"},{"day":5,"from":"08:00","to":"20:00"},{"day":6,"from":"09:00","to":"13:00"}]',
     'json',
     'Horario de atención por día (ISODOW: 1=Lu..6=Sa, 0=Do cerrado).'),
    ('slot_duration_minutes', '50', 'number', 'Duración estimada de cada sesión en minutos.')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Función: horarios libres para una fecha
-- ============================================
CREATE OR REPLACE FUNCTION public.get_available_slots(p_date DATE)
RETURNS TABLE (time_slot TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dow INTEGER;
    v_schedule JSONB;
    v_slot_min INTEGER;
    v_day JSONB;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
    v_occupied TIMESTAMPTZ[];
    r RECORD;
BEGIN
    IF p_date IS NULL THEN
        RETURN;
    END IF;

    v_dow := EXTRACT(ISODOW FROM p_date)::int; -- 1=Lu .. 7=Do
    v_schedule := COALESCE(
        (SELECT value::jsonb FROM public.site_settings WHERE key = 'work_schedule'),
        '[{"day":1,"from":"08:00","to":"20:00"},{"day":2,"from":"08:00","to":"20:00"},{"day":3,"from":"08:00","to":"20:00"},{"day":4,"from":"08:00","to":"20:00"},{"day":5,"from":"08:00","to":"20:00"},{"day":6,"from":"09:00","to":"13:00"}]'::jsonb
    );
    v_slot_min := COALESCE(
        (SELECT NULLIF(value, '')::int FROM public.site_settings WHERE key = 'slot_duration_minutes'),
        50
    );

    -- Día cerrado → sin horarios.
    SELECT s.value INTO v_day
    FROM jsonb_array_elements(v_schedule) s
    WHERE (s.value->>'day')::int = v_dow;

    IF v_day IS NULL THEN
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

    -- Generar slots horarios dentro del bloque de trabajo del día.
    FOR r IN
        SELECT generate_series(
            (to_char(p_date, 'YYYY-MM-DD') || 'T' || (v_day->>'from') || ':00')::timestamptz,
            (to_char(p_date, 'YYYY-MM-DD') || 'T' || (v_day->>'to') || ':00')::timestamptz - interval '1 minute',
            interval '1 hour'
        ) AS t
    LOOP
        -- No ofrecer slots ya pasados si consultan el día de hoy.
        IF to_char(r.t, 'YYYY-MM-DD') = to_char(now(), 'YYYY-MM-DD') AND r.t <= now() THEN
            CONTINUE;
        END IF;

        -- Libre si no se superpone con ningún ocupado
        -- (cada sesión dura v_slot_min minutos).
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
REVOKE ALL ON FUNCTION public.get_available_slots(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(DATE) TO anon, authenticated;

-- ============================================
-- Verificación (opcional)
-- ============================================
-- SELECT * FROM public.get_available_slots('2026-09-10'::date);