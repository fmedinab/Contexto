// js/services/bookingRequestsService.js
// Servicio de solicitudes de cita — reservas creadas desde la landing.
// Persisten en la tabla booking_requests con RLS:
//   - INSERT público (anon/authenticated)
//   - SELECT/UPDATE solo para el equipo clínico (admin/psychologist/assistant)
//   - DELETE solo admin
// Mapea entre el shape de UI (camelCase) y la DB (snake_case).

import { supabase } from '../../config/supabase.js';
import { patientService } from './patientsService.js';
import { appointmentService } from './appointmentsService.js';

const TABLE = 'booking_requests';

const BOOKING_STATUSES = ['PENDIENTE', 'CONTACTADA', 'AGENDADA', 'CANCELADA'];

const BOOKING_STATUS_LABELS = {
    PENDIENTE: 'Pendiente',
    CONTACTADA: 'Contactada',
    AGENDADA: 'Agendada',
    CANCELADA: 'Cancelada'
};

/* Número de WhatsApp del consultorio (solo dígitos, con código de país). */
const WHATSAPP_NUMBER = '50212345678';

/* ===== WHATSAPP HELPERS ===== */

function buildWhatsAppUrl(phone, message) {
    const digits = String(phone || '').replace(/\D/g, '');
    const target = digits || WHATSAPP_NUMBER;
    const text = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${target}${text}`;
}

function buildBookingReminderUrl(request) {
    const firstName = (request.fullName || '').trim().split(/\s+/)[0] || '';
    const service = request.serviceType || 'sesión';
    const date = request.preferredDate ? ` para el ${request.preferredDate}` : '';
    const modality = request.modality ? ` (${request.modality})` : '';
    const message =
        `Hola ${firstName}, tu solicitud de ${service}${modality}${date} ` +
        'está cerca. Respondé este mensaje para confirmar tu cita y la dejamos agendada. ' +
        '— CONTEXTO Psicología';
    return buildWhatsAppUrl(request.phone, message);
}

/* ===== MAPPING UI ↔ DB ===== */

function dbRowToUI(row) {
    if (!row) return null;
    return {
        id: row.id,
        fullName: row.full_name || '',
        email: row.email || '',
        phone: row.phone || '',
        serviceType: row.service_type || 'Terapia Individual',
        modality: row.modality || 'Presencial',
        preferredDate: row.preferred_date || null,
        preferredTime: row.preferred_time || null,
        message: row.message || '',
        status: row.status || 'PENDIENTE',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function uiToDBRow(data) {
    const row = {};
    if (data.fullName !== undefined) row.full_name = data.fullName;
    if (data.email !== undefined) row.email = data.email || null;
    if (data.phone !== undefined) row.phone = data.phone || null;
    if (data.serviceType !== undefined) row.service_type = data.serviceType;
    if (data.modality !== undefined) row.modality = data.modality;
    if (data.preferredDate !== undefined) row.preferred_date = data.preferredDate || null;
    if (data.preferredTime !== undefined) row.preferred_time = data.preferredTime || null;
    if (data.message !== undefined) row.message = data.message || null;
    if (data.status !== undefined) row.status = data.status;
    return row;
}

/* El campo type de appointments usa un set reducido: mapea el servicio
   de la landing al tipo de cita más cercano. */
function _toAppointmentType(serviceType) {
    const s = String(serviceType || '').toLowerCase();
    if (s.includes('evaluaci')) return 'Evaluación';
    if (s.includes('pareja')) return 'Terapia de Pareja';
    if (s.includes('familiar') || s.includes('infantil')) return 'Terapia Familiar';
    if (s.includes('online')) return 'Terapia Individual';
    if (s.includes('individual')) return 'Terapia Individual';
    return 'Otra';
}

/* ===== SERVICE ===== */

class BookingRequestsService {
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

    /* ===== CRUD ===== */

    /* INSERT público: lo invoca un visitante desde la landing. */
    async create(data) {
        const row = uiToDBRow(data);

        if (!row.full_name) return { data: null, error: { message: 'Nombre es obligatorio' } };
        if (!row.phone && !row.email) {
            return { data: null, error: { message: 'Ingresa un teléfono o correo de contacto' } };
        }
        if (!row.preferred_date) return { data: null, error: { message: 'Elige una fecha preferida' } };
        if (!row.preferred_time) return { data: null, error: { message: 'Elige un horario preferido' } };

        // IMPORTANTE: sin .select() — anon NO tiene permiso SELECT de esta tabla
        // (RLS clínica). Devolver la fila insertada dispararía un 42501/401.
        const { error } = await supabase
            .from(TABLE)
            .insert(row);

        if (error) return { data: null, error };
        this._notify();
        return {
            data: {
                id: null,
                fullName: row.full_name,
                email: row.email || '',
                phone: row.phone || '',
                serviceType: row.service_type || 'Terapia Individual',
                modality: row.modality || 'Presencial',
                preferredDate: row.preferred_date || null,
                preferredTime: row.preferred_time || null,
                message: row.message || '',
                status: 'PENDIENTE',
                createdAt: new Date().toISOString()
            },
            error: null
        };
    }

    /* SELECT solo clínicos (protegido por RLS). */
    async getAll(opts = {}) {
        let query = supabase.from(TABLE).select('*', { count: 'exact' });

        if (opts.status && opts.status !== 'all') {
            query = query.eq('status', opts.status);
        }
        if (opts.limit) {
            query = query.limit(opts.limit);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error, count } = await query;

        if (error) return { data: [], error, count: 0 };
        return { data: (data || []).map(dbRowToUI), error: null, count: count || 0 };
    }

    async countPending() {
        const { data, error, count } = await supabase
            .from(TABLE)
            .select('id', { count: 'exact', head: true })
            .eq('status', 'PENDIENTE');
        return { count: count || 0, error };
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

    /* Cambio de estado: PENDIENTE → CONTACTADA → AGENDADA | CANCELADA. */
    async updateStatus(id, status) {
        if (!BOOKING_STATUSES.includes(status)) {
            return { data: null, error: { message: `Estado inválido: ${status}` } };
        }
        const { data: updated, error } = await supabase
            .from(TABLE)
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) return { data: null, error };
        this._notify();
        return { data: dbRowToUI(updated), error: null };
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

    /* ===== FLUJO CLÍNICO ===== */

    /* Horarios libres para una fecha (función SECURITY DEFINER).
       Devuelve solo los slots del día; nunca datos de pacientes. */
    async getAvailableTimes(dateISO) {
        if (!dateISO) return { data: [], error: null };
        const { data, error } = await supabase.rpc('get_available_slots', { p_date: dateISO });
        if (error) return { data: [], error };
        const slots = (data || [])
            .map(row => (row && typeof row === 'object' ? row.time_slot : row))
            .filter(Boolean)
            .sort();
        return { data: slots, error: null };
    }

    /* Convierte una solicitud en cita real:
       1) verifica que el horario siga disponible
       2) localiza o crea el paciente
       3) crea la cita (CONFIRMADA)
       4) marca la solicitud AGENDADA */
    async convertToAppointment(id, overrides = {}) {
        const { data: req, error } = await this.getById(id);
        if (error) return { data: null, error };
        if (!req) return { data: null, error: { message: 'Solicitud no encontrada' } };
        if (req.status === 'AGENDADA') {
            return { data: null, error: { message: 'Esta solicitud ya fue agendada' } };
        }
        if (req.status === 'CANCELADA') {
            return { data: null, error: { message: 'La solicitud fue cancelada' } };
        }

        // 1) Validar que el horario (preferido o elegido) siga libre.
        const targetTime = overrides.preferredTime || req.preferredTime;
        const { data: freeSlots, error: avError } = await this.getAvailableTimes(req.preferredDate);
        if (avError) return { data: null, error: avError };
        if (targetTime && freeSlots.length && !freeSlots.includes(targetTime)) {
            return {
                data: null,
                error: {
                    message: `El horario ${targetTime} ya no está disponible el ${req.preferredDate}. Abre la solicitud, ajusta la hora y vuelve a convertir.`
                }
            };
        }

        // 2) Paciente: reutilizar si ya existe por teléfono o correo.
        let patientId = null;
        const reqPhone = String(req.phone || '').replace(/\D/g, '');
        const { data: existingList } = await patientService.getAll({ search: req.phone || '' });
        const match = (existingList || []).find(p => {
            const samePhone = reqPhone && p.phone && p.phone.replace(/\D/g, '') === reqPhone;
            const sameEmail = req.email && p.email && p.email.toLowerCase() === req.email.toLowerCase();
            return samePhone || sameEmail;
        });
        if (match) {
            patientId = match.id;
        } else {
            const parts = req.fullName.trim().split(/\s+/);
            const { data: createdPatient, error: perr } = await patientService.create({
                firstName: parts[0] || '',
                lastName: parts.slice(1).join(' ') || req.fullName,
                email: req.email || '',
                phone: req.phone || '',
                therapyType: req.serviceType || 'Terapia Individual',
                status: 'new'
            });
            if (perr) return { data: null, error: perr };
            patientId = createdPatient.id;
        }

        // 2) Cita real.
        const dateTime = `${req.preferredDate || ''}T${targetTime || '10:00'}:00`;
        const { data: appointment, error: aerr } = await appointmentService.create({
            patientId,
            title: overrides.title || `${req.serviceType || 'Sesión'}${req.modality === 'Online' ? ' (Online)' : ''}`,
            appointmentDate: new Date(dateTime).toISOString(),
            type: _toAppointmentType(req.serviceType),
            status: 'CONFIRMADA',
            durationMinutes: 50,
            location: req.modality === 'Online' ? 'Online' : 'Presencial',
            notes: req.message || ''
        });
        if (aerr) return { data: null, error: aerr };

        // 3) Cerrar la solicitud (guardando la hora finalmente agendada).
        await this.update(id, { status: 'AGENDADA', preferredTime: targetTime || req.preferredTime });

        this._notify();
        return {
            data: { request: req, patientId, appointment },
            error: null
        };
    }
}

export const bookingRequestsService = new BookingRequestsService();
export { WHATSAPP_NUMBER, BOOKING_STATUSES, BOOKING_STATUS_LABELS, buildWhatsAppUrl, buildBookingReminderUrl };