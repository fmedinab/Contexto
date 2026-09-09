-- ============================================
-- Migración 015: Páginas legales (CMS) + portal del paciente
-- Schema: public
--
-- Partes:
--   1) Seed de la sección `legal` en cms_website: privacidad, cookies y
--      aviso legal, editables desde el panel admin.
--   2) Política RLS en appointments: el paciente ve solo sus propias citas
--      (antes solo el equipo clínico). Faltaba, a diferencia de
--      assessments/tasks/clinical_notes.
--   3) Política RLS en booking_requests: el paciente autenticado puede leer
--      las solicitudes de cita que él mismo registró (marca por email/teléfono).
--
-- Idempotente.
-- ============================================

-- ---------------------------------------------------------------------------
-- 1) SEED sección legal en cms_website (contenido inicial, editable por admin)
-- ---------------------------------------------------------------------------

-- Marcamos las nuevas claves para el inicio en orden descendente respecto a
-- las existentes (sort_order arranca en 44).
INSERT INTO public.cms_website (section, item_key, content, content_json, sort_order)
SELECT * FROM (VALUES
    -- PRIVACIDAD
    ('legal', 'privacy_title', 'Política de Privacidad', NULL::jsonb, 44),
    ('legal', 'privacy_updated', 'Última actualización: septiembre de 2026.', NULL::jsonb, 45),
    ('legal', 'privacy_intro', 'En CONTEXTO Psicología (Centro de Ciencias Comportamentales) nos comprometemos a proteger tu privacidad y a tratar tus datos personales con absoluta confidencialidad, de conformidad con la legislación vigente sobre protección de datos personales.', NULL::jsonb, 46),
    ('legal', 'privacy_content', E'Información que recopilamos:\n\n· Datos de contacto que proporcionas al reservar una cita (nombre, teléfono, correo electrónico).\n· Información clínica únicamente en el marco de la relación terapéutica.\n· Datos de uso técnico del sitio de forma anónima y agregada.\n\nUso de la información:\n\n· Contactarte y gestionar las citas solicitadas.\n· Proporcionar la atención terapéutica acordada.\n· Cumplir obligaciones legales y de facturación.\n\nNo vendemos, alquilamos ni compartimos tus datos con terceros, salvo cuando la ley lo exija o medie tu consentimiento expreso.', NULL::jsonb, 47),

    -- COOKIES
    ('legal', 'cookies_title', 'Política de Cookies', NULL::jsonb, 48),
    ('legal', 'cookies_updated', 'Última actualización: septiembre de 2026.', NULL::jsonb, 49),
    ('legal', 'cookies_intro', 'Esta página utiliza cookies propias y de terceros para garantizar el funcionamiento correcto del sitio y mejorar tu experiencia de navegación.', NULL::jsonb, 50),
    ('legal', 'cookies_content', E'Tipos de cookies que utilizamos:\n\n· Cookies técnicas (obligatorias): necesarias para el funcionamiento del sitio, la autenticación y la seguridad.\n· Cookies de preferencias: recuerdan tu elección de idioma y de tema (claro/oscuro).\n· Cookies de análisis: de forma anónima y agregada, nos ayudan a entender cómo se usa el sitio para mejorarlo.\n\nPuedes aceptarlas, rechazarlas o configurarlas desde el banner de cookies. El bloqueo de algunas cookies puede afectar el funcionamiento del sitio.', NULL::jsonb, 51),

    -- AVISO LEGAL
    ('legal', 'notice_title', 'Aviso Legal', NULL::jsonb, 52),
    ('legal', 'notice_updated', 'Última actualización: septiembre de 2026.', NULL::jsonb, 53),
    ('legal', 'notice_intro', 'En cumplimiento de la normativa aplicable, se informa de los datos identificativos del responsable del sitio y de las condiciones de uso del mismo.', NULL::jsonb, 54),
    ('legal', 'notice_content', E'Titular:\n\n· Razón social: CONTEXTO Psicología\n· Domicilio: Ciudad de Guatemala, Guatemala\n· Correo de contacto: contacto@contextopsicologia.com\n\nCondiciones de uso:\n\n· Este sitio tiene finalidad informativa y de contacto.\n· La información publicada no sustituye la atención profesional ni el diagnóstico clínico.\n· Está prohibida la reproducción total o parcial del contenido sin autorización expresa.\n\nEn caso de duda o reclamación, puedes escribirnos a contacto@contextopsicologia.com.', NULL::jsonb, 55)
) AS v(section, item_key, content, content_json, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.cms_website c WHERE c.section = v.section AND c.item_key = v.item_key);

-- ---------------------------------------------------------------------------
-- 2) RLS: appointments — el paciente ve solo sus propias citas
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
CREATE POLICY "Patients can view own appointments"
    ON public.appointments FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'patient')
        AND EXISTS (
            SELECT 1 FROM public.patients p
            WHERE p.id = appointments.patient_id
            AND p.owner_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- 3) RLS: booking_requests — el paciente autenticado puede leer sus propias
--    solicitudes (marca por correo o teléfono, no por rol de paciente).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own booking requests" ON public.booking_requests;
CREATE POLICY "Users can view own booking requests"
    ON public.booking_requests FOR SELECT
    TO authenticated
    USING (
        auth.jwt() -> 'email'::text IS NOT NULL
        AND (
            lower(auth.jwt() ->> 'email') = lower(email)
            OR (auth.jwt() ->> 'phone') = phone
        )
    );

-- ---------------------------------------------------------------------------
-- Verificación (opcional)
-- ---------------------------------------------------------------------------
-- SELECT section, item_key FROM public.cms_website WHERE section = 'legal' ORDER BY sort_order;
-- SELECT p.policyname, p.cmd FROM pg_policies p WHERE p.tablename = 'appointments' ORDER BY p.cmd;
-- SELECT p.policyname, p.cmd FROM pg_policies p WHERE p.tablename = 'booking_requests' ORDER BY p.cmd;