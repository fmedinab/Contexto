// js/services/mockData.js
// Helpers y datos curados para la app — CONTEXTO.
// Perfil, saludo, resumen y estado emocional se calculan desde Supabase.

import { authService } from './authService.js';
import { supabase } from '../../config/supabase.js';

// ========== CLINICIAN ==========
const MOCK_CLINICIAN = {
    name: 'Dra. Valeria',
    role: 'Psicóloga',
    avatarInitials: 'VM'
};

// ========== PACIENTES (datos completos) ==========
const MOCK_PATIENTS = [
    {
        id: 'P-1001', name: 'Mariana González', email: 'mariana.gonzalez@email.com',
        phone: '+52 55 1234 5678', age: 28, gender: 'Femenino',
        therapyType: 'Terapia Individual', status: 'active',
        nextAppointment: '2025-05-14T10:00:00', startDate: '2025-01-10',
        notes: 'Progreso sostenido en el manejo de ansiedad anticipatoria.',
        diagnosis: 'Trastorno de Ansiedad Generalizada',
        emergencyContact: 'Roberto González — +52 55 9876 5432'
    },
    {
        id: 'P-1002', name: 'Andrés Pérez', email: 'andres.perez@email.com',
        phone: '+52 55 2345 6789', age: 35, gender: 'Masculino',
        therapyType: 'Terapia de Pareja', status: 'active',
        nextAppointment: '2025-05-14T11:30:00', startDate: '2025-02-05',
        notes: 'Sesión enfocada en comunicación asertiva.',
        diagnosis: 'Dificultades de comunicación en pareja',
        emergencyContact: 'Laura Pérez — +52 55 8765 4321'
    },
    {
        id: 'P-1003', name: 'Sofía Ramírez', email: 'sofia.ramirez@email.com',
        phone: '+52 55 3456 7890', age: 22, gender: 'Femenino',
        therapyType: 'Terapia Individual', status: 'active',
        nextAppointment: '2025-05-14T15:00:00', startDate: '2025-03-01',
        notes: 'Segunda sesión de reestructuración cognitiva.',
        diagnosis: 'Fobia Social',
        emergencyContact: 'Carlos Ramírez — +52 55 7654 3210'
    },
    {
        id: 'P-1004', name: 'Luis Martínez', email: 'luis.martinez@email.com',
        phone: '+52 55 4567 8901', age: 40, gender: 'Masculino',
        therapyType: 'Evaluación Inicial', status: 'new',
        nextAppointment: '2025-05-14T16:30:00', startDate: '2025-05-10',
        notes: 'Primera consulta, motivo: estrés laboral.',
        diagnosis: 'Pendiente de evaluación',
        emergencyContact: 'Ana Martínez — +52 55 6543 2109'
    },
    {
        id: 'P-1005', name: 'Camila Herrera', email: 'camila.herrera@email.com',
        phone: '+52 55 5678 9012', age: 31, gender: 'Femenino',
        therapyType: 'Terapia Individual', status: 'inactive',
        nextAppointment: null, startDate: '2024-09-15',
        notes: 'Pausa terapéutica solicitada por la paciente.',
        diagnosis: 'Depresión Leve',
        emergencyContact: 'Pedro Herrera — +52 55 5432 1098'
    },
    {
        id: 'P-1006', name: 'Diego Morales', email: 'diego.morales@email.com',
        phone: '+52 55 6789 0123', age: 27, gender: 'Masculino',
        therapyType: 'Terapia Individual', status: 'active',
        nextAppointment: '2025-05-15T09:00:00', startDate: '2025-04-01',
        notes: 'Trabajo en autoestima y asertividad.',
        diagnosis: 'Trastorno de Ansiedad Social',
        emergencyContact: 'María Morales — +52 55 4321 0987'
    },
    {
        id: 'P-1007', name: 'Valentina Cruz', email: 'valentina.cruz@email.com',
        phone: '+52 55 7890 1234', age: 45, gender: 'Femenino',
        therapyType: 'Terapia de Pareja', status: 'active',
        nextAppointment: '2025-05-15T11:00:00', startDate: '2025-02-20',
        notes: 'Mejora significativa en patrones de comunicación.',
        diagnosis: 'Conflictos de pareja',
        emergencyContact: 'Jorge Cruz — +52 55 3210 9876'
    },
    {
        id: 'P-1008', name: 'Mateo Reyes', email: 'mateo.reyes@email.com',
        phone: '+52 55 8901 2345', age: 19, gender: 'Masculino',
        therapyType: 'Evaluación Inicial', status: 'new',
        nextAppointment: '2025-05-16T10:00:00', startDate: '2025-05-12',
        notes: 'Derivado por orientación vocacional.',
        diagnosis: 'Pendiente de evaluación',
        emergencyContact: 'Lucía Reyes — +52 55 2109 8765'
    }
];

