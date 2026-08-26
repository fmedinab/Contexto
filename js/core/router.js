// js/core/router.js
// Router SPA basado en hash (#/ruta).
// Se usa hash routing para que la app funcione en hosting estático
// (GitHub Pages) sin necesidad de configurar el servidor (sin 404 al refrescar).

import { authService } from '../services/authService.js';

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
        return hash;
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
        const current = this._getPath();
        if (current === target) {
            this._resolve();
            return;
        }
        window.location.hash = target;
    }

    async _resolve() {
        const path = this._getPath();
        const query = Object.fromEntries(new URLSearchParams(window.location.search));

        this.previousRoute = this.currentRoute;
        this.currentRoute = path;

        let handler = this.routes[path] || this.routes['*'];

        if (!handler) {
            console.warn(`Ruta no encontrada: ${path}`);
            handler = this.routes['404'] || (() => {});
        }

        try {
            for (const mw of this.middleware) {
                const result = await mw(path, query);
                if (result === false) return;
            }

            await handler(path, query);
            this._updatePageHeader(path);
            document.title = this._buildTitle(path);
        } catch (error) {
            console.error(`Error en ruta ${path}:`, error);
            window.app?.toast?.error('Error', 'No se pudo cargar la página solicitada.');
        }
    }

    _buildTitle(path) {
        const titles = {
            '/': 'Inicio — CONTEXTO',
            '/login': 'Iniciar sesión — CONTEXTO',
            '/register': 'Registro — CONTEXTO',
            '/forgot-password': 'Recuperar contraseña — CONTEXTO',
            '/dashboard': '',
            '/patients': 'Pacientes — CONTEXTO'
        };
        return titles[path] || 'CONTEXTO';
    }

    _updatePageHeader(path) {
        const titles = {
            '/': { title: 'Bienvenido', subtitle: 'Inicio' },
            '/login': { title: 'Iniciar sesión', subtitle: '' },
            '/register': { title: 'Crear cuenta', subtitle: '' },
            '/forgot-password': { title: 'Recuperar contraseña', subtitle: '' },
            '/dashboard': { title: '', subtitle: '' },
            '/patients': { title: 'Pacientes', subtitle: 'Gestión de pacientes' }
        };

        const pageData = titles[path] || { title: 'CONTEXTO', subtitle: '' };
        const pageTitle = document.getElementById('pageTitle');
        const pageSubtitle = document.getElementById('pageSubtitle');
        const pageHeader = document.getElementById('pageHeader');

        if (pageTitle) pageTitle.textContent = pageData.title;
        if (pageSubtitle) {
            pageSubtitle.textContent = pageData.subtitle;
            pageSubtitle.style.display = pageData.subtitle ? 'block' : 'none';
        }
        if (pageHeader) {
            pageHeader.style.display = pageData.subtitle || pageData.title ? 'block' : 'none';
        }
    }
}

export const router = new Router();