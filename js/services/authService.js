// js/services/authService.js
// Servicio de autenticación basado en Supabase Auth.

import { supabase } from '../../config/supabase.js';

export class AuthService {
    constructor() {
        this.user = null;
        this.session = null;
        this.onAuthChangeCallbacks = [];
        this._init();
    }

    getSupabaseClient() {
        return supabase;
    }

    async _init() {
        supabase.auth.getSession().then(({ data: { session } }) => {
            this.session = session;
            this.user = session?.user || null;
            this._notifyAuthChange(this.session);
        });

        supabase.auth.onAuthStateChange((event, session) => {
            this.session = session;
            this.user = session?.user || null;
            this._notifyAuthChange(session, event);
        });
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

    async loginWithMagicLink(email) {
        const { data, error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin }
        });

        if (error) throw error;
        return data;
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
            redirectTo: `${window.location.origin}/reset-password`
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