// Subset para dashboard (pacientes con cita hoy)
const DASHBOARD_PATIENTS = MOCK_PATIENTS.filter(p => p.nextAppointment && p.nextAppointment.startsWith('2025-05-14'))
    .map(p => ({
        id: p.id,
        name: p.name,
        age: p.age,
        therapyType: p.therapyType,
        nextAppointment: formatAppointmentDate(p.nextAppointment),
        status: p.status,
        notes: p.notes
    }));

// ========== CITAS (para dashboard) ==========
const MOCK_APPOINTMENTS = [
    { time: '10:00 AM', patient: 'Mariana G.', type: 'Terapia Individual', status: 'confirmed' },
    { time: '11:30 AM', patient: 'Andrés P.', type: 'Terapia de Pareja', status: 'confirmed' },
    { time: '03:00 PM', patient: 'Sofía R.', type: 'Terapia Individual', status: 'in-progress' },
    { time: '04:30 PM', patient: 'Luis M.', type: 'Evaluación Inicial', status: 'pending' }
];

// ========== EVALUACIONES ==========
const MOCK_EVALUATIONS = {
    pending: [
        { name: 'Inventario de Ansiedad de Beck (BAI)', patient: 'Mariana González', date: '14 Mayo 2025' },
        { name: 'Escala de Depresión de Beck (BDI-II)', patient: 'Andrés Pérez', date: '14 Mayo 2025' },
        { name: 'Cuestionario de Estrés Percibido (PSS)', patient: 'Luis Martínez', date: '15 Mayo 2025' }
    ],
    inProgress: [
        { name: 'Escala de Autoestima de Rosenberg', patient: 'Sofía Ramírez', date: '13 Mayo 2025' },
        { name: 'Test de Inteligencia Emocional (TMMS-24)', patient: 'Andrés Pérez', date: '12 Mayo 2025' }
    ],
    completed: [
        { name: 'Inventario de Ansiedad de Beck (BAI)', patient: 'Sofía Ramírez', date: '02 Mayo 2025' },
        { name: 'Escala de Depresión de Beck (BDI-II)', patient: 'Mariana González', date: '28 Abril 2025' },
        { name: 'Cuestionario de Estrés Percibido (PSS)', patient: 'Andrés Pérez', date: '25 Abril 2025' },
        { name: 'Test de Personalidad NEO-FFI', patient: 'Luis Martínez', date: '20 Abril 2025' },
        { name: 'Escala de Ansiedad de Hamilton', patient: 'Sofía Ramírez', date: '15 Abril 2025' },
        { name: 'Inventario de Ansiedad de Beck (BAI)', patient: 'Andrés Pérez', date: '10 Abril 2025' }
    ]
};

// ========== TAREAS TERAPÉUTICAS ==========
const MOCK_TASKS = {
    pending: [
        { patient: 'Mariana González', description: 'Registro diario de pensamientos automáticos', due: '16 Mayo 2025', progress: 0, priority: 'Alta' },
        { patient: 'Luis Martínez', description: 'Cuestionario de hábitos de sueño', due: '17 Mayo 2025', progress: 0, priority: 'Media' }
    ],
    inProgress: [
        { patient: 'Andrés Pérez', description: 'Ejercicios de comunicación asertiva en pareja', due: '18 Mayo 2025', progress: 45, priority: 'Alta' },
        { patient: 'Sofía Ramírez', description: 'Diario de exposición gradual', due: '20 Mayo 2025', progress: 70, priority: 'Media' }
    ],
    completed: [
        { patient: 'Mariana González', description: 'Técnica de respiración diafragmática', due: '10 Mayo 2025', progress: 100, priority: 'Baja' }
    ]
};

// ========== NOTAS CLÍNICAS ==========
const MOCK_NOTES = [
    { patient: 'Mariana González', date: '14 Mayo 2025', sessionType: 'Terapia Individual', summary: 'Se trabajó reestructuración cognitiva sobre pensamientos catastróficos relacionados al trabajo.' },
    { patient: 'Andrés Pérez', date: '13 Mayo 2025', sessionType: 'Terapia de Pareja', summary: 'Ejercicio de escucha activa. Ambos miembros reportan mejor disposición al diálogo.' },
    { patient: 'Sofía Ramírez', date: '12 Mayo 2025', sessionType: 'Terapia Individual', summary: 'Exposición gradual a situaciones sociales. Ansiedad reportada: 5/10.' },
    { patient: 'Luis Martínez', date: '10 Mayo 2025', sessionType: 'Evaluación Inicial', summary: 'Entrevista clínica inicial. Se plantea plan de evaluación de estrés laboral.' }
];

