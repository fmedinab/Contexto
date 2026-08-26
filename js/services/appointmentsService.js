// js/services/appointmentsService.js
// Servicio de citas — CRUD real contra Supabase.
// Mapea entre el shape de UI (camelCase) y la DB (snake_case).

import { supabase } from '../../config/supabase.js';
import { authService } from './authService.js';

const TABLE = 'appointments';

const APPOINTMENT_TYPES = [
    'Terapia Individual',
    'Terapia de Pareja',
    'Terapia Familiar',
    'Evaluación',
    'Otra'
];

const STATUS_LABELS = {
    PENDIENTE: 'Pendiente',
    CONFIRMADA: 'Confirmada',
    EN_CURSO: 'En curso',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada'
};

const STATUS_COLORS = {
    PENDIENTE: 'amber',
    CONFIRMADA: 'green',
    EN_CURSO: 'blue',
    COMPLETADA: 'emerald',
    CANCELADA: 'red'
};

const VALID_TRANSITIONS = {
    PENDIENTE: ['CONFIRMADA', 'CANCELADA'],
    CONFIRMADA: ['EN_CURSO', 'CANCELADA'],
    EN_CURSO: ['COMPLETADA'],
    COMPLETADA: [],
    CANCELADA: []
};

/* ===== MAPPING UI ↔ DB ===== */

