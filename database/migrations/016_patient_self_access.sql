-- ============================================
-- Migración 016: Acceso de pacientes (C+B)
-- Schema: public
--
-- Objetivo (flujo cliente):
--   C) Cuando un visitante se registra desde /register, pasa a ser paciente
--      de forma automática: se le asigna el rol `patient`, se crea su ficha
--      en `patients` vinculada a su cuenta (owner_id) y sus solicitudes de
--      cita previas quedan visibles en su portal por coincidencia de email.
--   B) El clínico puede "dar acceso" desde el dashboard (botón Enviar
--      acceso) enviando un magic link. Si la cuenta ya existe se le asigna
--      el rol/ficha; si no, supabase la crea con metadata role=patient y el
--      trigger handle_new_user completa rol + ficha.
--
-- Idempotente.
-- ============================================

-- ---------------------------------------------------------------------------
-- 1) TRIGGER handle_new_user: asignar rol + ficha según metadata de registro
-- ---------------------------------------------------------------------------
-- Reglas:
--   * Solo el registro público de paciente (metadata role=patient) recibe
--     rol+ficha automáticos. Los roles de staff se asignan manualmente.
--   * Para el paciente se crea su ficha en `patients` (owner_id = auth.uid)
--     o, si ya existía una ficha con ese email (p. ej. creada por el clínico
--     al convertir una solicitud), solo se vincula el owner_id.
--   * Los usuarios creados manualmente por el admin (sin metadata role)
--     NO reciben rol automático: se mantiene la asignación manual.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
BEGIN
    INSERT INTO public.profiles (id, email, full_name, dni, currency, language)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'dni',
        COALESCE(NEW.raw_user_meta_data->>'currency', 'PEN'),
        COALESCE(NEW.raw_user_meta_data->>'language', 'es')
    );

    -- Solo el registro público de paciente se auto-asigna; los roles de
    -- staff (admin/psychologist/assistant) se asignan manualmente por el
    -- administrador en el Dashboard (evita escalada de privilegios por
    -- metadata manipulada en signUp).
    IF NEW.raw_user_meta_data->>'role' = 'patient' THEN
        -- Asignar el rol patient (idempotente).
        SELECT id INTO v_role_id FROM public.roles WHERE name = 'patient' AND is_system = TRUE;
        IF v_role_id IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (NEW.id, v_role_id)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Vincular ficha existente con ese email (evitar duplicados).
        UPDATE public.patients
        SET owner_id = NEW.id
        WHERE owner_id IS NULL
          AND lower(email) = lower(NEW.email);

        -- Crear la ficha si todavía no existe ninguna para este usuario.
        INSERT INTO public.patients (owner_id, full_name, email, status, start_date)
        SELECT
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            NEW.email,
            'new',
            CURRENT_DATE
        WHERE NOT EXISTS (
            SELECT 1 FROM public.patients WHERE owner_id = NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recrear el trigger (por si el esquema cambió el trigger existente).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2) RPC ensure_patient_account(email, full_name): acceso para cuentas ya
--    existentes (seguridad: SECURITY DEFINER, solo asigna/completa datos del
--    propio paciente o de una ficha sin dueño).
-- ---------------------------------------------------------------------------
-- Uso: dashboard → botón "Enviar acceso de paciente".
--   * Si el email ya tiene cuenta: asigna rol patient + vincula/crea ficha.
--   * Si la cuenta no existe aún: no hace nada; el magic link la creará con
--     metadata role=patient y handle_new_user completa rol + ficha.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_patient_account(p_email TEXT, p_full_name TEXT DEFAULT NULL)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
    v_patient_id UUID;
BEGIN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = lower(COALESCE(p_email, ''))
    LIMIT 1;

    -- No existe cuenta: OTP la creará con metadata role=patient.
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Asignar rol patient (idempotente).
    SELECT id INTO v_role_id FROM public.roles WHERE name = 'patient' AND is_system = TRUE;
    IF v_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (v_user_id, v_role_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Vincular una ficha existente sin dueño que coincida por email.
    UPDATE public.patients
    SET owner_id = v_user_id
    WHERE owner_id IS NULL
      AND lower(email) = lower(COALESCE(p_email, ''))
    RETURNING id INTO v_patient_id;

    -- Crear la ficha si el usuario aún no tiene ninguna.
    IF v_patient_id IS NULL THEN
        INSERT INTO public.patients (owner_id, full_name, email, status, start_date)
        SELECT v_user_id, COALESCE(NULLIF(p_full_name, ''), p_email), p_email, 'new', CURRENT_DATE
        WHERE NOT EXISTS (
            SELECT 1 FROM public.patients WHERE owner_id = v_user_id
        )
        RETURNING id INTO v_patient_id;
    END IF;

    RETURN NEXT v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_patient_account(TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Verificación (opcional)
-- ---------------------------------------------------------------------------
-- SELECT id, email, raw_user_meta_data->>'role' AS meta_role FROM auth.users ORDER BY created_at DESC LIMIT 5;
-- SELECT ur.user_id, r.name FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'patient' LIMIT 10;
-- SELECT id, full_name, email, owner_id, status FROM public.patients ORDER BY created_at DESC LIMIT 10;