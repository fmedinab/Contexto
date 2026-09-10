// js/pages/login.js
// Página de inicio de sesión — Diseño limpio y minimalista.

import Env from '../../config/env.js';

const LOCKOUT_KEY = 'contexto-login-lockout';

function _lockoutState() {
    try {
        const parsed = JSON.parse(localStorage.getItem(LOCKOUT_KEY)) || {};
        const now = Date.now();
        if (parsed.lockedUntil && now < parsed.lockedUntil) return parsed;
        return { count: 0, lockedUntil: 0 };
    } catch {
        return { count: 0, lockedUntil: 0 };
    }
}

function _saveLockout(state) {
    try { localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state)); } catch { /* noop */ }
}

function _remainingLockMs() {
    return Math.max(0, (_lockoutState().lockedUntil || 0) - Date.now());
}

function _registerFailure() {
    const state = _lockoutState();
    const count = state.count + 1;
    if (count >= Env.security.maxLoginAttempts) {
        _saveLockout({ count: 0, lockedUntil: Date.now() + Env.security.lockoutDuration });
    } else {
        _saveLockout({ count, lockedUntil: 0 });
    }
}

function _clearFailures() {
    try { localStorage.removeItem(LOCKOUT_KEY); } catch { /* noop */ }
}

export class LoginPage {
    constructor() {
        this.container = document.getElementById('pageBody');
        this.form = null;
    }