// ========== REPORTES ==========
const MOCK_REPORTS = {
    indicators: [
        { label: 'Pacientes activos', value: 24, delta: '+3' },
        { label: 'Sesiones este mes', value: 86, delta: '+12' },
        { label: 'Tasa de asistencia', value: '94%', delta: '+2%' },
        { label: 'Evaluaciones completadas', value: 12, delta: '+4' }
    ],
    monthlySessions: [12, 15, 14, 18, 20, 22, 19, 24, 21, 26, 23, 27]
};

// ========== MENSAJES ==========
const MOCK_MESSAGES = [
    { patient: 'Mariana González', preview: 'Hola doctora, quería confirmar mi cita de hoy a las 10:00 AM, ¿sigue en pie?', time: '09:10 AM', unread: true },
    { patient: 'Andrés Pérez', preview: '¿Podemos cambiar el horario de mañana? Tengo un inconveniente laboral.', time: '08:45 AM', unread: true },
    { patient: 'Sofía Ramírez', preview: 'Gracias por la sesión de ayer, me sentí mucho mejor.', time: 'Ayer', unread: false },
    { patient: 'Luis Martínez', preview: 'Le envío el formulario que me pidió completar antes de la consulta.', time: 'Ayer', unread: false }
];

// ========== ESTADO EMOCIONAL ==========
const MOCK_EMOTIONAL_STATE = {
    label: 'Ambiente positivo',
    percentage: 78,
    trend: 'up',
    points: [22, 30, 26, 40, 35, 50, 46, 60, 55, 68, 64, 78]
};

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

const MOCK_SUMMARY = {
    todayAppointments: 4,
    newEvaluations: 1,
    pendingTasks: 2
};

// ========== CATÁLOGOS ==========
const THERAPY_TYPES = [
    'Terapia Individual',
    'Terapia de Pareja',
    'Terapia Familiar',
    'Evaluación Inicial',
    'Terapia de Grupo'
];

const STATUS_LABELS = {
    active: 'Activo',
    inactive: 'Inactivo',
    new: 'Nuevo'
};

// ========== HELPERS ==========
function getInitials(name) {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
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

// ========== EXPORTS — PACIENTES (para patients.js) ==========
export function getPatients() {
    return MOCK_PATIENTS;
}

export function getPatientById(id) {
    return MOCK_PATIENTS.find(p => p.id === id) || null;
}

export function searchPatients(query) {
    const q = query.toLowerCase().trim();
    if (!q) return MOCK_PATIENTS;
    return MOCK_PATIENTS.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.diagnosis.toLowerCase().includes(q)
    );
}

export function filterByStatus(status) {
    if (!status || status === 'all') return MOCK_PATIENTS;
    return MOCK_PATIENTS.filter(p => p.status === status);
}

export function getPatientStats() {
    const total = MOCK_PATIENTS.length;
    const active = MOCK_PATIENTS.filter(p => p.status === 'active').length;
    const inactive = MOCK_PATIENTS.filter(p => p.status === 'inactive').length;
    const newPatients = MOCK_PATIENTS.filter(p => p.status === 'new').length;
    return { total, active, inactive, new: newPatients };
}

export function getTherapyTypes() {
    return THERAPY_TYPES;
}

export function getStatusLabel(status) {
    return STATUS_LABELS[status] || status;
}

// ========== EXPORTS — DASHBOARD (para dashboard-new.js) ==========
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
export function getDashboardPatients() { return DASHBOARD_PATIENTS; }
export function getAppointments() { return MOCK_APPOINTMENTS; }
export function getEvaluations() { return MOCK_EVALUATIONS; }
export function getTasks() { return MOCK_TASKS; }
export function getNotes() { return MOCK_NOTES; }
export function getReports() { return MOCK_REPORTS; }
export function getMessages() { return MOCK_MESSAGES; }
export async function getEmotionalState() {
    const now = new Date();
    const points = [];
    const labels = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = d.toISOString().slice(0, 10);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
        const { count } = await supabase.from('assessments').select('id', { count: 'exact', head: true })
            .gte('created_at', start).lte('created_at', end + 'T23:59:59Z');
        points.push(count || 0);
        labels.push(d.toLocaleDateString('es-ES', { month: 'short' }));
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