// js/services/mockData.js
// Helpers y datos curados para la app — CONTEXTO.
// Perfil, saludo, resumen y estado emocional se calculan desde Supabase.
// NOTA: los datos ficticios de pacientes (PHI simulada) fueron eliminados.
// Las páginas usan los servicios reales (patientsService, etc.).

import { authService } from './authService.js';
import { supabase } from '../../config/supabase.js';

// ========== FRASES ==========
const MOCK_QUOTE = {
    text: 'La mente es como un paracaídas, solo funciona si la abres.',
    author: 'Albert Einstein'
};

const MOCK_GREETING_PHRASES = [
    'Cada pequeño progreso cuenta.',
    'La constancia construye caminos.',
    'Escuchar es el primer paso para comprender.',
    'El bienestar se construye día a día.',
    'Cada sesión es una oportunidad de crecimiento.',
    'La paciencia es una forma de sabiduría.',
    'Comprender a otros comienza por comprenderse.',
    'El acompañamiento profesional marca la diferencia.'
];

// ========== HELPERS ==========
function getInitials(name) {
    const clean = (name || '').trim();
    if (!clean) return '?';
    return clean.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatAppointmentDate(isoStr) {
    if (!isoStr) return 'Sin cita programada';
    const d = new Date(isoStr);
    const now = new Date();
    const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (isToday) return `Hoy · ${time}`;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${time}`;
}

function formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDate(date) {
    const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${DAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTime(date) {
    const pad = (n) => n < 10 ? '0' + n : String(n);
    let h = date.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return `${pad(h)}:${pad(date.getMinutes())} ${ampm}`;
}

// ========== EXPORTS — DASHBOARD ==========
export function getClinicianProfile() {
    const user = authService.getCurrentUser();
    const email = user?.email || '';
    const meta = user?.user_metadata || {};

    let name = meta.full_name || meta.first_name || '';
    if (!name && email) {
        name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    if (!name) name = 'Usuario';

    const role = meta.role || 'Profesional';

    const parts = name.trim().split(/\s+/);
    const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();

    return { name, role, avatarInitials: initials };
}

export function getGreeting() {
    const hour = new Date().getHours();
    let saludo;
    if (hour < 12) saludo = 'Buenos días';
    else if (hour < 19) saludo = 'Buenas tardes';
    else saludo = 'Buenas noches';

    const phraseIndex = new Date().getDate() % MOCK_GREETING_PHRASES.length;
    const profile = getClinicianProfile();
    return {
        text: `${saludo}, ${profile.name}`,
        phrase: MOCK_GREETING_PHRASES[phraseIndex]
    };
}

export async function getSummary() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const [apptsRes, evalsRes, tasksRes] = await Promise.all([
        supabase.from('appointments').select('id', { count: 'exact', head: true })
            .gte('appointment_date', todayStart).lt('appointment_date', todayEnd),
        supabase.from('assessments').select('id', { count: 'exact', head: true })
            .eq('status', 'PENDIENTE'),
        supabase.from('therapeutic_tasks').select('id', { count: 'exact', head: true })
            .in('status', ['PENDIENTE', 'EN_PROGRESO']),
    ]);

    return {
        todayAppointments: apptsRes.count || 0,
        newEvaluations: evalsRes.count || 0,
        pendingTasks: tasksRes.count || 0,
    };
}

// Módulo de mensajes aún no implementado: se devuelve lista vacía.
export function getMessages() {
    return [];
}

export async function getEmotionalState() {
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // 1 query en vez de 12 (una por mes) y el conteo se agrega en cliente.
    const { data, error } = await supabase
        .from('assessments')
        .select('created_at')
        .gte('created_at', windowStart.toISOString());

    if (error) throw error;

    const rows = data || [];
    const points = [];
    const labels = [];
    for (let i = 11; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        const count = rows.filter(r => {
            const t = new Date(r.created_at);
            return t >= start && t < end;
        }).length;
        points.push(count);
        labels.push(start.toLocaleDateString('es-ES', { month: 'short' }));
    }
    const current = points[points.length - 1];
    const prev = points[points.length - 2] || 0;
    const pct = current > 0 ? Math.min(Math.round((current / Math.max(...points, 1)) * 100), 100) : 0;
    const trend = current >= prev ? 'up' : 'down';
    const label = pct >= 70 ? 'Ambiente positivo' : pct >= 40 ? 'Estable' : 'Requiere atención';
    return { label, percentage: pct, trend, points, labels };
}

export function getQuote() { return MOCK_QUOTE; }

// ========== EXPORTS — UTILIDADES COMUNES ==========
export { getInitials, formatAppointmentDate, formatDateShort, formatDate, formatTime };