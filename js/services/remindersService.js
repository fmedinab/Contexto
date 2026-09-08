// js/services/remindersService.js
// Servicio de la cola de recordatorios de WhatsApp (sin API).
// La tabla reminders la alimenta prepare_reminders() (job diario en Supabase).
// El clínico solo abre el enlace wa.me con el mensaje ya armado y lo envía.

import { supabase } from '../../config/supabase.js';

const TABLE = 'reminders';

const REMINDER_STATUS_LABELS = {
    PENDIENTE: 'Por enviar',
    ENVIADO: 'Enviado',
    SALTADO: 'Saltado'
};

function dbRowToUI(row) {
    if (!row) return null;
    return {
        id: row.id,
        appointmentId: row.appointment_id,
        bookingId: row.booking_id,
        patientId: row.patient_id,
        patientName: row.patient_name || '',
        phone: row.phone || '',
        serviceType: row.service_type || 'Sesión',
        appointmentTime: row.appointment_time || null,
        remindFor: row.remind_for,
        forDate: row.for_date,
        reminderText: row.reminder_text || '',
        waUrl: row.wa_url || '',
        status: row.status || 'PENDIENTE',
        createdAt: row.created_at,
        sentAt: row.sent_at
    };
}

function uiToDBRow(data) {
    const row = {};
    if (data.status !== undefined) row.status = data.status;
    if (data.sentAt !== undefined) row.sent_at = data.sentAt;
    return row;
}

class RemindersService {
    constructor() {
        this._listeners = [];
    }

    _notify() {
        this._listeners.forEach(fn => {
            try { fn(); } catch { /* noop */ }
        });
    }

    onChange(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(l => l !== fn);
        };
    }

    /* SELECT solo clínicos (RLS). */
    async getAll(opts = {}) {
        let query = supabase.from(TABLE).select('*');

        if (opts.status && opts.status !== 'all') {
            query = query.eq('status', opts.status);
        }
        if (opts.limit) {
            query = query.limit(opts.limit);
        }

        query = query.order('remind_for', { ascending: true }).order('for_date', { ascending: true });

        const { data, error } = await query;
        if (error) return { data: [], error };
        return { data: (data || []).map(dbRowToUI), error: null };
    }

    async countPending() {
        const { data, error, count } = await supabase
            .from(TABLE)
            .select('id', { count: 'exact', head: true })
            .eq('status', 'PENDIENTE');
        return { count: count || 0, error };
    }

    async markSent(id) {
        const { data: updated, error } = await supabase
            .from(TABLE)
            .update({ status: 'ENVIADO', sent_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) return { data: null, error };
        this._notify();
        return { data: dbRowToUI(updated), error: null };
    }

    async skip(id) {
        const { data: updated, error } = await supabase
            .from(TABLE)
            .update({ status: 'SALTADO' })
            .eq('id', id)
            .select()
            .single();
        if (error) return { data: null, error };
        this._notify();
        return { data: dbRowToUI(updated), error: null };
    }

    /* Ejecuta la función que prepara la cola (RPC, solo authenticated). */
    async runPrepare() {
        const { data, error } = await supabase.rpc('prepare_reminders');
        if (error) return { data: null, error };
        this._notify();
        return { data, error: null };
    }
}

export const remindersService = new RemindersService();
export { REMINDER_STATUS_LABELS };