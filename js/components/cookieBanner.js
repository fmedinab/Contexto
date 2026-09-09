// js/components/cookieBanner.js
// Banner de consentimiento de cookies para la landing y páginas legales.
// Guarda la elección en localStorage (clave `contexto_cookie_consent`).
// No se carga ningún script de analítica: el banner documenta el uso de
// cookies técnicas/preferencias y deja constancia del consentimiento.

const STORAGE_KEY = 'contexto_cookie_consent';
const CONSENT_ALL = 'all';
const CONSENT_NECESSARY = 'necessary';

class CookieBanner {
    constructor() {
        this._el = null;
    }

    // Devuelve el consentimiento almacenado: 'all' | 'necessary' | null.
    getConsent() {
        try {
            const v = localStorage.getItem(STORAGE_KEY);
            return v === CONSENT_ALL || v === CONSENT_NECESSARY ? v : null;
        } catch {
            return null;
        }
    }

    setConsent(value) {
        try { localStorage.setItem(STORAGE_KEY, value); } catch { /* noop */ }
    }

    // Inyecta el banner si aún no hay consentimiento y no existe en el DOM.
    ensure() {
        if (this.getConsent()) return;
        if (document.querySelector('.lp-cookie-banner')) return;

        const banner = document.createElement('div');
        banner.className = 'lp-cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-live', 'polite');
        banner.innerHTML = `
            <p>Usamos cookies técnicas y de preferencias para el funcionamiento del sitio.
               <a href="#/cookies">Más información</a></p>
            <div class="lp-cookie-actions">
                <button type="button" class="lp-cookie-btn lp-cookie-btn--accept" data-cookie="all">Aceptar todas</button>
                <button type="button" class="lp-cookie-btn" data-cookie="necessary">Solo necesarias</button>
            </div>`;

        banner.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-cookie]');
            if (!btn) return;
            this.setConsent(btn.dataset.cookie);
            banner.remove();
        });

        document.body.appendChild(banner);
        this._el = banner;
    }

    // Elimina el banner si está presente (previo a re-render de página).
    remove() {
        if (this._el) {
            this._el.remove();
            this._el = null;
        }
    }
}

export const cookieBanner = new CookieBanner();
export { STORAGE_KEY, CONSENT_ALL, CONSENT_NECESSARY };