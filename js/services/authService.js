// js/services/authService.js
// Servicio de autenticación basado en Supabase Auth.

import { supabase } from '../../config/supabase.js';
import Env from '../../config/env.js';

// URL base de la app (incluye el subpath en GitHub Pages, p. ej. /Contexto/).
const APP_BASE = window.location.origin + window.location.pathname.replace(/[#?].*$/, '');

export class AuthService {
    constructor() {
        this.user = null;
        this.session = null;
        this.onAuthChangeCallbacks = [];
        this._idleTimer = null;
        this._activityListener = () => this._resetIdleTimeout();
        this._activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        this.ready = this._init();
    }

    getSupabaseClient() {
        return supabase;
    }

    async _init() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            this.session = session;
            this.user = session?.user || null;
            this._notifyAuthChange(this.session);

            supabase.auth.onAuthStateChange((event, session) => {
                this.session = session;
                this.user = session?.user || null;
                this._notifyAuthChange(session, event);
                if (session) this._startIdleTimeout();
                else this._stopIdleTimeout();
            });

            this._activityEvents.forEach(type =>
                window.addEventListener(type, this._activityListener, { passive: true })
            );

            if (session) this._startIdleTimeout();
        } catch (e) {
            console.error('Error inicializando sesión:', e.message);
        }
    }

    _startIdleTimeout() {
        this._stopIdleTimeout();
        // Tiempo de inactividad configurable desde Ajustes (site_settings).
        // Se lee asíncronamente; por defecto usa el valor de configuración.
        import('./siteSettingsService.js').then(({ siteSettingsService }) => {
            return siteSettingsService.getSessionTimeoutMs();
        }).then(timeout => {
            if (!this.isAuthenticated()) return;
            clearTimeout(this._idleTimer);
            this._idleTimer = setTimeout(() => this._handleIdleTimeout(), timeout);
        }).catch(() => {
            this._idleTimer = setTimeout(() => this._handleIdleTimeout(), Env.security.sessionTimeout);
        });
    }

    _stopIdleTimeout() {
        if (this._idleTimer) {
            clearTimeout(this._idleTimer);
            this._idleTimer = null;
        }
    }

    _resetIdleTimeout() {
        if (this.isAuthenticated()) this._startIdleTimeout();
    }

    async _handleIdleTimeout() {
        this._idleTimer = null;
        const wasAuthenticated = this.isAuthenticated();

        try {
            await supabase.auth.signOut();
        } catch (e) {
            this.session = null;
            this.user = null;
        }

        this._stopIdleTimeout();
        this._notifyAuthChange(null, 'SIGNED_OUT');

        if (wasAuthenticated && window.location.hash !== '#/login') {
            window.location.hash = '#/login';
            window.app?.toast?.info?.('Sesión expirada', 'La sesión se cerró por inactividad.');
        }
    }

    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
        return () => {
            this.onAuthChangeCallbacks = this.onAuthChangeCallbacks.filter(cb => cb !== callback);
        };
    }

    _notifyAuthChange(session, event) {
        this.onAuthChangeCallbacks.forEach(cb => {
            try { cb(session, event); } catch (e) { /* noop */ }
        });
    }

    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        this.session = data.session;
        this.user = data.user;
        return { user: data.user, session: data.session };
    }

    async loginWithMagicLink(email, metadata = {}) {
        const options = { emailRedirectTo: APP_BASE };
        if (metadata && Object.keys(metadata).length) {
            options.data = metadata;
        }

        // Marca la llegada por magic link: app.js redirige al portal tras login.
        try { localStorage.setItem('contexto_magic_pending', '1'); } catch { /* noop */ }

        const { data, error } = await supabase.auth.signInWithOtp({
            email,
            options
        });

        if (error) throw error;
        return data;
    }

    /* Envía a un email un enlace de acceso (magic link) con rol paciente.
       Para cuentas ya existentes, además asegura rol+ficha vía RPC. */
    async sendPatientAccessLink(email, fullName = '') {
        try {
            const { error: rpcError } = await supabase.rpc('ensure_patient_account', {
                p_email: email,
                p_full_name: fullName
            });
            if (rpcError) console.error('ensure_patient_account:', rpcError.message);
        } catch (e) { console.error('ensure_patient_account:', e.message); }

        return this.loginWithMagicLink(email, { role: 'patient', full_name: fullName || email });
    }

    async register(email, password, metadata = {}) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });

        if (error) throw error;
        this.session = data.session;
        this.user = data.user;
        return { user: data.user, session: data.session };
    }

    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        this.session = null;
        this.user = null;
    }

    async resetPassword(email) {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${APP_BASE}#reset-password`
        });

        if (error) throw error;
        return data;
    }

    async updatePassword(newPassword) {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
        return data;
    }

    isAuthenticated() {
        return !!this.session;
    }

    getCurrentUser() {
        return this.user;
    }

    getSession() {
        return this.session;
    }
}

export const authService = new AuthService();
