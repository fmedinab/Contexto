// js/core/theme.js
// Gestión del tema oscuro/claro de la aplicación.

export class ThemeManager {
    constructor() {
        this.storageKey = 'contexto-theme';
        this.currentTheme = 'dark';
        this.init();
    }

    init() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.setTheme(stored, false);
            } else {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                this.setTheme(prefersDark ? 'dark' : 'light', false);
            }
        } catch {
            this.setTheme('dark', false);
        }

        this.bindEvents();
    }

    bindEvents() {
        try {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                let stored = null;
                try { stored = localStorage.getItem(this.storageKey); } catch { /* noop */ }
                if (!stored) {
                    this.setTheme(e.matches ? 'dark' : 'light', false);
                }
            });
        } catch { /* noop */ }
    }

    toggle() {
        const next = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(next, true);
        return next;
    }

    setTheme(theme, save = true) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);

        // Mantener sincronizada la clase `.light-mode` que usa el dashboard (css/dashboard-new.css).
        // Un solo punto de verdad: data-theme en <html> y light-mode se aplican juntos.
        const appEl = document.getElementById('app');
        if (appEl) {
            appEl.classList.toggle('light-mode', theme === 'light');
        }

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', theme === 'dark' ? '#0a0a14' : '#f8fafc');
        }

        if (save) {
            try {
                localStorage.setItem(this.storageKey, theme);
            } catch { /* noop */ }
        }
    }

    getTheme() {
        return this.currentTheme;
    }
}
