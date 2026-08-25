// js/components/error-state.js
// Componente de estado de error.

import { escapeHtml } from '../utils/sanitizer.js';

export class ErrorState {
    constructor(container = document.body) {
        this.container = container;
    }

    show(target, options = {}) {
        const {
            icon = '⚠',
            title = 'Error',
            description = 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
            actionLabel = 'Reintentar',
            onAction = null
        } = options;

        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) return null;

        element.innerHTML = `
            <div class="error-state">
                <div class="error-state-icon" aria-hidden="true">${icon}</div>
                <p class="error-state-title">${this.escapeHtml(title)}</p>
                <p class="error-state-description">${this.escapeHtml(description)}</p>
                ${actionLabel ? `<button class="btn btn--primary" id="errorRetryBtn">${this.escapeHtml(actionLabel)}</button>` : ''}
            </div>
        `;

        const actionBtn = element.querySelector('#errorRetryBtn');
        if (actionBtn && typeof onAction === 'function') {
            actionBtn.addEventListener('click', onAction);
        }

        return element;
    }
}
