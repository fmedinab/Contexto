// js/services/cmsService.js
// Servicio de contenido dinámico de la página principal (landing).
// Persiste en la tabla cms_website con RLS:
//   - SELECT  público (anon/authenticated) — la landing es pública
//   - INSERT/UPDATE/DELETE solo admin
//
// La landing consume el contenido vía getLandingContent(), que devuelve
// un objeto agrupado por sección listo para renderizar. Si la tabla está
// vacía o la BD no responde, se usa DEFAULT_CONTENT (los valores actuales)
// para que el sitio nunca quede en blanco.

import { supabase } from '../../config/supabase.js';

const TABLE = 'cms_website';

// Contenido por defecto (fallback). Mismos valores que muestra la landing hoy.
const DEFAULT_CONTENT = {
    hero: {
        eyebrow: 'Centro de Ciencias Comportamentales',
        title: 'Entender tu <em>contexto</em> es el primer paso para cambiar tu historia.',
        description: 'En CONTEXTO Psicología integramos mente, conducta, emoción y entorno en un mismo proceso terapéutico, con un enfoque clínico basado en evidencia y una escucha genuinamente humana.',
        cta_primary: 'Agendar primera consulta',
        cta_secondary: 'Conocer nuestro enfoque',
        stats: [
            { num: '12+', label: 'Años de experiencia' },
            { num: '1.800+', label: 'Pacientes acompañados' },
            { num: '6', label: 'Especialistas certificados' },
            { num: '96%', label: 'Satisfacción reportada' }
        ]
    },
    trust: {
        items: ['Terapia Cognitivo-Conductual', 'Ciencia Conductual Contextual', 'ACT', 'Evaluación Psicométrica', 'Atención Online y Presencial']
    },
    servicios: {
        eyebrow: 'Servicios',
        title: 'Programas terapéuticos a la medida de cada historia.',
        items: [
            { title: 'Terapia Individual', desc: 'Un espacio confidencial para trabajar ansiedad, estado de ánimo, autoestima y procesos de cambio personal.', icon: 'user' },
            { title: 'Terapia de Pareja', desc: 'Herramientas de comunicación y vínculo para atravesar crisis, reconstruir confianza o fortalecer la relación.', icon: 'heart' },
            { title: 'Terapia Familiar', desc: 'Abordamos dinámicas y roles familiares para mejorar la convivencia y fortalecer los vínculos entre generaciones.', icon: 'users' },
            { title: 'Psicología Infantil y Adolescente', desc: 'Acompañamos el desarrollo emocional y conductual de niñas, niños y adolescentes junto a sus familias.', icon: 'child' },
            { title: 'Evaluación Psicológica', desc: 'Pruebas psicométricas y evaluaciones clínicas para diagnóstico, orientación vocacional o procesos legales.', icon: 'clipboard' },
            { title: 'Terapia Online', desc: 'El mismo acompañamiento clínico, adaptado a un formato remoto seguro, flexible y igual de cercano.', icon: 'video' }
        ]
    },
    especialidades: {
        eyebrow: 'Especialidades y enfoque',
        title: 'Ciencia conductual contextual, aplicada con calidez humana.',
        description: 'No tratamos síntomas aislados: entendemos a cada persona dentro de su historia, su entorno y sus vínculos. Nuestro modelo clínico se sostiene en cuatro pilares que trabajamos siempre en conjunto.',
        items: [
            { title: 'CONDUCTA', desc: 'Lo que haces frente a cada situación: tus hábitos, respuestas y patrones de acción observables.', color: '#7E8F79' },
            { title: 'COGNICIÓN', desc: 'Tus pensamientos, creencias e interpretaciones, y cómo influyen en tus decisiones diarias.', color: '#1D3348' },
            { title: 'EMOCIÓN', desc: 'La forma en que sientes, reconoces y regulas tus emociones en distintos momentos de tu vida.', color: '#5F757C' },
            { title: 'CONTEXTO', desc: 'El entorno, tus vínculos y las circunstancias reales que rodean cada comportamiento.', color: '#C7A15F' }
        ]
    },
    nosotros: {
        eyebrow: 'Sobre CONTEXTO',
        title: 'Un espacio profesional para comprender y transformar.',
        paragraph1: 'CONTEXTO es un centro de ciencias comportamentales que entiende la salud mental como un proceso integral. Combinamos rigor clínico y tecnología para que cada persona reciba un acompañamiento ordenado, privado y humano.',
        paragraph2: 'Nuestro enfoque respeta el ritmo de cada quien: escuchamos sin apuro, evaluamos con método y construimos un plan claro junto a ti, con objetivos concretos y seguimiento continuo.',
        values: [
            { icon: 'fa-shield-halved', label: 'Privacidad y confidencialidad' },
            { icon: 'fa-heart-pulse', label: 'Acompañamiento empático' },
            { icon: 'fa-microscope', label: 'Enfoque basado en evidencia' },
            { icon: 'fa-leaf', label: 'Bienestar sostenible' }
        ],
        card_title: 'Tu bienestar comienza cuando decides escucharte.',
        card_text: 'Cada proceso tiene su propio ritmo. Por eso diseñamos un espacio donde la tecnología sostiene tu atención clínica, sin reemplazar el vínculo con tu profesional.',
        card_meta: 'Atención presencial y online · Horarios flexibles'
    },
    proceso: {
        eyebrow: 'Cómo trabajamos',
        title: 'Un proceso claro, de principio a fin.',
        items: [
            { num: '01', title: 'Primer contacto', desc: 'Agendas tu cita por el canal que prefieras y te asignamos al especialista más adecuado para tu motivo de consulta.' },
            { num: '02', title: 'Evaluación inicial', desc: 'Escuchamos tu historia sin apuro y hacemos una lectura clínica de tu situación actual, sin diagnósticos apresurados.' },
            { num: '03', title: 'Plan terapéutico', desc: 'Definimos objetivos concretos y medibles junto a ti, y elegimos el enfoque que mejor se adapta a tu contexto.' },
            { num: '04', title: 'Acompañamiento', desc: 'Damos seguimiento continuo a tu progreso, ajustando el proceso cuantas veces sea necesario.' }
        ]
    },
    equipo: {
        eyebrow: 'Equipo',
        title: 'Especialistas que te acompañan con evidencia y empatía.',
        items: [
            { name: 'Dra. Camila Torres', role: 'Directora clínica', desc: 'Terapia Cognitivo-Conductual · 14 años de experiencia clínica.', initials: 'CT', color: '#6366f1' },
            { name: 'Dr. Andrés Rivas', role: 'Terapia de pareja y familia', desc: 'Especialista en vínculos y comunicación · 10 años de experiencia.', initials: 'AR', color: '#06b6d4' },
            { name: 'Dra. Valentina Ruiz', role: 'Psicología infantil', desc: 'Desarrollo emocional en niñas, niños y adolescentes · 9 años.', initials: 'VR', color: '#8b5cf6' },
            { name: 'Dr. Mateo Salas', role: 'Evaluación psicométrica', desc: 'Diagnóstico clínico y orientación vocacional · 8 años.', initials: 'MS', color: '#a78bfa' }
        ]
    },
    testimonios: {
        eyebrow: 'Testimonios',
        title: 'Historias reales de procesos reales.',
        items: [
            { name: 'María J.', meta: 'Terapia individual · 8 meses', text: 'Llegué sin entender por qué me sentía así todo el tiempo. Hoy tengo herramientas concretas y, sobre todo, entiendo mi propio contexto.', initials: 'MJ', color: '#6366f1' },
            { name: 'Diego & Paula', meta: 'Terapia de pareja · 1 año', text: 'Como pareja llegamos a un punto muerto. El acompañamiento fue claro, honesto y sin juicios. Hoy nos comunicamos de otra forma.', initials: 'DP', color: '#8b5cf6' },
            { name: 'Rocío L.', meta: 'Psicología infantil · 6 meses', text: 'Mi hijo dejó de ver la terapia como un castigo. El equipo supo explicarle todo con paciencia y eso cambió todo el proceso.', initials: 'RL', color: '#a78bfa' }
        ]
    },
    faq: {
        eyebrow: 'Preguntas frecuentes',
        title: 'Todo lo que necesitas saber antes de empezar.',
        items: [
            { q: '¿Cómo es la primera sesión?', a: 'Es una conversación abierta de aproximadamente 50 minutos donde conocemos tu historia y motivo de consulta, sin ningún compromiso de continuar. Al final te explicamos cómo vemos tu situación y qué opciones de acompañamiento tiene sentido explorar.' },
            { q: '¿Trabajan con obras sociales o seguros?', a: 'Contamos con convenios con algunas obras sociales y entregamos factura para reintegro con la mayoría de los seguros privados. Escríbenos con el nombre de tu cobertura y te confirmamos antes de tu primera cita.' },
            { q: '¿Ofrecen sesiones online?', a: 'Sí, todos nuestros especialistas ofrecen modalidad online mediante videollamada segura, con el mismo formato y duración que una sesión presencial.' },
            { q: '¿Cuánto dura un proceso terapéutico?', a: 'Depende de cada historia y objetivo. Algunos procesos duran pocos meses y son focalizados en una situación puntual; otros son de acompañamiento más extendido. Esto se define y se revisa junto a tu especialista.' },
            { q: '¿Atienden niños y adolescentes?', a: 'Sí, contamos con especialistas en psicología infantil y adolescente, que trabajan tanto con los niños como con madres, padres o cuidadores según cada caso.' }
        ]
    },
    cta: {
        title: 'Da el primer paso hacia tu bienestar.',
        description: 'Agenda tu primera consulta hoy y empieza a entender tu contexto.',
        button_primary: 'Agendar cita',
        button_secondary: 'Reservar mi sesión'
    },
    agendar: {
        eyebrow: 'Agenda tu cita',
        title: 'Reserva tu sesión en menos de un minuto.'
    },
    footer: {
        description: 'Centro de Ciencias Comportamentales. Atención presencial y online.',
        contact_email: 'contacto@contextopsicologia.com',
        contact_phone: '+502 1234 5678'
    },
    legal: {
        privacy_title: 'Política de Privacidad',
        privacy_updated: 'Última actualización: septiembre de 2026.',
        privacy_intro: 'En CONTEXTO Psicología (Centro de Ciencias Comportamentales) nos comprometemos a proteger tu privacidad y a tratar tus datos personales con absoluta confidencialidad.',
        privacy_content: 'Información que recopilamos:\n· Datos de contacto que proporcionas al reservar una cita.\n· Información clínica únicamente en el marco de la relación terapéutica.\n· Datos de uso técnico del sitio de forma anónima y agregada.\n\nUso de la información:\n· Contactarte y gestionar las citas solicitadas.\n· Proporcionar la atención terapéutica acordada.\n· Cumplir obligaciones legales y de facturación.\n\nNo vendemos ni compartimos tus datos con terceros, salvo cuando la ley lo exija o medie tu consentimiento expreso.',
        cookies_title: 'Política de Cookies',
        cookies_updated: 'Última actualización: septiembre de 2026.',
        cookies_intro: 'Esta página utiliza cookies propias y de terceros para garantizar el funcionamiento correcto del sitio y mejorar tu experiencia de navegación.',
        cookies_content: 'Tipos de cookies que utilizamos:\n· Técnicas (obligatorias): necesarias para el funcionamiento, autenticación y seguridad.\n· De preferencias: recuerdan tu idioma y tema (claro/oscuro).\n· De análisis: de forma anónima y agregada, para mejorar el sitio.\n\nPuedes aceptarlas, rechazarlas o configurarlas desde el banner. El bloqueo de algunas cookies puede afectar el funcionamiento.',
        notice_title: 'Aviso Legal',
        notice_updated: 'Última actualización: septiembre de 2026.',
        notice_intro: 'En cumplimiento de la normativa aplicable, se informa de los datos identificativos del responsable del sitio y de las condiciones de uso del mismo.',
        notice_content: 'Titular:\n\n· Razón social: CONTEXTO Psicología\n· Domicilio: Ciudad de Guatemala, Guatemala\n· Correo de contacto: contacto@contextopsicologia.com\n\nCondiciones de uso:\n· Este sitio tiene finalidad informativa y de contacto.\n· La información publicada no sustituye la atención profesional ni el diagnóstico clínico.\n· Prohibida la reproducción total o parcial del contenido sin autorización expresa.\n\nPara dudas o reclamaciones: contacto@contextopsicologia.com.'
    }
};