function dbRowToUI(row) {
    if (!row) return null;
    return {
        id: row.id,
        patientId: row.patient_id,
        ownerId: row.owner_id,
        title: row.title || '',
        appointmentDate: row.appointment_date || null,
        durationMinutes: row.duration_minutes || 50,
        type: row.type || 'Terapia Individual',
        status: row.status || 'PENDIENTE',
        notes: row.notes || '',
        location: row.location || '',
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

function uiToDBRow(data) {
    const row = {};
    if (data.patientId !== undefined) row.patient_id = data.patientId;
    if (data.title !== undefined) row.title = data.title;
    if (data.appointmentDate !== undefined) row.appointment_date = data.appointmentDate;
    if (data.durationMinutes !== undefined) row.duration_minutes = Number(data.durationMinutes) || 50;
    if (data.type !== undefined) row.type = data.type;
    if (data.status !== undefined) row.status = data.status;
    if (data.notes !== undefined) row.notes = data.notes || null;
    if (data.location !== undefined) row.location = data.location || null;
    return row;
}

/* ===== CONFLICT DETECTION ===== */

function _rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
}

/* ===== SERVICE ===== */

class AppointmentsService {
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

    async _getOwnerId() {
        const user = authService.getCurrentUser?.() || null;
        return user?.id || null;
    }

    /* ===== CRUD ===== */

    async getAll(opts = {}) {
        let query = supabase.from(TABLE).select('*, patients(full_name)', { count: 'exact' });

        const ownerId = await this._getOwnerId();
        if (ownerId) query = query.eq('owner_id', ownerId);

        if (opts.status && opts.status !== 'all') {
            query = query.eq('status', opts.status);
        }
        if (opts.type && opts.type !== 'all') {
            query = query.eq('type', opts.type);
        }
        if (opts.patientId) {
            query = query.eq('patient_id', opts.patientId);
        }
        if (opts.dateFrom) {
            query = query.gte('appointment_date', opts.dateFrom);
        }
        if (opts.dateTo) {
            query = query.lte('appointment_date', opts.dateTo);
        }
        if (opts.search) {
            const q = opts.search.trim();
            query = query.or(`title.ilike.%${q}%,notes.ilike.%${q}%`);
        }

        query = query.order('appointment_date', { ascending: true });

        const { data, error, count } = await query;

        if (error) return { data: [], error, count: 0 };

        const mapped = (data || []).map(row => {
            const appt = dbRowToUI(row);
            appt.patientName = row.patients?.full_name || '';
            return appt;
        });

        return { data: mapped, error: null, count: count || 0 };
    }

    async getById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*, patients(full_name, email, phone, therapy_type)')
            .eq('id', id)
            .single();

        if (error) return { data: null, error };
        const appt = dbRowToUI(data);
        appt.patientName = data.patients?.full_name || '';
        appt.patientEmail = data.patients?.email || '';
        appt.patientPhone = data.patients?.phone || '';
        appt.patientTherapyType = data.patients?.therapy_type || '';
        return { data: appt, error: null };
    }

    async create(data) {
        const row = uiToDBRow(data);
        row.owner_id = await this._getOwnerId();

        if (!row.patient_id) return { data: null, error: { message: 'El paciente es obligatorio' } };
        if (!row.appointment_date) return { data: null, error: { message: 'La fecha es obligatoria' } };
        if (!row.title) return { data: null, error: { message: 'El título es obligatorio' } };

        // Conflict check (client-side)
        const conflict = await this._checkConflict(row);
        if (conflict) return { data: null, error: { message: conflict } };

        const { data: created, error } = await supabase
            .from(TABLE)
            .insert(row)
            .select()
            .single();

        if (error) return { data: null, error };
        this._notify();
        return { data: dbRowToUI(created), error: null };
    }

    async update(id, data) {
        const row = uiToDBRow(data);

        // Conflict check (client-side, skip if status is CANCELADA)
        if (row.appointment_date || row.duration_minutes || row.patient_id) {
            const { data: existing } = await this.getById(id);
            if (existing) {
                const merged = {
                    patient_id: row.patient_id || existing.patientId,
                    appointment_date: row.appointment_date || existing.appointmentDate,
                    duration_minutes: row.duration_minutes || existing.durationMinutes,
                    status: row.status || existing.status
                };
                if (merged.status !== 'CANCELADA') {
                    const conflict = await this._checkConflict(merged, id);
                    if (conflict) return { data: null, error: { message: conflict } };
                }
            }
        }

        const { data: updated, error } = await supabase
            .from(TABLE)
            .update(row)
            .eq('id', id)
            .select()
            .single();

        if (error) return { data: null, error };
        this._notify();
        return { data: dbRowToUI(updated), error: null };
    }

    async delete(id) {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);

        if (error) return { error };
        this._notify();
        return { error: null };
    }

    async getStats() {
        const ownerId = await this._getOwnerId();
        let base = supabase.from(TABLE).select('*', { count: 'exact', head: true });
        if (ownerId) base = base.eq('owner_id', ownerId);

        const now = new Date().toISOString();

        const [totalRes, pendingRes, confirmedRes, inProgressRes, completedRes, cancelledRes, todayRes, upcomingRes] = await Promise.all([
            base,
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'PENDIENTE')
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'PENDIENTE'),
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'CONFIRMADA')
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'CONFIRMADA'),
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'EN_CURSO')
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'EN_CURSO'),
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'COMPLETADA')
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'COMPLETADA'),
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'CANCELADA')
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'CANCELADA'),
            (() => {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);
                let q = supabase.from(TABLE).select('*', { count: 'exact', head: true })
                    .gte('appointment_date', todayStart.toISOString())
                    .lte('appointment_date', todayEnd.toISOString());
                if (ownerId) q = q.eq('owner_id', ownerId);
                return q;
            })(),
            (() => {
                let q = supabase.from(TABLE).select('*', { count: 'exact', head: true })
                    .gte('appointment_date', now)
                    .in('status', ['PENDIENTE', 'CONFIRMADA']);
                if (ownerId) q = q.eq('owner_id', ownerId);
                return q;
            })()
        ]);

        return {
            data: {
                total: totalRes.count || 0,
                pending: pendingRes.count || 0,
                confirmed: confirmedRes.count || 0,
                inProgress: inProgressRes.count || 0,
                completed: completedRes.count || 0,
                cancelled: cancelledRes.count || 0,
                today: todayRes.count || 0,
                upcoming: upcomingRes.count || 0
            },
            error: null
        };
    }

    /* ===== CONFLICT DETECTION ===== */

    async _checkConflict(row, excludeId = null) {
        const startA = new Date(row.appointment_date);
        const durationMin = row.duration_minutes || 50;
        const endA = new Date(startA.getTime() + durationMin * 60000);

        let query = supabase.from(TABLE)
            .select('id, appointment_date, duration_minutes, patient_id')
            .eq('patient_id', row.patient_id)
            .not('status', 'eq', 'CANCELADA');

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data: existing } = await query;
        if (!existing || !existing.length) return null;

        for (const appt of existing) {
            const startB = new Date(appt.appointment_date);
            const endB = new Date(startB.getTime() + (appt.duration_minutes || 50) * 60000);
            if (_rangesOverlap(startA, endA, startB, endB)) {
                return 'Este paciente ya tiene una cita en ese horario.';
            }
        }

        return null;
    }

    /* ===== STATUS TRANSITIONS ===== */

    canTransition(currentStatus, newStatus) {
        return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
    }

    getValidTransitions(currentStatus) {
        return VALID_TRANSITIONS[currentStatus] || [];
    }
}

export const appointmentService = new AppointmentsService();
export { APPOINTMENT_TYPES, STATUS_LABELS, STATUS_COLORS, VALID_TRANSITIONS };
