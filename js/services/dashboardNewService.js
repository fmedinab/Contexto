// js/services/dashboardNewService.js
// Servicio de datos del dashboard nuevo — Mente Serena.
// Datos mock centralizados, preparados para reemplazo por API.

import { authService } from './authService.js';

const MOCK_CLINICIAN = {
    name: 'Dra. Valeria',
    role: 'Psicóloga',
    avatarInitials: 'VM'
};

const MOCK_SUMMARY = {
    todayAppointments: 4,
    newEvaluations: 1,
    pendingTasks: 2
};

const MOCK_PATIENTS = [
    { id: 'P-1001', name: 'Mariana González', age: 28, therapyType: 'Terapia Individual', nextAppointment: 'Hoy · 10:00 AM', status: 'active', notes: 'Progreso sostenido en el manejo de ansiedad anticipatoria.' },
    { id: 'P-1002', name: 'Andrés Pérez', age: 35, therapyType: 'Terapia de Pareja', nextAppointment: 'Hoy · 11:30 AM', status: 'active', notes: 'Sesión enfocada en comunicación asertiva.' },
    { id: 'P-1003', name: 'Sofía Ramírez', age: 22, therapyType: 'Terapia Individual', nextAppointment: 'Hoy · 03:00 PM', status: 'active', notes: 'Segunda sesión de reestructuración cognitiva.' },
    { id: 'P-1004', name: 'Luis Martínez', age: 40, therapyType: 'Evaluación Inicial', nextAppointment: 'Hoy · 04:30 PM', status: 'new', notes: 'Primera consulta, motivo: estrés laboral.' }
];

const MOCK_APPOINTMENTS = [
    { time: '10:00 AM', patient: 'Mariana G.', type: 'Terapia Individual', status: 'confirmed' },
    { time: '11:30 AM', patient: 'Andrés P.', type: 'Terapia de Pareja', status: 'confirmed' },
    { time: '03:00 PM', patient: 'Sofía R.', type: 'Terapia Individual', status: 'in-progress' },
    { time: '04:30 PM', patient: 'Luis M.', type: 'Evaluación Inicial', status: 'pending' }
];

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

const MOCK_NOTES = [
    { patient: 'Mariana González', date: '14 Mayo 2025', sessionType: 'Terapia Individual', summary: 'Se trabajó reestructuración cognitiva sobre pensamientos catastróficos relacionados al trabajo.' },
    { patient: 'Andrés Pérez', date: '13 Mayo 2025', sessionType: 'Terapia de Pareja', summary: 'Ejercicio de escucha activa. Ambos miembros reportan mejor disposición al diálogo.' },
    { patient: 'Sofía Ramírez', date: '12 Mayo 2025', sessionType: 'Terapia Individual', summary: 'Exposición gradual a situaciones sociales. Ansiedad reportada: 5/10.' },
    { patient: 'Luis Martínez', date: '10 Mayo 2025', sessionType: 'Evaluación Inicial', summary: 'Entrevista clínica inicial. Se plantea plan de evaluación de estrés laboral.' }
];

const MOCK_REPORTS = {
    indicators: [
        { label: 'Pacientes activos', value: 24, delta: '+3' },
        { label: 'Sesiones este mes', value: 86, delta: '+12' },
        { label: 'Tasa de asistencia', value: '94%', delta: '+2%' },
        { label: 'Evaluaciones completadas', value: 12, delta: '+4' }
    ],
    monthlySessions: [12, 15, 14, 18, 20, 22, 19, 24, 21, 26, 23, 27]
};

const MOCK_MESSAGES = [
    { patient: 'Mariana González', preview: 'Hola doctora, quería confirmar mi cita de hoy a las 10:00 AM, ¿sigue en pie?', time: '09:10 AM', unread: true },
    { patient: 'Andrés Pérez', preview: '¿Podemos cambiar el horario de mañana? Tengo un inconveniente laboral.', time: '08:45 AM', unread: true },
    { patient: 'Sofía Ramírez', preview: 'Gracias por la sesión de ayer, me sentí mucho mejor.', time: 'Ayer', unread: false },
    { patient: 'Luis Martínez', preview: 'Le envío el formulario que me pidió completar antes de la consulta.', time: 'Ayer', unread: false }
];

const MOCK_EMOTIONAL_STATE = {
    label: 'Ambiente positivo',
    percentage: 78,
    trend: 'up',
    points: [22, 30, 26, 40, 35, 50, 46, 60, 55, 68, 64, 78]
};

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

export function getClinicianProfile() {
    const user = authService.getCurrentUser();
    if (user?.user_metadata) {
        return {
            name: user.user_metadata.first_name || MOCK_CLINICIAN.name,
            role: MOCK_CLINICIAN.role,
            avatarInitials: MOCK_CLINICIAN.avatarInitials
        };
    }
    return MOCK_CLINICIAN;
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

export function getSummary() { return MOCK_SUMMARY; }
export function getPatients() { return MOCK_PATIENTS; }
export function getAppointments() { return MOCK_APPOINTMENTS; }
export function getEvaluations() { return MOCK_EVALUATIONS; }
export function getTasks() { return MOCK_TASKS; }
export function getNotes() { return MOCK_NOTES; }
export function getReports() { return MOCK_REPORTS; }
export function getMessages() { return MOCK_MESSAGES; }
export function getEmotionalState() { return MOCK_EMOTIONAL_STATE; }
export function getQuote() { return MOCK_QUOTE; }

export function formatDate(date) {
    const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${DAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTime(date) {
    const pad = (n) => n < 10 ? '0' + n : String(n);
    let h = date.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return `${pad(h)}:${pad(date.getMinutes())} ${ampm}`;
}

export function getInitials(name) {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
