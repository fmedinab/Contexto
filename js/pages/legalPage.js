// js/pages/legalPage.js
// Página legal (Privacidad / Cookies / Aviso Legal).
// Renderiza contenido dinámico de la sección `legal` del CMS con el mismo
// estilo visual de la landing (variables de tema).

import { cmsService } from '../services/cmsService.js';
import { cookieBanner } from '../components/cookieBanner.js';

const LEGAL_ROUTES = {
    '/privacidad': 'privacy',
    '/cookies': 'cookies',
    '/aviso-legal': 'notice'
};

const PAGE_TITLES = {
    '/privacidad': 'Política de Privacidad',
    '/cookies': 'Política de Cookies',
    '/aviso-legal': 'Aviso Legal'
};

function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
}

export class LegalPage {
    constructor() {
        this.container = document.getElementById('pageBody');
        this._cms = null;
    }

    async render() {
        if (!this.container) return;
        this.container.className = 'page-body';

        const cms = await cmsService.getLandingContent().catch(() => null);
        this._cms = cms || cmsService.getDefaultContent();

        const hash = (window.location.hash || '').replace(/^#/, '') || '/';
        const prefix = LEGAL_ROUTES[hash] || 'privacy';
        const title = PAGE_TITLES[hash in LEGAL_ROUTES ? hash : '/privacidad'];
        const activeKey = hash in LEGAL_ROUTES ? hash : '/privacidad';

        this.container.innerHTML = this._shell(prefix, title, activeKey);
        cookieBanner.ensure();
    }

    destroy() {
        cookieBanner.remove();
        this._cms = null;
        this.container = null;
    }

    _t(key) {
        const val = this._cms?.legal?.[key];
        return (val === undefined || val === null) ? '—' : val;
    }

    _shell(prefix, title, activeKey) {
        const navItems = Object.entries(PAGE_TITLES).map(([route, label]) => {
            const isActive = route === activeKey;
            return `<a href="#${route}" class="lp-legal-link${isActive ? ' is-active' : ''}"${isActive ? ' aria-current="page"' : ''}>${label}</a>`;
        }).join('');

        return `
        <div class="lp-page" id="lpPage">
            <header class="lp-header is-scrolled" id="lpHeader">
                <div class="lp-container lp-header-inner">
                    <a href="#/" class="lp-brand" aria-label="Ir al inicio">
                        <svg class="lp-brand-mark" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                            <path d="M64 15C43 15 26 32 26 53c0 21 17 38 38 38" stroke="var(--lp-heading)" stroke-width="6" stroke-linecap="round"/>
                            <circle cx="50" cy="35" r="8" fill="#7E8F79"/>
                            <circle cx="35" cy="53" r="8" fill="#1D3348"/>
                            <circle cx="65" cy="53" r="8" fill="#5F757C"/>
                            <circle cx="50" cy="71" r="8" fill="#C7A15F"/>
                        </svg>
                        <span>
                            <span class="lp-brand-name">CONTEXTO</span>
                            <span class="lp-brand-sub">Psicología</span>
                        </span>
                    </a>
                    <nav class="lp-legal-nav" aria-label="Documentos legales">
                        ${navItems}
                    </nav>
                    <a href="#/" class="lp-btn lp-btn--ghost lp-legal-back">← Inicio</a>
                </div>
            </header>

            <main class="lp-legal-main">
                <div class="lp-container lp-legal-container">
                    <article class="lp-legal-article">
                        <span class="lp-eyebrow" style="color:var(--primary);">CONTEXTO · Legal</span>
                        <h1 class="lp-section-title lp-legal-title">${_esc(this._t(prefix + '_title'))}</h1>
                        <p class="lp-legal-updated">${_esc(this._t(prefix + '_updated'))}</p>
                        <p class="lp-legal-intro">${_esc(this._t(prefix + '_intro'))}</p>
                        <div class="lp-legal-content">${this._t(prefix + '_content').split(/\n{2,}/).map(p => `<p>${_esc(p.replace(/\n/g, '<br>'))}</p>`).join('\n')}</div>
                    </article>
                </div>
            </main>

            <footer class="lp-footer" style="border-top:1px solid var(--border);padding:24px 0;">
                <div class="lp-container">
                    <div class="lp-footer-bottom">
                        <span>© 2026 CONTEXTO Psicología · Centro de Ciencias Comportamentales</span>
                    </div>
                </div>
            </footer>
        </div>`;
    }
}