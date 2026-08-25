// js/components/alert.js
// Componente de alerta reutilizable.

import { escapeHtml } from '../utils/sanitizer.js';

export class Alert {
    constructor(container = document.body) {
        this.container = container;
        this.alerts = [];
    }

    show(options = {}) {
        const {
            type = 'info',
            title = '',
            message = '',
            closable = true,
            onClose = null
        } = options;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const alert = document.createElement('div');
        alert.className = `alert alert--${type}`;
        alert.innerHTML = `
            <span class="alert-icon" aria-hidden="true">${icons[type] || icons.info}</span>
            <div class="alert-content">
                ${title ? `<p class="alert-title">${this.escapeHtml(title)}</p>` : ''}
                ${message ? `<p class="alert-message">${this.escapeHtml(message)}</p>` : ''}
            </div>
            ${closable ? `<button class="alert-close" aria-label="Cerrar alerta" data-action="close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>` : ''}
        `;

        this.container.insertBefore(alert, this.container.firstChild);
        this.alerts.push(alert);

        const closeBtn = alert.querySelector('[data-action="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.dismiss(alert));
        }

        alert._onClose = onClose;
        return alert;
    }

    dismiss(alert) {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            if (alert.parentNode) alert.parentNode.removeChild(alert);
            this.alerts = this.alerts.filter(a => a !== alert);
            if (alert._onClose) alert._onClose();
        }, 250);
    }

    dismissAll() {
        this.alerts.forEach(alert => this.dismiss(alert));
    }

    success(title, message) {
        return this.show({ type: 'success', title, message });
    }

    error(title, message) {
        return this.show({ type: 'error', title, message });
    }

    warning(title, message) {
        return this.show({ type: 'warning', title, message });
    }

    info(title, message) {
        return this.show({ type: 'info', title, message });
    }
}
