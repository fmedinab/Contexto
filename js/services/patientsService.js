// js/services/patientsService.js
// Servicio de pacientes — CRUD real contra Supabase.
// Mapea entre el shape de UI (camelCase, firstName/lastName) y la DB (snake_case, full_name).

import { supabase } from '../../config/supabase.js';
import { authService } from './authService.js';

const TABLE = 'patients';

const THERAPY_TYPES = [
    'Terapia Individual',
    'Terapia de Pareja',
    'Terapia Familiar',
    'Evaluación Inicial',
    'Seguimiento'
];

const STATUS_LABELS = {
    active: 'Activo',
    inactive: 'Inactivo',
    new: 'Nuevo'
};

/* ===== MAPPING UI ↔ DB ===== */

function dbRowToUI(row) {
    if (!row) return null;
    const fullName = row.full_name || '';
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    return {
        id: row.id,
        firstName,
        lastName,
        name: fullName,
        email: row.email || '',
        phone: row.phone || '',
        age: row.age ?? null,
        gender: row.gender || '',
        therapyType: row.therapy_type || 'Terapia Individual',
        status: row.status || 'active',
        diagnosis: row.diagnosis || '',
        notes: row.notes || '',
        emergencyContact: row.emergency_contact || '',
        startDate: row.start_date || null,
        nextAppointment: row.next_appointment || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        owner_id: row.owner_id
    };
}

function uiToDBRow(data) {
    const row = {};
    if (data.firstName !== undefined || data.lastName !== undefined) {
        row.full_name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    } else if (data.full_name !== undefined) {
        row.full_name = data.full_name;
    }
    if (data.email !== undefined) row.email = data.email || null;
    if (data.phone !== undefined) row.phone = data.phone || null;
    if (data.age !== undefined) row.age = data.age != null ? Number(data.age) : null;
    if (data.gender !== undefined) row.gender = data.gender || null;
    if (data.therapyType !== undefined) row.therapy_type = data.therapyType;
    if (data.status !== undefined) row.status = data.status;
    if (data.diagnosis !== undefined) row.diagnosis = data.diagnosis || null;
    if (data.notes !== undefined) row.notes = data.notes || null;
    if (data.emergencyContact !== undefined) row.emergency_contact = data.emergencyContact || null;
    if (data.startDate !== undefined) row.start_date = data.startDate || null;
    if (data.nextAppointment !== undefined) row.next_appointment = data.nextAppointment || null;
    return row;
}

function _calculateAge(birthDateStr) {
    if (!birthDateStr) return null;
    const today = new Date();
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
}

/* ===== SERVICE ===== */

class PatientsService {
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
        let query = supabase.from(TABLE).select('*', { count: 'exact' });

        const ownerId = await this._getOwnerId();
        if (ownerId) query = query.eq('owner_id', ownerId);

        if (opts.status && opts.status !== 'all') {
            query = query.eq('status', opts.status);
        }
        if (opts.therapyType && opts.therapyType !== 'all') {
            query = query.eq('therapy_type', opts.therapyType);
        }
        if (opts.search) {
            const q = opts.search.trim();
            query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error, count } = await query;

        if (error) return { data: [], error, count: 0 };
        return { data: (data || []).map(dbRowToUI), error: null, count: count || 0 };
    }

    async getById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error) return { data: null, error };
        return { data: dbRowToUI(data), error: null };
    }

    async create(data) {
        const row = uiToDBRow(data);
        row.owner_id = await this._getOwnerId();

        if (!row.full_name) return { data: null, error: { message: 'Nombre es obligatorio' } };
        if (data.birthDate) row.age = _calculateAge(data.birthDate);

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
        if (data.birthDate) row.age = _calculateAge(data.birthDate);

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

        const [totalRes, activeRes, inactiveRes, newRes, upcomingRes] = await Promise.all([
            base,
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'active')
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'active'),
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'inactive')
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'new')
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'new'),
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).not('next_appointment', 'is', null)
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).not('next_appointment', 'is', null)
        ]);

        return {
            data: {
                total: totalRes.count || 0,
                active: activeRes.count || 0,
                inactive: inactiveRes.count || 0,
                new: newRes.count || 0,
                upcomingAppointments: upcomingRes.count || 0
            },
            error: null
        };
    }
}

export const patientService = new PatientsService();
export { THERAPY_TYPES, STATUS_LABELS };
