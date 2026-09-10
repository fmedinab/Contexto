// js/services/patientPortalService.js
// Consultas para el portal del paciente (dashboard unificado /dashboard).
//
// El acceso a cada fila lo garantiza RLS del lado de Supabase
// (políticas "view own" en patients, appointments, assessments,
// therapeutic_tasks, clinical_notes y booking_requests):
// este servicio solo añade ordenamiento, límites y filtros no sensibles.
//
// Es importante NO filtrar por owner_id aquí: para un paciente el propietario
// es el terapeuta; el aislamiento de filas lo resuelve RLS.

import { supabase } from '../../config/supabase.js';
import { authService } from './authService.js';

class PatientPortalService {
    // Perfil del paciente vinculado a la cuenta (patients.owner_id = auth.uid()).
    async getMyRecord() {
        if (!authService.getCurrentUser()) {
            return { data: null, error: { message: 'Sesión no iniciada' } };
        }
        return supabase
            .from('patients')
            .select('*')
            .eq('owner_id', authService.getCurrentUser().id)
            .maybeSingle();
    }

    // Próximas citas (de hoy en adelante y sin cancelar).
    async getMyUpcomingAppointments(limit = 5) {
        const nowISO = new Date().toISOString();
        return supabase
            .from('appointments')
            .select('*')
            .gte('appointment_date', nowISO)
            .neq('status', 'CANCELADA')
            .order('appointment_date', { ascending: true })
            .limit(limit);
    }

    // Historial de citas (completadas o canceladas, más recientes primero).
    async getMyPastAppointments(limit = 5) {
        return supabase
            .from('appointments')
            .select('*')
            .in('status', ['COMPLETADA', 'CANCELADA'])
            .order('appointment_date', { ascending: false })
            .limit(limit);
    }

    // Evaluaciones registradas del paciente.
    async getMyAssessments(limit = 5) {
        return supabase
            .from('assessments')
            .select('*')
            .order('assessment_date', { ascending: false })
            .limit(limit);
    }

    // Tareas terapéuticas asignadas al paciente.
    async getMyTasks(limit = 10) {
        return supabase
            .from('therapeutic_tasks')
            .select('*')
            .order('due_date', { ascending: true, nullsFirst: true })
            .limit(limit);
    }

    // Solicitudes de cita propias (marca por email/teléfono vía RLS).
    async getMyBookingRequests(limit = 5) {
        return supabase
            .from('booking_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
    }
}

export const patientPortalService = new PatientPortalService();