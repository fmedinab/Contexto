// js/core/app.js
// Punto de entrada principal de la aplicación CONTEXTO.

import { ThemeManager } from './theme.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { Confirm } from '../components/confirm.js';
import { authService } from '../services/authService.js';
import { permissionService } from '../services/permissionService.js';
import { auditService } from '../services/auditService.js';
import { router } from './router.js';

import { LoginPage } from '../pages/login.js';
import { RegisterPage } from '../pages/register.js';
import { ForgotPasswordPage } from '../pages/forgot-password.js';
import { ResetPasswordPage } from '../pages/reset-password.js';
import { DashboardPage } from '../pages/dashboard.js';
import { PatientsPage } from '../pages/patients.js';
import { AppointmentsPage } from '../pages/appointments.js';
import { EvaluationsPage } from '../pages/evaluations.js';
import { TasksPage } from '../pages/tasks.js';
import { NotesPage } from '../pages/notes.js';
import { ReportsPage } from '../pages/reports.js';
import { LandingPage } from '../pages/landing.js';
import { LegalPage } from '../pages/legalPage.js';
import { PatientPortalPage } from '../pages/patient.js';

class App {
    constructor() {
        this.themeManager = new ThemeManager();
        this.modal = new Modal();
        this.toast = new Toast();
        this.confirm = new Confirm(this.modal);

        this.auth = authService;
        this.permissions = permissionService;
        this.audit = auditService;

        this.pageInstances = {};
        this.init();
    }

    init() {
        this.bindThemeToggle();
        this.bindKeyboardShortcuts();
        this.setupAuthListener();
        this.setupRoutes();
        this.bindLinkClicks();
    }

