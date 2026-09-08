// js/pages/reset-password.js
// Página para definir una nueva contraseña tras el enlace de recuperación.
// Manejable tras redirección de Supabase (flujo PKCE/implicit).

import { authService } from '../services/authService.js';

export class ResetPasswordPage {
    constructor() {
        this.container = document.getElementById('pageBody');
        this.form = null;
        this._isRecovery = false;
    }

    async render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="auth-page" id="authPage">
                <div class="auth-bg" id="authBg">
                    <div class="orbital-ring orbital-ring--1"></div>
                    <div class="orbital-ring orbital-ring--2"></div>
                    <div class="orbital-ring orbital-ring--3"></div>
                </div>

                <div class="auth-core">
                    <div class="auth-core-icon">
                        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24 4C18.5 4 14 7 12 11C10 8 6.5 7 4 9C1.5 11 1 15 3 18C1 20 1 23 3 26C1 28 1.5 32 4 34C6.5 36 10 35 12 32C14 36 18.5 39 24 39"
                                  stroke="url(#authGrad)" stroke-width="2" stroke-linecap="round" fill="none"/>
                            <path d="M24 4C29.5 4 34 7 36 11C38 8 41.5 7 44 9C46.5 11 47 15 45 18C47 20 47 23 45 26C47 28 46.5 32 44 34C41.5 36 38 35 36 32C34 36 29.5 39 24 39"
                                  stroke="url(#authGrad)" stroke-width="2" stroke-linecap="round" fill="none"/>
                            <path d="M24 4V39" stroke="url(#authGrad)" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
                            <defs>
                                <linearGradient id="authGrad" x1="4" y1="4" x2="44" y2="39">
                                    <stop offset="0%" stop-color="#4f46e5"/>
                                    <stop offset="50%" stop-color="#6366f1"/>
                                    <stop offset="100%" stop-color="#06b6d4"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>

                <div class="auth-form-container">
                    <h1 class="auth-title">CONTEXTO<span class="terminal-cursor">|</span></h1>
                    <p class="auth-subtitle"><i class="fa-solid fa-key"></i> Nueva contraseña</p>

                    <form class="auth-form" id="resetForm" novalidate>
                        <div class="form-group">
                            <label class="form-label" for="resetPassword">Nueva contraseña</label>
                            <div class="input-wrapper">
                                <input type="password" id="resetPassword" name="password" class="input" placeholder="Mínimo 8 caracteres" required minlength="8" autocomplete="new-password">
                            </div>
                            <p class="form-error" id="resetPasswordError"></p>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="resetConfirm">Confirmar contraseña</label>
                            <div class="input-wrapper">
                                <input type="password" id="resetConfirm" name="confirm" class="input" placeholder="Repite la contraseña" required minlength="8" autocomplete="new-password">
                            </div>
                            <p class="form-error" id="resetConfirmError"></p>
                        </div>
                        <button type="submit" class="btn btn--primary btn--full" id="resetSubmit">
                            <span>Actualizar contraseña</span>
                        </button>
                    </form>

                    <div class="auth-footer">
                        <a href="/login" class="auth-link" data-link>Volver a iniciar sesión</a>
                    </div>
                </div>
            </div>
        `;

        this._initParticles();
        this.form = document.getElementById('resetForm');
        this._bindEvents();
        await this._checkRecovery();
    }

    _initParticles() {
        const bg = document.getElementById('authBg');
        if (!bg) return;

        const count = window.innerWidth < 768 ? 30 : 60;
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                left: ${Math.random() * 100}%;
                bottom: ${Math.random() * 100}%;
                animation-duration: ${Math.random() * 8 + 4}s;
                animation-delay: ${Math.random() * 8}s;
                opacity: ${Math.random() * 0.4 + 0.1};
            `;
            bg.appendChild(particle);
        }
    }

    _bindEvents() {
        if (!this.form) return;

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleSubmit();
        });
    }

    async _checkRecovery() {
        try {
            await authService.ready;
            const session = authService.getSession();
            this._isRecovery = !!(session && session.user);
        } catch {
            this._isRecovery = false;
        }
    }

    async _handleSubmit() {
        const pwInput = document.getElementById('resetPassword');
        const cwInput = document.getElementById('resetConfirm');
        const submitBtn = document.getElementById('resetSubmit');
        const password = pwInput.value;
        const confirm = cwInput.value;

        document.getElementById('resetPasswordError').textContent = '';
        document.getElementById('resetConfirmError').textContent = '';

        let hasError = false;
        if (password.length < 8) {
            document.getElementById('resetPasswordError').textContent = 'La contraseña debe tener al menos 8 caracteres.';
            hasError = true;
        }
        if (password !== confirm) {
            document.getElementById('resetConfirmError').textContent = 'Las contraseñas no coinciden.';
            hasError = true;
        }
        if (hasError) return;

        if (!this._isRecovery) {
            window.app.toast.error('Enlace inválido', 'Este enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.');
            window.router.navigate('/forgot-password');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner spinner--sm btn-spinner"></span> Actualizando...';

        try {
            await window.app.auth.updatePassword(password);
            window.app.toast.success('Contraseña actualizada', 'Tu contraseña se ha cambiado correctamente.');
            window.router.navigate('/dashboard');
        } catch (error) {
            window.app.toast.error('Error', error.message || 'No se pudo actualizar la contraseña.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Actualizar contraseña</span>';
        }
    }
}