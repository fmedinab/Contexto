// js/services/patientService.js
// Servicio de pacientes — Mente Serena.
// Datos mock centralizados, preparados para reemplazo por API Supabase.

import { authService } from './authService.js';

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

export function getInitials(name) {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function formatPhone(phone) {
    return phone;
}

export function formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatAppointmentDate(isoStr) {
    if (!isoStr) return 'Sin cita programada';
    const d = new Date(isoStr);
    const now = new Date();
    const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (isToday) return `Hoy · ${time}`;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${time}`;
}
