// js/core/theme.js
// Gestión del tema oscuro/claro de la aplicación.

export class ThemeManager {
    constructor() {
        this.storageKey = 'contexto-theme';
        this.currentTheme = 'dark';
        this.init();
    }

    init() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            this.setTheme(stored, false);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light', false);
        }

        this.bindEvents();
    }

    bindEvents() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.storageKey)) {
                this.setTheme(e.matches ? 'dark' : 'light', false);
            }
        });
    }

    toggle() {
        const next = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(next, true);
        return next;
    }

    setTheme(theme, save = true) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelector('meta[name="theme-color"]').setAttribute('content',
            theme === 'dark' ? '#0a0a14' : '#f8fafc'
        );

        if (save) {
            localStorage.setItem(this.storageKey, theme);
        }
    }

    getTheme() {
        return this.currentTheme;
    }
}
