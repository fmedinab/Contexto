// js/components/toast.js
// Sistema global de notificaciones toast.

import { escapeHtml } from '../utils/sanitizer.js';

export class Toast {
    constructor() {
        this.container = document.getElementById('toastContainer');
        this.toasts = new Map();
        this.defaultDuration = 5000;
    }

    show(options = {}) {
        const {
            type = 'info',
            title = '',
            message = '',
            duration = this.defaultDuration,
            closable = true,
            onClose = null
        } = options;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
            <span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span>
            <div class="toast-content">
                ${title ? `<p class="toast-title">${escapeHtml(title)}</p>` : ''}
                ${message ? `<p class="toast-message">${escapeHtml(message)}</p>` : ''}
            </div>
            ${closable ? `
                <button class="toast-close" aria-label="Cerrar notificación" data-action="close">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            ` : ''}
        `;

        this.container.appendChild(toast);
        const id = Date.now() + Math.random();
        this.toasts.set(id, toast);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
        });

        const closeBtn = toast.querySelector('[data-action="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.dismiss(id));
        }

        let timeoutId = null;
        if (duration > 0) {
            timeoutId = setTimeout(() => this.dismiss(id), duration);
        }

        this.toasts.get(id)._timeoutId = timeoutId;
        this.toasts.get(id)._onClose = onClose;

        return id;
    }

    dismiss(id) {
        const toast = this.toasts.get(id);
        if (!toast) return;

        if (toast._timeoutId) clearTimeout(toast._timeoutId);

        toast.classList.add('hiding');
        toast.classList.remove('show');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(id);
            if (toast._onClose) toast._onClose();
        }, 300);
    }

    success(title, message, duration) {
        return this.show({ type: 'success', title, message, duration });
    }

    error(title, message, duration) {
        return this.show({ type: 'error', title, message, duration });
    }

    warning(title, message, duration) {
        return this.show({ type: 'warning', title, message, duration });
    }

    info(title, message, duration) {
        return this.show({ type: 'info', title, message, duration });
    }
}