    bindLinkClicks() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-link]');
            if (link && link.matches('a[href^="/"]')) {
                e.preventDefault();
                router.navigate(link.getAttribute('href'));
            }
        });
    }

    setupRoutes() {
        router
            .addRoute('/', () => this.renderPage('landing', new LandingPage()))
            .addRoute('/login', () => this.renderPage('login', new LoginPage()))
            .addRoute('/register', () => this.renderPage('register', new RegisterPage()))
            .addRoute('/forgot-password', () => this.renderPage('forgotPassword', new ForgotPasswordPage()))
            .addRoute('/reset-password', () => this.renderPage('resetPassword', new ResetPasswordPage()))
            .addRoute('/privacidad', () => this.renderPage('legal', new LegalPage()))
            .addRoute('/cookies', () => this.renderPage('legal', new LegalPage()))
            .addRoute('/aviso-legal', () => this.renderPage('legal', new LegalPage()))
            .addRoute('/dashboard', () => {
                // El dashboard es la página principal unificada con seguridad
                // fail-closed: SOLO se muestra el panel de gestión si el usuario
                // tiene un rol de staff explícito. Cualquier otra situación
                // (paciente, sin roles, roles aún no cargados) muestra el portal
                // de paciente, que es de solo lectura.
                const isStaff = this.permissions.isStaff?.();
                const pageKey = isStaff ? 'dashboard' : 'patient';
                const instance = isStaff ? new DashboardPage() : new PatientPortalPage();
                return this.renderPage(pageKey, instance);
            })
            .addRoute('/patients', () => this.requireAuth(() => this.renderPage('patients', new PatientsPage()))())
            .addRoute('/appointments', () => this.requireAuth(() => this.renderPage('appointments', new AppointmentsPage()))())
            .addRoute('/evaluations', () => this.requireAuth(() => this.renderPage('evaluations', new EvaluationsPage()))())
            .addRoute('/tasks', () => this.requireAuth(() => this.renderPage('tasks', new TasksPage()))())
            .addRoute('/notes', () => this.requireAuth(() => this.renderPage('notes', new NotesPage()))())
            .addRoute('/reports', () => this.requireAuth(() => this.renderPage('reports', new ReportsPage()))())
            .addRoute('*', () => {
                this.renderPage('404', this._notFoundPage());
            });

        router.use(async (path) => {
            await this.auth.ready;

            // En recarga con sesión persistida, los roles pueden no haberse cargado
            // aún (el evento INITIAL_SESSION es asíncrono). Refresco defensivo.
            if (this.auth.isAuthenticated() && !this.permissions.userRoles.length) {
                try { await this.permissions.refresh(); } catch (e) { /* noop */ }
            }

            const publicRoutes = ['/login', '/register', '/forgot-password'];
            const isAuthRoute = path === '/reset-password';
            const isLegalRoute = ['/privacidad', '/cookies', '/aviso-legal'].includes(path);

            if (publicRoutes.includes(path)) {
                if (this.auth.isAuthenticated()) {
                    router.navigate('/dashboard');
                    return false;
                }
                return;
            }

            // La página de nueva contraseña debe ser accesible incluso con
            // sesión de recuperación activa (Supabase la marca como autenticada).
            if (isAuthRoute) {
                if (!this.auth.isAuthenticated()) {
                    router.navigate('/login');
                    return false;
                }
                return;
            }

            // Páginas legales: públicas, sin autenticación.
            if (isLegalRoute) return;

            // Ruta principal unificada: /dashboard está disponible para cualquier
            // usuario autenticado (paciente ve su portal, staff ve su panel).
            if (path === '/dashboard') {
                if (!this.auth.isAuthenticated()) {
                    router.navigate('/login');
                    return false;
                }
                // Seguridad fail-closed: si el usuario no tiene ningún rol cargado
                // ni rol de staff, se le completa la cuenta como paciente (rol +
                // ficha) para que su portal de solo lectura encuentre sus datos.
                // Un staff real (admin/psychologist/assistant) no pasa por aquí.
                if (this.permissions.isStaff?.()) return;

                if (!this.permissions.userRoles.length) {
                    const user = this.auth.getCurrentUser?.();
                    if (user?.email) {
                        try {
                            await this.auth.getSupabaseClient().rpc('ensure_patient_account', {
                                p_email: user.email,
                                p_full_name: user.user_metadata?.full_name || user.email
                            });
                        } catch (e) { /* noop */ }
                        try { await this.permissions.refresh(); } catch (e) { /* noop */ }
                    }
                }
                return;
            }

            // Rutas clínicas: solo staff con permiso. Un paciente que intenta
            // entrar es redirigido a su portal (ahora en /dashboard).
            const staffRoutes = ['/patients', '/appointments', '/evaluations', '/tasks', '/notes', '/reports'];
            if (staffRoutes.includes(path)) {
                if (!this.auth.isAuthenticated()) {
                    router.navigate('/login');
                    return false;
                }
                if (this.permissions.isPatient()) {
                    router.navigate('/dashboard');
                    return false;
                }
                if (!this.permissions.canAccessPage(path)) {
                    router.navigate('/dashboard');
                    return false;
                }
            }
        });
    }

    _notFoundPage() {
        return {
            render: async () => {
                const { renderErrorPage } = await import('../pages/errors.js');
                renderErrorPage(404);
            }
        };
    }

    renderPage(key, pageInstance) {
        if (this.pageInstances[key] && typeof this.pageInstances[key].destroy === 'function') {
            this.pageInstances[key].destroy();
        }
        this.pageInstances[key] = pageInstance;
        const pageBody = document.getElementById('pageBody');
        if (pageBody) {
            pageBody.innerHTML = '';
            pageBody.style.cssText = '';
            pageBody.className = 'page-body';
        }

        const appEl = document.getElementById('app');
        if (appEl) {
            const dashboardPages = ['dashboard', 'patients', 'appointments', 'evaluations', 'tasks', 'notes', 'reports'];
            if (dashboardPages.includes(key)) {
                appEl.classList.add('app--dashboard');
            } else {
                appEl.classList.remove('app--dashboard');
            }
        }

        pageInstance.render();
    }

    requireAuth(handler) {
        return async () => {
            await this.auth.ready;
            if (!this.auth.isAuthenticated()) {
                router.navigate('/login');
                return;
            }
            await handler();
        };
    }

    setupAuthListener() {
        this.auth.onAuthChange((session, event) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    this.permissions.refresh().then(() => {
                        this.updateNavigationVisibility();
                        this._handleMagicLinkArrival();
                    }).catch(() => {});
                } else {
                    this.updateNavigationVisibility();
                }
            } else if (event === 'SIGNED_OUT') {
                this.updateNavigationVisibility();
                router.navigate('/login');
            }
        });
    }

    /* Tras entrar vía magic link (login sin contraseña), lleva al usuario a la
       página principal unificada (/dashboard): pacientes ven su portal, staff
       su panel de gestión. */
    _handleMagicLinkArrival() {
        let pending = false;
        try { pending = localStorage.getItem('contexto_magic_pending') === '1'; } catch { /* noop */ }
        if (!pending) return;

        try { localStorage.removeItem('contexto_magic_pending'); } catch { /* noop */ }

        const dest = '/dashboard';
        if (router._getPath && router._getPath() !== dest) {
            router.navigate(dest);
        }
    }

    updateNavigationVisibility() {
        const isAuthenticated = this.auth.isAuthenticated();
        document.querySelectorAll('[data-nav]').forEach(el => {
            el.style.display = isAuthenticated ? '' : 'none';
        });
    }

    bindThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const newTheme = this.themeManager.toggle();
                this.toast.show({
                    type: 'info',
                    title: 'Tema actualizado',
                    message: `Modo ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado.`
                });
            });
        }
    }

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.modal.close();
            }
        });
    }
}

const app = new App();
window.app = app;
window.router = router;

const loader = document.getElementById('app-loader');
if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 350);
}

export default app;
