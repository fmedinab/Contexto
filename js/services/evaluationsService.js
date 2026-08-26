// js/services/evaluationsService.js
// Servicio de evaluaciones/assessments — CRUD real contra Supabase.

import { supabase } from '../../config/supabase.js';
import { authService } from './authService.js';
import { patientService } from './patientsService.js';

const TABLE = 'assessments';

const INSTRUMENTS = [
    { name: 'Inventario de Ansiedad de Beck (BAI)', code: 'BAI', category: 'Ansiedad' },
    { name: 'Escala de Depresión de Beck (BDI-II)', code: 'BDI-II', category: 'Depresión' },
    { name: 'Cuestionario de Estrés Percibido (PSS)', code: 'PSS', category: 'Estrés' },
    { name: 'Escala de Autoestima de Rosenberg', code: 'ROSENBERG', category: 'Autoestima' },
    { name: 'Test de Inteligencia Emocional (TMMS-24)', code: 'TMMS-24', category: 'Inteligencia Emocional' },
    { name: 'Test de Personalidad NEO-FFI', code: 'NEO-FFI', category: 'Personalidad' },
    { name: 'Escala de Ansiedad de Hamilton', code: 'HAM-A', category: 'Ansiedad' }
];

const STATUS_LABELS = {
    PENDIENTE: 'Pendiente',
    EN_PROGRESO: 'En progreso',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada'
};

const STATUS_COLORS = {
    PENDIENTE: 'amber',
    EN_PROGRESO: 'blue',
    COMPLETADA: 'emerald',
    CANCELADA: 'red'
};

const VALID_TRANSITIONS = {
    PENDIENTE: ['EN_PROGRESO', 'CANCELADA'],
    EN_PROGRESO: ['COMPLETADA', 'CANCELADA'],
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
        patientName: '',
        instrumentName: row.instrument_name || '',
        instrumentCode: row.instrument_code || '',
        instrumentCategory: row.instrument_category || '',
        status: row.status || 'PENDIENTE',
        assessmentDate: row.assessment_date || null,
        notes: row.notes || '',
        resultScore: row.result_score ?? null,
        resultInterpretation: row.result_interpretation || '',
        startedAt: row.started_at || null,
        completedAt: row.completed_at || null,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

function uiToDBRow(data) {
    const row = {};
    if (data.patientId !== undefined) row.patient_id = data.patientId;
    if (data.instrumentName !== undefined) row.instrument_name = data.instrumentName;
    if (data.instrumentCode !== undefined) row.instrument_code = data.instrumentCode || null;
    if (data.instrumentCategory !== undefined) row.instrument_category = data.instrumentCategory || null;
    if (data.status !== undefined) row.status = data.status;
    if (data.assessmentDate !== undefined) row.assessment_date = data.assessmentDate;
    if (data.notes !== undefined) row.notes = data.notes || null;
    if (data.resultScore !== undefined) row.result_score = data.resultScore != null ? Number(data.resultScore) : null;
    if (data.resultInterpretation !== undefined) row.result_interpretation = data.resultInterpretation || null;
    if (data.startedAt !== undefined) row.started_at = data.startedAt || null;
    if (data.completedAt !== undefined) row.completed_at = data.completedAt || null;
    return row;
}

/* ===== SERVICE ===== */

class EvaluationsService {
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
        if (opts.instrument && opts.instrument !== 'all') {
            query = query.eq('instrument_name', opts.instrument);
        }
        if (opts.patientId) {
            query = query.eq('patient_id', opts.patientId);
        }
        if (opts.search) {
            const q = opts.search.trim();
            query = query.or(`instrument_name.ilike.%${q}%,notes.ilike.%${q}%`);
        }

        query = query.order('assessment_date', { ascending: false });

        const { data, error, count } = await query;

        if (error) return { data: [], error, count: 0 };

        let patientMap = {};
        try {
            const { data: patients } = await patientService.getAll();
            (patients || []).forEach(p => { patientMap[p.id] = p.name; });
        } catch { /* continue without patient names */ }

        const mapped = (data || []).map(row => {
            const item = dbRowToUI(row);
            item.patientName = patientMap[row.patient_id] || '';
            return item;
        });

        return { data: mapped, error: null, count: count || 0 };
    }

    async getById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error) return { data: null, error };

        const item = dbRowToUI(data);

        try {
            const { data: patient } = await supabase
                .from('patients')
                .select('full_name, age, therapy_type')
                .eq('id', data.patient_id)
                .single();
            item.patientName = patient?.full_name || '';
            item.patientAge = patient?.age ?? null;
            item.patientTherapyType = patient?.therapy_type || '';
        } catch { /* continue without patient details */ }

        return { data: item, error: null };
    }

    async create(data) {
        const row = uiToDBRow(data);
        row.owner_id = await this._getOwnerId();

        if (!row.patient_id) return { data: null, error: { message: 'El paciente es obligatorio' } };
        if (!row.instrument_name) return { data: null, error: { message: 'El instrumento es obligatorio' } };
        if (!row.assessment_date) return { data: null, error: { message: 'La fecha es obligatoria' } };

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

    canTransition(currentStatus, newStatus) {
        return (VALID_TRANSITIONS[currentStatus] || []).includes(newStatus);
    }

    getValidTransitions(currentStatus) {
        return VALID_TRANSITIONS[currentStatus] || [];
    }

    async getStats() {
        const ownerId = await this._getOwnerId();
        let base = supabase.from(TABLE).select('*', { count: 'exact', head: true });
        if (ownerId) base = base.eq('owner_id', ownerId);

        const [totalRes, pendingRes, inProgressRes, completedRes] = await Promise.all([
            base,
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'PENDIENTE')
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'PENDIENTE'),
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'EN_PROGRESO')
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'EN_PROGRESO'),
            ownerId
                ? supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'COMPLETADA')
                : supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'COMPLETADA')
        ]);

        return {
            data: {
                total: totalRes.count || 0,
                pending: pendingRes.count || 0,
                inProgress: inProgressRes.count || 0,
                completed: completedRes.count || 0
            },
            error: null
        };
    }
}

export const evaluationService = new EvaluationsService();
export { INSTRUMENTS, STATUS_LABELS, STATUS_COLORS, VALID_TRANSITIONS };
