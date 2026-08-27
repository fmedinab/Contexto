// js/pages/errors.js
// Páginas de error personalizadas: 404, 403, 500, offline.
// Estilo visual consistente con CONTEXTO + animaciones llamativas.

const ERROR_PAGES = {
    404: {
        code: '404',
        title: 'Página no encontrada',
        message: 'La ruta que buscas no existe o fue movida a otro lugar.',
        icon: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="80" stroke="url(#errGrad404)" stroke-width="3" stroke-dasharray="8 6" class="err-orbit"/>
            <circle cx="100" cy="100" r="50" stroke="url(#errGrad404)" stroke-width="1.5" opacity="0.4" class="err-orbit-reverse"/>
            <text x="100" y="115" text-anchor="middle" font-size="48" font-weight="800" fill="url(#errGrad404)" class="err-code-text">?</text>
            <circle cx="100" cy="45" r="6" fill="#8b5cf6" class="err-dot-1"/>
            <circle cx="155" cy="100" r="4" fill="#38bdf8" class="err-dot-2"/>
            <circle cx="55" cy="120" r="5" fill="#a78bfa" class="err-dot-3"/>
            <defs>
                <linearGradient id="errGrad404" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#8b5cf6"/>
                    <stop offset="100%" stop-color="#38bdf8"/>
                </linearGradient>
            </defs>
        </svg>`,
        accent: '#8b5cf6',
    },
    403: {
        code: '403',
        title: 'Acceso denegado',
        message: 'No tienes permisos para acceder a esta sección.',
        icon: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="60" y="70" width="80" height="90" rx="12" stroke="url(#errGrad403)" stroke-width="3" class="err-lock-body"/>
            <path d="M80 70V55a20 20 0 0 1 40 0v15" stroke="url(#errGrad403)" stroke-width="3" stroke-linecap="round" class="err-lock-shackle"/>
            <circle cx="100" cy="112" r="8" fill="url(#errGrad403)" class="err-lock-keyhole"/>
            <circle cx="100" cy="125" r="3" fill="url(#errGrad403)" class="err-lock-keyhole"/>
            <circle cx="40" cy="50" r="4" fill="#ef4444" class="err-dot-1"/>
            <circle cx="160" cy="60" r="3" fill="#f97316" class="err-dot-2"/>
            <circle cx="50" cy="160" r="5" fill="#8b5cf6" class="err-dot-3"/>
            <defs>
                <linearGradient id="errGrad403" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ef4444"/>
                    <stop offset="100%" stop-color="#f97316"/>
                </linearGradient>
            </defs>
        </svg>`,
        accent: '#ef4444',
    },
    500: {
        code: '500',
        title: 'Error del servidor',
        message: 'Algo salió mal de nuestro lado. Estamos trabajando para solucionarlo.',
        icon: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="70" stroke="url(#errGrad500)" stroke-width="2" opacity="0.2" class="err-pulse-ring"/>
            <circle cx="100" cy="100" r="50" stroke="url(#errGrad500)" stroke-width="2" opacity="0.3" class="err-pulse-ring-delay"/>
            <path d="M85 75l30 50M115 75l-30 50" stroke="url(#errGrad500)" stroke-width="4" stroke-linecap="round" class="err-cross"/>
            <circle cx="100" cy="100" r="35" stroke="url(#errGrad500)" stroke-width="2.5" class="err-orbit"/>
            <circle cx="100" cy="65" r="5" fill="#ef4444" class="err-dot-1"/>
            <circle cx="135" cy="100" r="4" fill="#f97316" class="err-dot-2"/>
            <circle cx="75" cy="130" r="3" fill="#eab308" class="err-dot-3"/>
            <defs>
                <linearGradient id="errGrad500" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ef4444"/>
                    <stop offset="50%" stop-color="#f97316"/>
                    <stop offset="100%" stop-color="#eab308"/>
                </linearGradient>
            </defs>
        </svg>`,
        accent: '#f97316',
    },
    offline: {
        code: 'OFFLINE',
        title: 'Sin conexión',
        message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
        icon: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M40 80 Q100 30 160 80" stroke="url(#errGradOff)" stroke-width="2.5" opacity="0.2" class="err-wave-1"/>
            <path d="M55 100 Q100 60 145 100" stroke="url(#errGradOff)" stroke-width="2.5" opacity="0.35" class="err-wave-2"/>
            <path d="M70 120 Q100 90 130 120" stroke="url(#errGradOff)" stroke-width="2.5" opacity="0.55" class="err-wave-3"/>
            <circle cx="100" cy="140" r="8" fill="url(#errGradOff)" class="err-dot-center"/>
            <line x1="100" y1="140" x2="60" y2="75" stroke="#ef4444" stroke-width="3" stroke-linecap="round" class="err-slash-1"/>
            <line x1="100" y1="140" x2="140" y2="75" stroke="#ef4444" stroke-width="3" stroke-linecap="round" class="err-slash-2"/>
            <circle cx="35" cy="60" r="3" fill="#8b5cf6" class="err-dot-1"/>
            <circle cx="165" cy="55" r="4" fill="#38bdf8" class="err-dot-2"/>
            <defs>
                <linearGradient id="errGradOff" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#8b5cf6"/>
                    <stop offset="100%" stop-color="#38bdf8"/>
                </linearGradient>
            </defs>
        </svg>`,
        accent: '#8b5cf6',
    },
};

export function renderErrorPage(code = 404) {
    const page = ERROR_PAGES[code] || ERROR_PAGES[404];
    const pageBody = document.getElementById('pageBody');
    if (!pageBody) return;

    pageBody.className = 'app--error';
    pageBody.innerHTML = `
        <div class="error-page">
            <div class="error-icon">${page.icon}</div>
            <div class="error-code" style="--err-accent:${page.accent}">${page.code}</div>
            <h1 class="error-title">${page.title}</h1>
            <p class="error-message">${page.message}</p>
            <div class="error-actions">
                <button class="error-btn error-btn--primary" onclick="window.router.navigate('/dashboard')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Volver al inicio
                </button>
                <button class="error-btn error-btn--ghost" onclick="history.back()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Volver atrás
                </button>
            </div>
            <div class="error-particles" aria-hidden="true">
                ${Array.from({ length: 20 }, (_, i) => {
                    const size = 2 + Math.random() * 4;
                    const x = Math.random() * 100;
                    const delay = Math.random() * 5;
                    const duration = 3 + Math.random() * 4;
                    const color = ['#8b5cf6', '#38bdf8', '#a78bfa', '#60a5fa'][i % 4];
                    return `<span class="err-particle" style="
                        width:${size}px;height:${size}px;
                        left:${x}%;
                        background:${color};
                        animation-delay:${delay.toFixed(1)}s;
                        animation-duration:${duration.toFixed(1)}s;
                    "></span>`;
                }).join('')}
            </div>
        </div>`;

    document.title = `${page.code} — CONTEXTO`;
}

export function renderErrorInline(code = 404) {
    const page = ERROR_PAGES[code] || ERROR_PAGES[404];
    return `
        <div class="error-page error-page--inline">
            <div class="error-icon error-icon--sm">${page.icon}</div>
            <div class="error-code error-code--sm" style="--err-accent:${page.accent}">${page.code}</div>
            <h2 class="error-title error-title--sm">${page.title}</h2>
            <p class="error-message error-message--sm">${page.message}</p>
            <button class="error-btn error-btn--primary" onclick="window.router.navigate('/dashboard')">
                Volver al inicio
            </button>
        </div>`;
}
