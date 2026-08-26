// js/services/patientsService.js
// Servicio de pacientes — Consultas Supabase.

import { supabase } from '../../config/supabase.js';

class PatientsService {
    constructor() {
        this.table = 'patients';
    }

    /**
     * Obtener todos los pacientes.
     * @param {Object} opts - Opciones de filtrado.
     * @param {string} opts.status - Filtrar por estado (active, inactive, new).
     * @param {string} opts.search - Buscar por nombre o email.
     * @param {number} opts.limit - Límite de resultados.
     * @param {number} opts.offset - Offset para paginación.
     * @returns {Promise<{data: Array, error: Object|null, count: number}>}
     */
    async getAll(opts = {}) {
        let query = supabase
            .from(this.table)
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (opts.status && opts.status !== 'all') {
            query = query.eq('status', opts.status);
        }

        if (opts.search) {
            query = query.or(`full_name.ilike.%${opts.search}%,email.ilike.%${opts.search}%`);
        }

        if (opts.limit) {
            query = query.range(opts.offset || 0, (opts.offset || 0) + opts.limit - 1);
        }

        const { data, error, count } = await query;
        return { data: data || [], error, count: count || 0 };
    }

    /**
     * Obtener un paciente por ID.
     */
    async getById(id) {
        const { data, error } = await supabase
            .from(this.table)
            .select('*')
            .eq('id', id)
            .single();

        return { data, error };
    }

    /**
     * Crear un nuevo paciente.
     */
    async create(patientData) {
        const { data, error } = await supabase
            .from(this.table)
            .insert({
                full_name: patientData.full_name,
                email: patientData.email || null,
                phone: patientData.phone || null,
                age: patientData.age || null,
                gender: patientData.gender || null,
                therapy_type: patientData.therapy_type || 'Terapia Individual',
                status: patientData.status || 'active',
                diagnosis: patientData.diagnosis || null,
                notes: patientData.notes || null,
                emergency_contact: patientData.emergency_contact || null,
                start_date: patientData.start_date || new Date().toISOString().split('T')[0],
                next_appointment: patientData.next_appointment || null
            })
            .select()
            .single();

        return { data, error };
    }

    /**
     * Actualizar un paciente existente.
     */
    async update(id, patientData) {
        const updates = {};
        if (patientData.full_name !== undefined) updates.full_name = patientData.full_name;
        if (patientData.email !== undefined) updates.email = patientData.email;
        if (patientData.phone !== undefined) updates.phone = patientData.phone;
        if (patientData.age !== undefined) updates.age = patientData.age;
        if (patientData.gender !== undefined) updates.gender = patientData.gender;
        if (patientData.therapy_type !== undefined) updates.therapy_type = patientData.therapy_type;
        if (patientData.status !== undefined) updates.status = patientData.status;
        if (patientData.diagnosis !== undefined) updates.diagnosis = patientData.diagnosis;
        if (patientData.notes !== undefined) updates.notes = patientData.notes;
        if (patientData.emergency_contact !== undefined) updates.emergency_contact = patientData.emergency_contact;
        if (patientData.next_appointment !== undefined) updates.next_appointment = patientData.next_appointment;

        const { data, error } = await supabase
            .from(this.table)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        return { data, error };
    }

    /**
     * Eliminar un paciente.
     */
    async delete(id) {
        const { error } = await supabase
            .from(this.table)
            .delete()
            .eq('id', id);

        return { error };
    }

    /**
     * Obtener estadísticas de pacientes.
     */
    async getStats() {
        const { data, error } = await supabase
            .from(this.table)
            .select('status');

        if (error) return { data: null, error };

        const stats = { total: data.length, active: 0, inactive: 0, new: 0 };
        data.forEach(p => {
            if (p.status === 'active') stats.active++;
            else if (p.status === 'inactive') stats.inactive++;
            else if (p.status === 'new') stats.new++;
        });

        return { data: stats, error: null };
    }

    /**
     * Buscar pacientes por nombre (para uso en selects/dropdowns).
     */
    async search(query) {
        if (!query || query.length < 2) return { data: [], error: null };

        const { data, error } = await supabase
            .from(this.table)
            .select('id, full_name, email, phone')
            .ilike('full_name', `%${query}%`)
            .limit(10);

        return { data: data || [], error };
    }
}

export const patientsService = new PatientsService();
