// js/pages/login.js
// Página de inicio de sesión — Diseño limpio y minimalista.

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

                    <div class="auth-footer">
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
    }

    async _handleSubmit() {
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const submitBtn = document.getElementById('loginSubmit');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        document.getElementById('loginEmailError').textContent = '';
        document.getElementById('loginPasswordError').textContent = '';

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
            window.app.toast.success('Bienvenido', 'Has iniciado sesión correctamente.');
            window.router.navigate('/dashboard');
        } catch (error) {
            window.app.toast.error('Error de acceso', error.message || 'Credenciales inválidas.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Entrar</span>';
        }
    }
}
