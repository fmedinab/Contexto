-- ============================================
-- Migración 013: Ajustes globales del consultorio
-- Schema: public
--
-- Extiende la tabla site_settings (clave-valor) con los ajustes
-- globales del consultorio. Se consumen desde el dropdown de perfil
-- ("Ajustes") en el dashboard y afectan a todo el sistema:
--   - Horarios de atención (work_schedule)
--   - Tiempo de inactividad de sesión (idle/session timeout)
--   - Datos de contacto
--   - WhatsApp
--   - Moneda y zona horaria
--
-- Esta migración NO borra ediciones previas: cada INSERT usa
-- ON CONFLICT (key) DO NOTHING. Si el admin ya guardó un valor,
-- se conserva. Si la tabla ya tiene las claves, no se duplican.
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================

-- ---------------------------------------------------------------------------
-- 1. Ajustes de horarios de atención (para la landing y la agenda)
--    value = JSON: {"days":[...], "slots":[...]} o un horario por día.
--    Ejemplo: {"lunes":"08:00-20:00","martes":"08:00-20:00",...,"domingo":"cerrado"}
-- ---------------------------------------------------------------------------
INSERT INTO public.site_settings (key, value, type, description) VALUES
    ('work_schedule', '{"lunes":"08:00-20:00","martes":"08:00-20:00","miercoles":"08:00-20:00","jueves":"08:00-20:00","viernes":"08:00-20:00","sabado":"09:00-14:00","domingo":"cerrado"}', 'json', 'Horarios de atención del consultorio por día. Formato: {dia: "HH:MM-HH:MM" | "cerrado"}'),
    ('session_timeout_minutes', '30', 'number', 'Tiempo de inactividad en minutos antes de cerrar la sesión del usuario'),
    ('contact_email', 'contacto@contextopsicologia.com', 'text', 'Correo principal de contacto del consultorio'),
    ('contact_phone', '+502 1234 5678', 'text', 'Teléfono/WhatsApp principal del consultorio'),
    ('whatsapp_number', '+50212345678', 'text', 'Número de WhatsApp (solo dígitos con código de país, sin espacios) para enlaces wa.me'),
    ('currency', 'PEN', 'text', 'Moneda por defecto del consultorio'),
    ('timezone', 'America/Guatemala', 'text', 'Zona horaria del consultorio'),
    ('booking_confirm_hours', '24', 'number', 'Horas máximas para confirmar una solicitud de cita (visible en la landing)')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Trigger para mantener actualizado updated_at en site_settings
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Verificación (opcional)
-- ---------------------------------------------------------------------------
-- SELECT key, value, type FROM public.site_settings WHERE key IN
--   ('work_schedule','session_timeout_minutes','contact_email','contact_phone',
--    'whatsapp_number','currency','timezone','booking_confirm_hours');
