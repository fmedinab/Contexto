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
import { DashboardPage } from '../pages/dashboard.js';
import { PatientsPage } from '../pages/patients.js';
import { AppointmentsPage } from '../pages/appointments.js';
import { EvaluationsPage } from '../pages/evaluations.js';
import { TasksPage } from '../pages/tasks.js';
import { NotesPage } from '../pages/notes.js';

import { pwaInstall } from '../pwa/install.js';

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
        this.registerServiceWorker();
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
            .addRoute('/', () => {
                if (this.auth.isAuthenticated()) {
                    router.navigate('/dashboard');
                } else {
                    router.navigate('/login');
                }
            })
            .addRoute('/login', () => this.renderPage('login', new LoginPage()))
            .addRoute('/register', () => this.renderPage('register', new RegisterPage()))
            .addRoute('/forgot-password', () => this.renderPage('forgotPassword', new ForgotPasswordPage()))
            .addRoute('/dashboard', () => this.renderPage('dashboard', new DashboardPage()))
            .addRoute('/patients', () => this.requireAuth(() => this.renderPage('patients', new PatientsPage())))
            .addRoute('/appointments', () => this.requireAuth(() => this.renderPage('appointments', new AppointmentsPage())))
            .addRoute('/evaluations', () => this.requireAuth(() => this.renderPage('evaluations', new EvaluationsPage())))
            .addRoute('/tasks', () => this.requireAuth(() => this.renderPage('tasks', new TasksPage())))
            .addRoute('/notes', () => this.requireAuth(() => this.renderPage('notes', new NotesPage())))
            .addRoute('*', () => {
                this.renderPage('404', this._notFoundPage());
            });

        router.use(async (path) => {
            await this.auth.ready;
            const publicRoutes = ['/login', '/register', '/forgot-password'];
            const isDashboard = path === '/dashboard';

            if (publicRoutes.includes(path)) {
                if (this.auth.isAuthenticated()) {
                    router.navigate('/dashboard');
                    return false;
                }
                return;
            }

            if (isDashboard) {
                if (!this.auth.isAuthenticated()) {
                    router.navigate('/login');
                    return false;
                }
            }
        });
    }

    _notFoundPage() {
        return {
            render: () => {
                const container = document.getElementById('pageBody');
                if (!container) return;
                container.innerHTML = `
                    <div class="error-state">
                        <div class="error-state-icon" aria-hidden="true">⚠</div>
                        <p class="error-state-title">Página no encontrada</p>
                        <p class="error-state-description">La página que buscas no existe.</p>
                        <button class="btn btn--primary" onclick="window.router.navigate('/dashboard')">Ir al dashboard</button>
                    </div>
                `;
            }
        };
    }

    renderPage(key, pageInstance) {
        if (this.pageInstances[key] && typeof this.pageInstances[key].destroy === 'function') {
            this.pageInstances[key].destroy();
        }
        this.pageInstances[key] = pageInstance;
        const pageBody = document.getElementById('pageBody');
        if (pageBody) pageBody.innerHTML = '';

        const appEl = document.getElementById('app');
        if (appEl) {
            const dashboardPages = ['dashboard', 'patients', 'appointments', 'evaluations', 'tasks', 'notes'];
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
            if (event === 'SIGNED_IN') {
                this.permissions.refresh().then(() => {
                    this.updateNavigationVisibility();
                });
            } else if (event === 'SIGNED_OUT') {
                this.updateNavigationVisibility();
                router.navigate('/login');
            }
        });
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

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (const reg of registrations) {
                    reg.unregister();
                    console.log('Service Worker desactivado:', reg.scope);
                }
            });
        }
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
