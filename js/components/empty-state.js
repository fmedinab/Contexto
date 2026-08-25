// js/components/empty-state.js
// Componente de estado vacío.

import { escapeHtml } from '../utils/sanitizer.js';

export class EmptyState {
    constructor(container = document.body) {
        this.container = container;
    }

    show(target, options = {}) {
        const {
            icon = '◈',
            title = 'Sin resultados',
            description = 'No hay datos para mostrar en este momento.',
            actionLabel = '',
            onAction = null
        } = options;

        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) return null;

        element.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon" aria-hidden="true">${icon}</div>
                <p class="empty-state-title">${this.escapeHtml(title)}</p>
                <p class="empty-state-description">${this.escapeHtml(description)}</p>
                ${actionLabel ? `<div class="empty-state-action"><button class="btn btn--primary">${this.escapeHtml(actionLabel)}</button></div>` : ''}
            </div>
        `;

        const actionBtn = element.querySelector('.empty-state-action .btn');
        if (actionBtn && typeof onAction === 'function') {
            actionBtn.addEventListener('click', onAction);
        }

        return element;
    }
}