    render() {
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
                            <path d="M16 14C18 16 21 17 24 17C27 17 30 16 32 14" stroke="url(#authGrad)" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.4"/>
                            <path d="M14 22C17 24 20 25 24 25C28 25 31 24 34 22" stroke="url(#authGrad)" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.3"/>
                            <path d="M16 30C18 31 21 32 24 32C27 32 30 31 32 30" stroke="url(#authGrad)" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.25"/>
                            <circle cx="20" cy="15" r="1.5" fill="url(#authGrad)" opacity="0.5"/>
                            <circle cx="28" cy="15" r="1.5" fill="url(#authGrad)" opacity="0.5"/>
                            <circle cx="18" cy="23" r="1.2" fill="url(#authGrad)" opacity="0.4"/>
                            <circle cx="30" cy="23" r="1.2" fill="url(#authGrad)" opacity="0.4"/>
                            <circle cx="22" cy="30" r="1" fill="url(#authGrad)" opacity="0.3"/>
                            <circle cx="26" cy="30" r="1" fill="url(#authGrad)" opacity="0.3"/>
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

                <a href="/" class="auth-back" data-link aria-label="Volver al inicio">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Volver al inicio
                </a>

                <div class="auth-form-container">
                    <h1 class="auth-title">CONTEXTO<span class="terminal-cursor">|</span></h1>
                    <p class="auth-subtitle"><i class="fa-solid fa-user-shield"></i> Plataforma de Gestión Psicológica</p>

                    <form class="auth-form" id="loginForm" novalidate>
                        <div class="form-group">
                            <label class="form-label" for="loginEmail">Correo electrónico</label>
                            <div class="input-wrapper">
                                <input type="email" id="loginEmail" name="email" class="input" placeholder="tu@email.com" required autocomplete="email">
                            </div>
                            <p class="form-error" id="loginEmailError"></p>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="loginPassword">Contraseña</label>
                            <div class="input-wrapper">
                                <input type="password" id="loginPassword" name="password" class="input" placeholder="••••••••" required autocomplete="current-password">
                            </div>
                            <p class="form-error" id="loginPasswordError"></p>
                        </div>
<button type="submit" class="btn btn--primary btn--full" id="loginSubmit">
                        <span>Entrar</span>
                    </button>
                    </form>

                    <div class="auth-magic" id="loginMagicWrap" hidden>
                        <p class="auth-magic-text">Ingresa tu correo y te enviaremos un <strong>enlace de acceso</strong> para entrar sin contraseña.</p>
                        <button type="button" class="btn btn--full" id="loginMagicSend">
                            <span>Enviarme enlace de acceso</span>
                        </button>
                    </div>

                    <div class="auth-footer">
                        <button type="button" class="auth-link auth-link--btn" id="loginMagicToggle">¿Entrar con enlace de acceso?</button>
                        <span class="auth-separator" id="loginMagicSep">·</span>
                        <a href="/forgot-password" class="auth-link" data-link>¿Olvidaste tu contraseña?</a>
                        <span class="auth-separator">·</span>
                        <a href="/register" class="auth-link" data-link>Crear cuenta</a>
                    </div>
                </div>
            </div>
        `;

        this._initParticles();
        this.form = document.getElementById('loginForm');
        this._bindEvents();
    }

    _initParticles() {
        const bg = document.getElementById('authBg');
        if (!bg) return;

        const count = window.innerWidth < 768 ? 30 : 60;
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const left = Math.random() * 100;
            const duration = Math.random() * 8 + 4;
            const delay = Math.random() * 8;
            const opacity = Math.random() * 0.4 + 0.1;

            particle.style.cssText = `
                left: ${left}%;
                bottom: ${Math.random() * 100}%;
                animation-duration: ${duration}s;
                animation-delay: ${delay}s;
                opacity: ${opacity};
            `;
            bg.appendChild(particle);
        }
    }

    _bindEvents() {
        if (!this.form) return;

        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this._handleSubmit();
        });

        const toggleBtn = document.getElementById('loginMagicToggle');
        const sep = document.getElementById('loginMagicSep');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this._toggleMagic());
        }
        if (sep && toggleBtn) {
            sep.style.display = 'none';
        }

        const sendBtn = document.getElementById('loginMagicSend');
        if (sendBtn) {
            sendBtn.addEventListener('click', async () => await this._handleMagicLink());
        }
    }

    _toggleMagic() {
        const wrap = document.getElementById('loginMagicWrap');
        const toggleBtn = document.getElementById('loginMagicToggle');
        if (!wrap || !toggleBtn) return;
        const showing = !wrap.hidden;
        wrap.hidden = showing;
        toggleBtn.textContent = showing ? '¿Entrar con enlace de acceso?' : 'Volver a entrar con contraseña';
        if (showing) {
            const emailInput = document.getElementById('loginEmail');
            if (emailInput) emailInput.focus();
        }
    }

    async _handleMagicLink() {
        const emailInput = document.getElementById('loginEmail');
        const sendBtn = document.getElementById('loginMagicSend');
        if (!emailInput) return;

        const email = emailInput.value.trim();
        if (!email) {
            this._showBanner('Ingresa tu correo electrónico para recibir el enlace de acceso.');
            return;
        }

        if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '<span class="spinner spinner--sm btn-spinner"></span> Enviando...'; }
        try {
            await window.app.auth.loginWithMagicLink(email);
            window.app.toast.info('Enlace enviado', 'Revisa tu correo y haz clic en el enlace para entrar.');
        } catch (error) {
            const msg = (error.message || '').toLowerCase().includes('signups not allowed')
                ? 'El registro está deshabilitado. Contacta al consultorio para darte acceso.'
                : (error.message || 'No se pudo enviar el enlace. Intenta de nuevo.');
            this._showBanner(msg);
        } finally {
            if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<span>Enviarme enlace de acceso</span>'; }
        }
    }

    async _handleSubmit() {
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const submitBtn = document.getElementById('loginSubmit');

        let remainingLockMs = _remainingLockMs();
        if (remainingLockMs > 0) {
            const minutes = Math.ceil(remainingLockMs / 60000);
            this._showBanner(`Demasiados intentos fallidos. Intenta de nuevo dentro de ${minutes} min.`);
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        document.getElementById('loginEmailError').textContent = '';
        document.getElementById('loginPasswordError').textContent = '';
        const existingBanner = document.getElementById('loginErrorBanner');
        if (existingBanner) existingBanner.remove();

        let hasError = false;

        if (!email) {
            document.getElementById('loginEmailError').textContent = 'El correo electrónico es obligatorio.';
            hasError = true;
        }

        if (!password) {
            document.getElementById('loginPasswordError').textContent = 'La contraseña es obligatoria.';
            hasError = true;
        }

        if (hasError) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner spinner--sm btn-spinner"></span> Entrando...';

        try {
            await window.app.auth.login(email, password);
            _clearFailures();
            // Refrescar roles antes de entrar (el dashboard es consciente del rol).
            try { await window.app.permissions.refresh(); } catch (e) { /* noop */ }
            window.app.toast.success('Bienvenido', 'Has iniciado sesión correctamente.');
            // Página principal unificada: el paciente ve su portal, el staff su panel.
            window.router.navigate('/dashboard');
        } catch (error) {
            const raw = (error.message || '').toLowerCase();
            if (!/fetch|network/.test(raw)) _registerFailure();
            const msg = this._friendlyError(error);
            this._showBanner(msg);
            window.app.toast.error('Error de acceso', msg);
            const afterLock = _remainingLockMs();
            if (afterLock > 0) {
                const minutes = Math.ceil(afterLock / 60000);
                const wait = document.createElement('p');
                wait.id = 'loginLockoutHint';
                wait.className = 'form-error-hint';
                wait.textContent = `Se bloquearon los intentos. Vuelve a intentar en ${minutes} min.`;
                this._lastBanner?.appendChild(wait);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Entrar</span>';
        }
    }

    _showBanner(message) {
        this._lastBanner = null;
        if (!message) return;
        const form = document.getElementById('loginForm');
        if (!form) return;
        const existing = document.getElementById('loginErrorBanner');
        if (existing) existing.remove();
        const banner = document.createElement('div');
        banner.id = 'loginErrorBanner';
        banner.className = 'form-error-banner';
        const iconEl = document.createElement('i');
        iconEl.className = 'fa-solid fa-circle-exclamation';
        banner.appendChild(iconEl);
        banner.appendChild(document.createTextNode(' ' + message));
        form.parentNode.insertBefore(banner, form);
        this._lastBanner = banner;
    }

    _friendlyError(error) {
        const raw = (error.message || '').toLowerCase();
        if (raw.includes('invalid login credentials') || raw.includes('invalid email or password')) {
            return 'Correo o contraseña incorrectos. Verifica tus datos.';
        }
        if (raw.includes('email not confirmed') || raw.includes('email address has not been confirmed')) {
            return 'El correo aún no está confirmado. Revisa tu bandeja de entrada.';
        }
        if (raw.includes('user not found') || raw.includes('no user found')) {
            return 'No existe una cuenta con este correo electrónico.';
        }
        if (raw.includes('too many requests') || raw.includes('rate limit')) {
            return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.';
        }
        if (raw.includes('password should be at least')) {
            return 'La contraseña debe tener al menos 6 caracteres.';
        }
        if (raw.includes('fetch') || raw.includes('network') || raw.includes('failed to fetch')) {
            return 'Error de conexión. Verifica tu internet y vuelve a intentar.';
        }
        return error.message || 'Credenciales inválidas. Intenta de nuevo.';
    }
}
