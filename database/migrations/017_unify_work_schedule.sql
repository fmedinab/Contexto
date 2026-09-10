-- ============================================
-- Migración 017: Unificar work_schedule (formato objeto) + get_available_slots
-- Schema: public
--
-- PROBLEMA CORREGIDO
--   La migración 010 insertó work_schedule como JSON array:
--     [{"day":1,"from":"08:00","to":"20:00"}, ...]
--   mientras la migración 013, el panel "Ajustes del consultorio" y los
--   defaults del frontend usan un objeto por día con nombre en español:
--     {"lunes":"08:00-20:00","martes":"cerrado", ...}
--   Como 010 corre primero con ON CONFLICT (key) DO NOTHING, la BD quedó
--   con el array: el panel leía schedule['lunes'] -> undefined -> todo
--   aparecía "cerrado", y al guardar desde el panel se rompía el RPC
--   get_available_slots (que espera array).
--
-- CAMBIOS
--   1. Migra cualquier work_schedule existente en formato array al formato
--      objeto por día (diario abierto/cerrado).
--   2. Reescribe get_available_slots para leer el formato OBJETO, con
--      retrocompatibilidad con el formato array. Genera slots cada 30 min
--      dentro del bloque de trabajo y descarta automáticamente los que ya
--      tienen cita/solicitud activa o los pasados (día de hoy).
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================

-- ---------------------------------------------------------------------------
-- 1. Convertir work_schedule legacy (array) -> objeto por día.
--    ISODOW: 1=Lu..6=Sa, 7=Do.
-- ---------------------------------------------------------------------------
UPDATE public.site_settings
SET value = (
        SELECT jsonb_object_agg(
            CASE (elem.value->>'day')::int
                WHEN 1 THEN 'lunes'
                WHEN 2 THEN 'martes'
                WHEN 3 THEN 'miercoles'
                WHEN 4 THEN 'jueves'
                WHEN 5 THEN 'viernes'
                WHEN 6 THEN 'sabado'
                ELSE 'domingo'
            END,
            (elem.value->>'from') || '-' || (elem.value->>'to')
        )::text
        FROM jsonb_array_elements(value::jsonb) elem
    )
WHERE key = 'work_schedule'
  AND value IS NOT NULL
  AND value <> ''
  AND jsonb_typeof(value::jsonb) = 'array';

-- Descripción alineada con el formato real (objeto por día).
UPDATE public.site_settings
SET description = 'Horarios de atención del consultorio por día. Formato: {dia: "HH:MM-HH:MM" | "cerrado"} (lunes..domingo).'
WHERE key = 'work_schedule';

-- ---------------------------------------------------------------------------
-- 2. Reescribir get_available_slots
--    Lee work_schedule (objeto por día, con fallback a array legacy),
--    genera slots libres cada 30 min dentro del bloque del día.
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
    IF v_from = '' OR v_to = '' THEN
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
    -- (día de hoy) y los que se solapan con una sesión ocupada.
    FOR r IN
        SELECT generate_series(
            (to_char(p_date, 'YYYY-MM-DD') || 'T' || v_from || ':00')::timestamptz,
            (to_char(p_date, 'YYYY-MM-DD') || 'T' || v_to || ':00')::timestamptz - interval '1 minute',
            interval '30 minutes'
        ) AS t
    LOOP
        IF to_char(r.t, 'YYYY-MM-DD') = to_char(now(), 'YYYY-MM-DD') AND r.t <= now() THEN
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
REVOKE ALL ON FUNCTION public.get_available_slots(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(DATE) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Verificación (opcional)
-- ---------------------------------------------------------------------------
-- SELECT key, value FROM public.site_settings WHERE key = 'work_schedule';
-- SELECT * FROM public.get_available_slots(CURRENT_DATE::date);