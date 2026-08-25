// js/pages/register.js
// Página de registro de usuario — comparte estilos con login (auth.css).

export class RegisterPage {
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

                    <form class="auth-form" id="registerForm" novalidate>
                        <div class="form-group">
                            <label class="form-label" for="registerName">Nombre completo</label>
                            <div class="input-wrapper">
                                <input type="text" id="registerName" name="fullName" class="input" placeholder="Tu nombre" required autocomplete="name">
                            </div>
                            <p class="form-error" id="registerNameError"></p>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="registerEmail">Correo electrónico</label>
                            <div class="input-wrapper">
                                <input type="email" id="registerEmail" name="email" class="input" placeholder="tu@email.com" required autocomplete="email">
                            </div>
                            <p class="form-error" id="registerEmailError"></p>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="registerPassword">Contraseña</label>
                            <div class="input-wrapper">
                                <input type="password" id="registerPassword" name="password" class="input" placeholder="Mínimo 8 caracteres" required autocomplete="new-password">
                            </div>
                            <p class="form-hint">Mínimo 8 caracteres, incluye mayúsculas, minúsculas y números.</p>
                            <p class="form-error" id="registerPasswordError"></p>
                        </div>
                        <button type="submit" class="btn btn--primary btn--full" id="registerSubmit">
                            <span>Registrarse</span>
                        </button>
                    </form>

                    <div class="auth-footer">
                        <span class="auth-text">¿Ya tienes cuenta?</span>
                        <a href="#/login" class="auth-link">Inicia sesión</a>
                    </div>
                </div>
            </div>
        `;

        this._initParticles();
        this.form = document.getElementById('registerForm');
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
        const nameInput = document.getElementById('registerName');
        const emailInput = document.getElementById('registerEmail');
        const passwordInput = document.getElementById('registerPassword');
        const submitBtn = document.getElementById('registerSubmit');

        const fullName = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        document.getElementById('registerNameError').textContent = '';
        document.getElementById('registerEmailError').textContent = '';
        document.getElementById('registerPasswordError').textContent = '';

        let hasError = false;

        if (!fullName) {
            document.getElementById('registerNameError').textContent = 'El nombre es obligatorio.';
            hasError = true;
        }

        if (!email) {
            document.getElementById('registerEmailError').textContent = 'El correo electrónico es obligatorio.';
            hasError = true;
        }

        if (!password) {
            document.getElementById('registerPasswordError').textContent = 'La contraseña es obligatoria.';
            hasError = true;
        } else if (password.length < 8) {
            document.getElementById('registerPasswordError').textContent = 'La contraseña debe tener al menos 8 caracteres.';
            hasError = true;
        }

        if (hasError) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner spinner--sm btn-spinner"></span> Creando cuenta...';

        try {
            await window.app.auth.register(email, password, { full_name: fullName });
            window.app.toast.success('Cuenta creada', 'Revisa tu correo para confirmar tu cuenta.');
            window.router.navigate('/login');
        } catch (error) {
            window.app.toast.error('Error', error.message || 'No se pudo crear la cuenta.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Registrarse</span>';
        }
    }
}
