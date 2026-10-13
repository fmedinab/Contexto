// js/services/notificationsService.js
// Agrega en un solo lugar las señales que el consultorio necesita mirar:
// solicitudes nuevas, citas de hoy, tareas vencidas y recordatorios sin
// enviar.
//
// Por qué existe: la campana del header solo hacía `toast("no tienes
// notificaciones")`. No había forma de ver el estado real del día sin
// abrir cuatro módulos distintos.
//
// IMPORTANTE — la campana NO es una bandeja de entrada con "leído/no
// leído". No hay tabla de notificaciones en la base de datos y no se
// agrega una: las señales se derivan de las tablas reales, así que
// siempre reflejan el estado actual sin estado que sincronizar. Marcar
// como "leído" no tendría sentido porque no hay nada que leer después.
// Lo que sí hace la campana es llevarte al lugar donde se resuelve.

import { supabase } from '../../config/supabase.js';

class NotificationsService {
    /* Devuelve las señales agrupadas por prioridad.
       { items: [...], unreadCount, error } */
    async getAll() {
        const items = [];
        const errors = [];

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

        // Todas las señales son independientes: si una falla, las otras
        // siguen apareciendo. Un panel de notificaciones que se queda
        // vacío entero por un fallo de red no sirve de nada.
        const results = await Promise.allSettled([
            this._pendingBookings(),
            this._todayAppointments(todayStart, todayEnd),
            this._overdueTasks(),
            this._pendingReminders(),
        ]);

        results.forEach((r, i) => {
            if (r.status === 'fulfilled') {
                const list = r.value;
                if (list.error) errors.push(list.error);
                items.push(...list.items);
            } else {
                console.error(`[Notifications] la consulta ${i} lanzó excepción:`, r.reason);
            }
        });

        // Prioridad: lo que requiere acción hoy va primero.
        const order = { alta: 0, media: 1, baja: 2 };
        items.sort((a, b) => (order[a.priority] - order[b.priority]) || (order[b.urgency] - order[a.urgency]));

        return { items, unreadCount: items.length, error: errors.length ? errors[0] : null };
    }

    // ── Solicitudes de cita pendientes ─────────────────────────
    async _pendingBookings() {
        const { data, error } = await supabase
            .from('booking_requests')
            .select('id, full_name, service_type, preferred_date, preferred_time, created_at')
            .eq('status', 'PENDIENTE')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) return { items: [], error };

        const items = (data || []).map(r => ({
            id: `booking-${r.id}`,
            kind: 'booking',
            title: `Solicitud de ${r.full_name || 'sin nombre'}`,
            detail: [r.service_type, r.preferred_time].filter(Boolean).join(' · ') || 'Sin detalle',
            date: r.preferred_date,
            ago: r.created_at,
            priority: 'alta',
            urgency: this._isSoon(r.preferred_date) ? 2 : 1,
            action: { modal: 'bookings', label: 'Ver solicitudes' },
        }));

        return { items, error: null };
    }

    // ── Citas de hoy ──────────────────────────────────────────
    async _todayAppointments(todayStart, todayEnd) {
        const { data, error } = await supabase
            .from('appointments')
            .select('id, appointment_date, status, title, patients(full_name)')
            .gte('appointment_date', todayStart)
            .lt('appointment_date', todayEnd)
            .not('status', 'in', '(CANCELADA,NO_ASISTIO)')
            .order('appointment_date', { ascending: true });

        if (error) return { items: [], error };

        const items = (data || []).map(a => ({
            id: `appt-${a.id}`,
            kind: 'appointment',
            title: `${this._hhmm(a.appointment_date)} · ${a.patients?.full_name || 'Paciente'}`,
            detail: a.title || 'Cita programada',
            date: a.appointment_date,
            priority: 'alta',
            urgency: a.status === 'CONFIRMADA' ? 2 : 1,
            action: { modal: 'appointments', label: 'Abrir agenda' },
        }));

        return { items, error: null };
    }

    // ── Tareas terapéuticas vencidas ──────────────────────────
    async _overdueTasks() {
        const { data, error } = await supabase
            .from('therapeutic_tasks')
            .select('id, title, due_date, status, patients(full_name)')
            .in('status', ['PENDIENTE', 'EN_PROGRESO'])
            .lt('due_date', new Date().toISOString().slice(0, 10))
            .order('due_date', { ascending: true })
            .limit(20);

        if (error) return { items: [], error };

        const items = (data || []).map(t => ({
            id: `task-${t.id}`,
            kind: 'task',
            title: t.title || 'Tarea terapéutica',
            detail: `${t.patients?.full_name || 'Paciente'} · vencía ${this._fecha(t.due_date)}`,
            date: t.due_date,
            priority: 'media',
            urgency: 1,
            action: { modal: 'tasks', label: 'Ver tareas' },
        }));

        return { items, error: null };
    }

    // ── Recordatorios de WhatsApp sin enviar ───────────────────
    async _pendingReminders() {
        const { data, error } = await supabase
            .from('reminders')
            .select('id, patient_name, for_date, status')
            .eq('status', 'PENDIENTE')
            .order('for_date', { ascending: true })
            .limit(20);

        if (error) return { items: [], error };

        const items = (data || []).map(r => ({
            id: `reminder-${r.id}`,
            kind: 'reminder',
            title: `Recordatorio para ${r.patient_name || 'paciente'}`,
            detail: `Para el ${this._fecha(r.for_date)} · sin enviar por WhatsApp`,
            date: r.for_date,
            priority: 'baja',
            urgency: 1,
            action: { modal: 'reminders', label: 'Abrir cola' },
        }));

        return { items, error: null };
    }

    // ── helpers ───────────────────────────────────────────────
    _hhmm(iso) {
        if (!iso) return '--:--';
        const d = new Date(iso);
        return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    _fecha(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    }

    // ¿La fecha es hoy o mañana? Sirve para ordenar lo urgente arriba.
    _isSoon(dateStr) {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return false;
        const diff = d.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
        return diff >= 0 && diff <= 86400000;
    }
}

export const notificationsService = new NotificationsService();