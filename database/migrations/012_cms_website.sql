-- ============================================
-- Migración 012: CMS del sitio (contenido dinámico de la landing)
-- Schema: public
--
-- Toda la información de la página principal (excepto el menú) será
-- dinámica y editable desde un panel de administración. Esta tabla
-- guarda el contenido por sección.
--
-- Diseño:
--   section      -> nombre de la sección de la landing (hero, servicios,
--                   especialidades, nosotros, proceso, equipo, testimonios,
--                   faq, cta, agendar, footer)
--   item_key     -> clave única dentro de la sección (identifica el dato)
--   content      -> valor textual plano (p. ej. título, descripción)
--   content_json -> valor estructurado (cards, stats, pasos, ítems)
--   sort_order   -> orden de aparición dentro de la sección
--   is_published -> visibilidad
--
-- RLS:
--   SELECT -> público (anon + authenticated): la landing es pública
--   INSERT/UPDATE/DELETE -> solo admin
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================

CREATE TABLE IF NOT EXISTS public.cms_website (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section TEXT NOT NULL,
    item_key TEXT NOT NULL,
    content TEXT,
    content_json JSONB,
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (section, item_key)
);

COMMENT ON TABLE public.cms_website IS
    'Contenido dinámico de la página principal (landing), editable desde el panel admin.';
COMMENT ON COLUMN public.cms_website.section IS
    'Sección de la landing: hero, servicios, especialidades, nosotros, proceso, equipo, testimonios, faq, cta, agendar, footer.';
COMMENT ON COLUMN public.cms_website.content_json IS
    'Valores estructurados (arrays de cards, stats, pasos, ítems) permitidos cuando el contenido no es texto plano.';

CREATE INDEX IF NOT EXISTS idx_cms_website_section
    ON public.cms_website (section, sort_order);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE public.cms_website ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier visitante (la landing es pública).
DROP POLICY IF EXISTS "cms_website_public_select" ON public.cms_website;
CREATE POLICY "cms_website_public_select"
    ON public.cms_website FOR SELECT
    TO anon, authenticated
    USING (is_published = TRUE);

-- SELECT: el admin también ve el contenido no publicado.
DROP POLICY IF EXISTS "cms_website_admin_select_all" ON public.cms_website;
CREATE POLICY "cms_website_admin_select_all"
    ON public.cms_website FOR SELECT
    TO authenticated
    USING (public.is_user_admin(auth.uid()));