// Mapeo de secciones que usan un array en la clave `items` frente a las que
// tienen ítems bajo otra clave.
const ARRAY_KEYS = ['stats', 'items', 'values'];

// Convierte la lista plana de filas DB en un objeto agrupado por sección.
// Prefiere el valor de BD; si una clave no existe en BD usa el default.
function rowsToContent(rows) {
    const content = JSON.parse(JSON.stringify(DEFAULT_CONTENT));
    rows.forEach(row => {
        const section = content[row.section];
        if (!section) return;
        const val = row.content_json !== null && row.content_json !== undefined
            ? row.content_json
            : row.content;
        if (val !== null && val !== undefined) {
            section[row.item_key] = val;
        }
    });
    return content;
}

class CmsService {
    /* ===== LECTURA PÚBLICA (landing) ===== */

    // Devuelve el contenido completo agrupado por sección, con fallback.
    async getLandingContent() {
        try {
            const { data, error } = await supabase
                .from(TABLE)
                .select('section, item_key, content, content_json')
                .eq('is_published', true)
                .order('sort_order', { ascending: true });

            if (error) {
                console.warn('cms_website read failed, using defaults:', error.message);
                return this._clone(DEFAULT_CONTENT);
            }
            if (!data || !data.length) return this._clone(DEFAULT_CONTENT);

            return rowsToContent(data);
        } catch (e) {
            console.warn('cms_website read error, using defaults:', e.message);
            return this._clone(DEFAULT_CONTENT);
        }
    }

