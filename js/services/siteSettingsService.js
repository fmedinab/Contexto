// js/services/siteSettingsService.js
// Servicio de configuración global del consultorio.
// Persiste en la tabla site_settings (clave-valor) con RLS:
//   - SELECT  cualquier usuario autenticado
//   - INSERT/UPDATE/DELETE solo admin
//
// Estos ajustes afectan a todo el sistema: horarios de atención (que
// también consume la landing), tiempo de inactividad de sesión, datos de
// contacto, WhatsApp, moneda y zona horaria. Se gestionan desde el
// dropdown de perfil (Ajustes) en el dashboard.

import { supabase } from '../../config/supabase.js';
import { authService } from './authService.js';

const TABLE = 'site_settings';

// Valores por defecto si la tabla no existe o no responde.
const DEFAULT_SETTINGS = {
    site_name: 'CONTEXTO',
    site_tagline: 'Gestión psicológica inteligente',
    session_timeout_minutes: '30',
    max_login_attempts: '5',
    lockout_duration_minutes: '15',
    allow_registration: 'true',
    default_user_role: 'patient',
    maintenance_mode: 'false',
    work_schedule: JSON.stringify({
        lunes: '08:00-20:00',
        martes: '08:00-20:00',
        miercoles: '08:00-20:00',
        jueves: '08:00-20:00',
        viernes: '08:00-20:00',
        sabado: '09:00-14:00',
        domingo: 'cerrado'
    }),
    contact_email: 'contacto@contextopsicologia.com',
    contact_phone: '+502 1234 5678',
    whatsapp_number: '50212345678',
    currency: 'PEN',
    timezone: 'America/Guatemala',
    booking_confirm_hours: '24'
};

// Convierte una lista de filas {key, value} en un objeto plano.
function rowsToMap(rows) {
    const map = {};
    (rows || []).forEach(r => { map[r.key] = r.value; });
    return map;
}

function normalizeValue(value, type) {
    const t = type || 'text';
    if (t === 'json') {
        try { return JSON.parse(value); } catch { return value; }
    }
    if (t === 'number') {
        const n = Number(value);
        return Number.isFinite(n) ? n : value;
    }
    if (t === 'boolean') {
        return value === 'true' || value === true;
    }
    return value;
}

class SiteSettingsService {
    constructor() {
        this._cache = null;
        this._listeners = [];
    }

    _notify() {
        this._listeners.forEach(fn => { try { fn(); } catch { /* noop */ } });
    }

    onChange(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(l => l !== fn);
        };
    }

    // Devuelve el mapa plano de ajustes (raw). Lectura autenticada.
    async getAll() {
        const isAuthed = authService.isAuthenticated();
        if (this._cache && isAuthed) return this._clone(this._cache);

        const { data, error } = await supabase
            .from(TABLE)
            .select('key, value, type');

        if (error) {
            console.warn('site_settings read failed, using defaults:', error.message);
            return this._clone(DEFAULT_SETTINGS);
        }

        const result = { ...DEFAULT_SETTINGS, ...rowsToMap(data) };
        // Solo cachear con sesión (ping anon puede traer un subconjunto).
        if (isAuthed) this._cache = result;
        return this._clone(result);
    }

    // Devuelve un ajuste individual ya tipado (json/number/boolean).
    async get(key) {
        const all = await this.getAll();
        const raw = all[key];
        if (raw === undefined) return undefined;

        const { data } = await supabase
            .from(TABLE)
            .select('type')
            .eq('key', key)
            .maybeSingle();

        return normalizeValue(raw, data?.type);
    }

    // Devuelve el horario de trabajo ya parseado, o null.
    async getWorkSchedule() {
        const raw = await this.get('work_schedule');
        if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch { return null; }
        }
        return raw && typeof raw === 'object' ? raw : null;
    }

    // Devuelve el tiempo de inactividad en milisegundos (para el logout).
    async getSessionTimeoutMs() {
        const minutes = await this.get('session_timeout_minutes');
        const n = Number(minutes);
        return Number.isFinite(n) && n > 0 ? n * 60 * 1000 : 30 * 60 * 1000;
    }

    async getTimezone() {
        const tz = await this.get('timezone');
        return tz || 'America/Guatemala';
    }

    /* ===== ESCRITURA (admin) ===== */

    // Upsert de un ajuste individual.
    async save(key, value) {
        const existing = await supabase
            .from(TABLE)
            .select('type')
            .eq('key', key)
            .maybeSingle();

        let type = existing.data?.type;
        if (!type) {
            // Heurística simple por el valor.
            type = typeof value === 'object' ? 'json'
                : typeof value === 'number' ? 'number'
                : typeof value === 'boolean' ? 'boolean' : 'text';
        }

        const stringValue = typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);

        const { data, error } = await supabase
            .from(TABLE)
            .upsert({
                key,
                value: stringValue,
                type,
                description: existing.data?.description || null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' })
            .select()
            .single();

        if (!error) this._cache = null; // invalidar caché
        if (!error) this._notify();
        return { data, error };
    }

    // Guarda varios ajustes a la vez.
    async saveMany(entries) {
        const results = [];
        for (const [key, value] of Object.entries(entries)) {
            const r = await this.save(key, value);
            results.push({ key, error: r.error });
        }
        const hasError = results.some(r => r.error);
        return { errors: hasError ? results.filter(r => r.error) : [], ok: !hasError };
    }

    _clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}

export const siteSettingsService = new SiteSettingsService();
export { DEFAULT_SETTINGS, normalizeValue };
