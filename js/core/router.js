// js/core/router.js
// Router SPA basado en hash (#/ruta).
// Se usa hash routing para que la app funcione en hosting estático
// (GitHub Pages) sin necesidad de configurar el servidor (sin 404 al refrescar).

export class Router {
    constructor(routes = {}) {
        this.routes = routes;
        this.currentRoute = null;
        this.previousRoute = null;
        this.middleware = [];
        this._bindEvents();
    }

    _bindEvents() {
        window.addEventListener('DOMContentLoaded', () => this._resolve());
        window.addEventListener('hashchange', () => this._resolve());
    }

    _getPath() {
        let hash = window.location.hash.replace(/^#/, '');
        if (!hash) hash = '/';
        if (!hash.startsWith('/')) hash = '/' + hash;
        const qIdx = hash.indexOf('?');
        return qIdx >= 0 ? hash.substring(0, qIdx) : hash;
    }

    _getHashQuery() {
        const hash = window.location.hash.replace(/^#/, '');
        const qIdx = hash.indexOf('?');
        if (qIdx < 0) return {};
        return Object.fromEntries(new URLSearchParams(hash.substring(qIdx + 1)));
    }

    addRoute(path, handler) {
        this.routes[path] = handler;
        return this;
    }

    use(fn) {
        this.middleware.push(fn);
        return this;
    }

    navigate(path) {
        const target = (path && path.startsWith('/')) ? path : '/' + (path || '');
        const targetPath = target.split('?')[0];
        const current = this._getPath();
        if (current === targetPath && !target.includes('?')) {
            this._resolve();
            return;
        }
        window.location.hash = target;
    }

    async _resolve() {
        const path = this._getPath();
        const query = { ...Object.fromEntries(new URLSearchParams(window.location.search)), ...this._getHashQuery() };

        this.previousRoute = this.currentRoute;
        this.currentRoute = path;

        let handler = this.routes[path] || this.routes['*'];

        if (!handler) {
            const errorModule = await import('../pages/errors.js').catch(() => null);
            if (errorModule) {
                errorModule.renderErrorPage(404);
            } else {
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-family:system-ui;"><h1>404 — Página no encontrada</h1></div>';
            }
            document.title = '404 — CONTEXTO';
            return;
        }

        try {
            for (const mw of this.middleware) {
                const result = await mw(path, query);
                if (result === false) return;
            }

            await handler(path, query);
            document.title = this._buildTitle(path);
        } catch (error) {
            console.error(`Error en ruta ${path}:`, error);
            const errorModule = await import('../pages/errors.js').catch(() => null);
            if (errorModule) {
                errorModule.renderErrorPage(500);
            } else {
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-family:system-ui;"><h1>500 — Error del servidor</h1></div>';
            }
            document.title = '500 — CONTEXTO';
        }
    }

    _buildTitle(path) {
        const titles = {
            '/': 'Inicio — CONTEXTO',
            '/login': 'Iniciar sesión — CONTEXTO',
            '/register': 'Registro — CONTEXTO',
            '/forgot-password': 'Recuperar contraseña — CONTEXTO',
            '/dashboard': '',
            '/patients': 'Pacientes — CONTEXTO',
            '/appointments': 'Citas — CONTEXTO',
            '/evaluations': 'Evaluaciones — CONTEXTO',
            '/tasks': 'Tareas terapéuticas — CONTEXTO',
            '/notes': 'Notas clínicas — CONTEXTO',
            '/reports': 'Reportes — CONTEXTO'
        };
        return titles[path] || 'CONTEXTO';
    }
}

export const router = new Router();