    /* ===== LECTURA ADMIN (incluye borradores) ===== */

    async getAllAdmin() {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) return { data: [], error };
        return { data: data || [], error: null };
    }

    async getBySectionAdmin(section) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('section', section)
            .order('sort_order', { ascending: true });

        if (error) return { data: [], error };
        return { data: data || [], error: null };
    }

    /* ===== ESCRITURA ADMIN ===== */

    // Upsert de una fila identificada por (section, item_key).
    async saveItem({ section, item_key, content, content_json, sort_order, is_published }) {
        const { data, error } = await supabase
            .from(TABLE)
            .upsert({
                section,
                item_key,
                content: content ?? null,
                content_json: content_json ?? null,
                sort_order: sort_order ?? 0,
                is_published: is_published ?? true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'section,item_key' })
            .select()
            .single();

        if (error) return { data: null, error };
        return { data, error: null };
    }

    async removeItem(id) {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);
        return { error };
    }

    async setPublished(id, is_published) {
        const { data, error } = await supabase
            .from(TABLE)
            .update({ is_published, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) return { data: null, error };
        return { data, error: null };
    }

    /* ===== HELPERS ===== */
    _clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    getDefaultContent() {
        return this._clone(DEFAULT_CONTENT);
    }
}

export const cmsService = new CmsService();
export { DEFAULT_CONTENT, ARRAY_KEYS };