-- Gestión completa solo por admin.
DROP POLICY IF EXISTS "cms_website_admin_insert" ON public.cms_website;
CREATE POLICY "cms_website_admin_insert"
    ON public.cms_website FOR INSERT
    TO authenticated
    WITH CHECK (public.is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "cms_website_admin_update" ON public.cms_website;
CREATE POLICY "cms_website_admin_update"
    ON public.cms_website FOR UPDATE
    TO authenticated
    USING (public.is_user_admin(auth.uid()))
    WITH CHECK (public.is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "cms_website_admin_delete" ON public.cms_website;
CREATE POLICY "cms_website_admin_delete"
    ON public.cms_website FOR DELETE
    TO authenticated
    USING (public.is_user_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- SEED: contenido inicial de la landing (igual al mostrado actualmente).
-- Se usa cláusula para que al volver a correr no duplique ni rompa ediciones
-- ya guardadas por el admin (solo inserta si no existe la fila).
-- ---------------------------------------------------------------------------
INSERT INTO public.cms_website (section, item_key, content, content_json, sort_order)
SELECT * FROM (VALUES
    -- HERO
    ('hero', 'eyebrow', 'Centro de Ciencias Comportamentales', NULL::jsonb, 1),
    ('hero', 'title', 'Entender tu <em>contexto</em> es el primer paso para cambiar tu historia.', NULL::jsonb, 2),
    ('hero', 'description', 'En CONTEXTO Psicología integramos mente, conducta, emoción y entorno en un mismo proceso terapéutico, con un enfoque clínico basado en evidencia y una escucha genuinamente humana.', NULL::jsonb, 3),
    ('hero', 'cta_primary', 'Agendar primera consulta', NULL::jsonb, 4),
    ('hero', 'cta_secondary', 'Conocer nuestro enfoque', NULL::jsonb, 5),
    ('hero', 'stats', NULL,
        '[{"num":"12+","label":"Años de experiencia"},{"num":"1.800+","label":"Pacientes acompañados"},{"num":"6","label":"Especialistas certificados"},{"num":"96%","label":"Satisfacción reportada"}]'::jsonb, 6),

    -- TRUST STRIP
    ('trust', 'items', NULL,
        '["Terapia Cognitivo-Conductual","Ciencia Conductual Contextual","ACT","Evaluación Psicométrica","Atención Online y Presencial"]'::jsonb, 7),

    -- SERVICIOS
    ('servicios', 'eyebrow', 'Servicios', NULL::jsonb, 8),
    ('servicios', 'title', 'Programas terapéuticos a la medida de cada historia.', NULL::jsonb, 9),
    ('servicios', 'items', NULL, '[
        {"title":"Terapia Individual","desc":"Un espacio confidencial para trabajar ansiedad, estado de ánimo, autoestima y procesos de cambio personal.","icon":"user"},
        {"title":"Terapia de Pareja","desc":"Herramientas de comunicación y vínculo para atravesar crisis, reconstruir confianza o fortalecer la relación.","icon":"heart"},
        {"title":"Terapia Familiar","desc":"Abordamos dinámicas y roles familiares para mejorar la convivencia y fortalecer los vínculos entre generaciones.","icon":"users"},
        {"title":"Psicología Infantil y Adolescente","desc":"Acompañamos el desarrollo emocional y conductual de niñas, niños y adolescentes junto a sus familias.","icon":"child"},
        {"title":"Evaluación Psicológica","desc":"Pruebas psicométricas y evaluaciones clínicas para diagnóstico, orientación vocacional o procesos legales.","icon":"clipboard"},
        {"title":"Terapia Online","desc":"El mismo acompañamiento clínico, adaptado a un formato remoto seguro, flexible y igual de cercano.","icon":"video"}
    ]'::jsonb, 10),

    -- ESPECIALIDADES
    ('especialidades', 'eyebrow', 'Especialidades y enfoque', NULL::jsonb, 11),
    ('especialidades', 'title', 'Ciencia conductual contextual, aplicada con calidez humana.', NULL::jsonb, 12),
    ('especialidades', 'description', 'No tratamos síntomas aislados: entendemos a cada persona dentro de su historia, su entorno y sus vínculos. Nuestro modelo clínico se sostiene en cuatro pilares que trabajamos siempre en conjunto.', NULL::jsonb, 13),
    ('especialidades', 'items', NULL, '[
        {"title":"CONDUCTA","desc":"Lo que haces frente a cada situación: tus hábitos, respuestas y patrones de acción observables.","color":"#7E8F79"},
        {"title":"COGNICIÓN","desc":"Tus pensamientos, creencias e interpretaciones, y cómo influyen en tus decisiones diarias.","color":"#1D3348"},
        {"title":"EMOCIÓN","desc":"La forma en que sientes, reconoces y regulas tus emociones en distintos momentos de tu vida.","color":"#5F757C"},
        {"title":"CONTEXTO","desc":"El entorno, tus vínculos y las circunstancias reales que rodean cada comportamiento.","color":"#C7A15F"}
    ]'::jsonb, 14),

    -- SOBRE / NOSOTROS
    ('nosotros', 'eyebrow', 'Sobre CONTEXTO', NULL::jsonb, 15),
    ('nosotros', 'title', 'Un espacio profesional para comprender y transformar.', NULL::jsonb, 16),
    ('nosotros', 'paragraph1', 'CONTEXTO es un centro de ciencias comportamentales que entiende la salud mental como un proceso integral. Combinamos rigor clínico y tecnología para que cada persona reciba un acompañamiento ordenado, privado y humano.', NULL::jsonb, 17),
    ('nosotros', 'paragraph2', 'Nuestro enfoque respeta el ritmo de cada quien: escuchamos sin apuro, evaluamos con método y construimos un plan claro junto a ti, con objetivos concretos y seguimiento continuo.', NULL::jsonb, 18),
    ('nosotros', 'values', NULL, '[
        {"icon":"fa-shield-halved","label":"Privacidad y confidencialidad"},
        {"icon":"fa-heart-pulse","label":"Acompañamiento empático"},
        {"icon":"fa-microscope","label":"Enfoque basado en evidencia"},
        {"icon":"fa-leaf","label":"Bienestar sostenible"}
    ]'::jsonb, 19),
    ('nosotros', 'card_title', 'Tu bienestar comienza cuando decides escucharte.', NULL::jsonb, 20),
    ('nosotros', 'card_text', 'Cada proceso tiene su propio ritmo. Por eso diseñamos un espacio donde la tecnología sostiene tu atención clínica, sin reemplazar el vínculo con tu profesional.', NULL::jsonb, 21),
    ('nosotros', 'card_meta', 'Atención presencial y online · Horarios flexibles', NULL::jsonb, 22),

    -- PROCESO
    ('proceso', 'eyebrow', 'Cómo trabajamos', NULL::jsonb, 23),
    ('proceso', 'title', 'Un proceso claro, de principio a fin.', NULL::jsonb, 24),
    ('proceso', 'items', NULL, '[
        {"num":"01","title":"Primer contacto","desc":"Agendas tu cita por el canal que prefieras y te asignamos al especialista más adecuado para tu motivo de consulta."},
        {"num":"02","title":"Evaluación inicial","desc":"Escuchamos tu historia sin apuro y hacemos una lectura clínica de tu situación actual, sin diagnósticos apresurados."},
        {"num":"03","title":"Plan terapéutico","desc":"Definimos objetivos concretos y medibles junto a ti, y elegimos el enfoque que mejor se adapta a tu contexto."},
        {"num":"04","title":"Acompañamiento","desc":"Damos seguimiento continuo a tu progreso, ajustando el proceso cuantas veces sea necesario."}
    ]'::jsonb, 25),

    -- EQUIPO
    ('equipo', 'eyebrow', 'Equipo', NULL::jsonb, 26),
    ('equipo', 'title', 'Especialistas que te acompañan con evidencia y empatía.', NULL::jsonb, 27),
    ('equipo', 'items', NULL, '[
        {"name":"Dra. Camila Torres","role":"Directora clínica","desc":"Terapia Cognitivo-Conductual · 14 años de experiencia clínica.","initials":"CT","color":"#6366f1"},
        {"name":"Dr. Andrés Rivas","role":"Terapia de pareja y familia","desc":"Especialista en vínculos y comunicación · 10 años de experiencia.","initials":"AR","color":"#06b6d4"},
        {"name":"Dra. Valentina Ruiz","role":"Psicología infantil","desc":"Desarrollo emocional en niñas, niños y adolescentes · 9 años.","initials":"VR","color":"#8b5cf6"},
        {"name":"Dr. Mateo Salas","role":"Evaluación psicométrica","desc":"Diagnóstico clínico y orientación vocacional · 8 años.","initials":"MS","color":"#a78bfa"}
    ]'::jsonb, 28),

    -- TESTIMONIOS
    ('testimonios', 'eyebrow', 'Testimonios', NULL::jsonb, 29),
    ('testimonios', 'title', 'Historias reales de procesos reales.', NULL::jsonb, 30),
    ('testimonios', 'items', NULL, '[
        {"name":"María J.","meta":"Terapia individual · 8 meses","text":"Llegué sin entender por qué me sentía así todo el tiempo. Hoy tengo herramientas concretas y, sobre todo, entiendo mi propio contexto.","initials":"MJ","color":"#6366f1"},
        {"name":"Diego & Paula","meta":"Terapia de pareja · 1 año","text":"Como pareja llegamos a un punto muerto. El acompañamiento fue claro, honesto y sin juicios. Hoy nos comunicamos de otra forma.","initials":"DP","color":"#8b5cf6"},
        {"name":"Rocío L.","meta":"Psicología infantil · 6 meses","text":"Mi hijo dejó de ver la terapia como un castigo. El equipo supo explicarle todo con paciencia y eso cambió todo el proceso.","initials":"RL","color":"#a78bfa"}
    ]'::jsonb, 31),

    -- FAQ
    ('faq', 'eyebrow', 'Preguntas frecuentes', NULL::jsonb, 32),
    ('faq', 'title', 'Todo lo que necesitas saber antes de empezar.', NULL::jsonb, 33),
    ('faq', 'items', NULL, '[
        {"q":"¿Cómo es la primera sesión?","a":"Es una conversación abierta de aproximadamente 50 minutos donde conocemos tu historia y motivo de consulta, sin ningún compromiso de continuar. Al final te explicamos cómo vemos tu situación y qué opciones de acompañamiento tiene sentido explorar."},
        {"q":"¿Trabajan con obras sociales o seguros?","a":"Contamos con convenios con algunas obras sociales y entregamos factura para reintegro con la mayoría de los seguros privados. Escríbenos con el nombre de tu cobertura y te confirmamos antes de tu primera cita."},
        {"q":"¿Ofrecen sesiones online?","a":"Sí, todos nuestros especialistas ofrecen modalidad online mediante videollamada segura, con el mismo formato y duración que una sesión presencial."},
        {"q":"¿Cuánto dura un proceso terapéutico?","a":"Depende de cada historia y objetivo. Algunos procesos duran pocos meses y son focalizados en una situación puntual; otros son de acompañamiento más extendido. Esto se define y se revisa junto a tu especialista."},
        {"q":"¿Atienden niños y adolescentes?","a":"Sí, contamos con especialistas en psicología infantil y adolescente, que trabajan tanto con los niños como con madres, padres o cuidadores según cada caso."}
    ]'::jsonb, 34),

    -- CTA FINAL
    ('cta', 'title', 'Da el primer paso hacia tu bienestar.', NULL::jsonb, 35),
    ('cta', 'description', 'Agenda tu primera consulta hoy y empieza a entender tu contexto.', NULL::jsonb, 36),
    ('cta', 'button_primary', 'Agendar cita', NULL::jsonb, 37),
    ('cta', 'button_secondary', 'Reservar mi sesión', NULL::jsonb, 38),

    -- AGENDAR
    ('agendar', 'eyebrow', 'Agenda tu cita', NULL::jsonb, 39),
    ('agendar', 'title', 'Reserva tu sesión en menos de un minuto.', NULL::jsonb, 40),

    -- FOOTER / CONTACTO
    ('footer', 'description', 'Centro de Ciencias Comportamentales. Atención presencial y online.', NULL::jsonb, 41),
    ('footer', 'contact_email', 'contacto@contextopsicologia.com', NULL::jsonb, 42),
    ('footer', 'contact_phone', '+502 1234 5678', NULL::jsonb, 43)
) AS v(section, item_key, content, content_json, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.cms_website c WHERE c.section = v.section AND c.item_key = v.item_key);

-- ---------------------------------------------------------------------------
-- Verificación (opcional)
-- ---------------------------------------------------------------------------
-- SELECT section, item_key, sort_order FROM public.cms_website ORDER BY sort_order;
-- SELECT p.policyname, p.cmd, p.roles FROM pg_policies p WHERE p.tablename = 'cms_website' ORDER BY p.cmd;
