// js/components/modal.js
// Componente modal reutilizable.

import { escapeHtml } from '../utils/sanitizer.js';

export class Modal {
    constructor() {
        this.container = document.getElementById('modalContainer');
        this.activeModal = null;
        this.previousActiveElement = null;
    }

    open(options = {}) {
        const {
            title = '',
            content = '',
            actions = [],
            size = 'md',
            closeOnOverlay = true,
            closeOnEscape = true,
            onOpen = null,
            onClose = null
        } = options;

        this.previousActiveElement = document.activeElement;

        const modal = document.createElement('div');
        modal.className = 'modal-container active';
        modal.setAttribute('aria-hidden', 'false');
        modal.innerHTML = `
            <div class="modal-backdrop" aria-hidden="true"></div>
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" style="--modal-max-width: ${this.getSizeWidth(size)}">
                <div class="modal-header">
                    <h2 class="modal-title" id="modalTitle">${escapeHtml(title)}</h2>
                    <button class="modal-close" aria-label="Cerrar modal" data-action="close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">${content}</div>
                ${actions.length > 0 ? `
                    <div class="modal-footer">
                        ${actions.map((action, i) => `
                            <button class="btn btn--${action.variant || 'secondary'}" data-action="action" data-index="${i}" ${action.disabled ? 'disabled' : ''}>
                                ${action.loading ? '<span class="spinner spinner--sm btn-spinner"></span>' : ''}
                                ${escapeHtml(action.label)}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        this.container.appendChild(modal);
        this.activeModal = modal;

        const modalEl = modal.querySelector('.modal');
        const focusableElements = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            setTimeout(() => focusableElements[0].focus(), 0);
        }

        modal.addEventListener('click', (e) => {
            if (closeOnOverlay && e.target.classList.contains('modal-backdrop')) {
                this.close();
            }
        });

        modal.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });

        modal.querySelectorAll('[data-action="action"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index, 10);
                if (actions[index] && typeof actions[index].onClick === 'function') {
                    actions[index].onClick(modal);
                }
            });
        });

        if (closeOnEscape) {
            this._escapeHandler = (e) => {
                if (e.key === 'Escape') this.close();
            };
            document.addEventListener('keydown', this._escapeHandler);
        }

        document.body.style.overflow = 'hidden';

        if (typeof onOpen === 'function') onOpen(modal);
        if (typeof onClose === 'function') this._onClose = onClose;

        return modal;
    }

    close() {
        if (!this.activeModal) return;

        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeHandler = null;
        }

        this.activeModal.classList.remove('active');
        this.activeModal.setAttribute('aria-hidden', 'true');

        setTimeout(() => {
            if (this.activeModal && this.activeModal.parentNode) {
                this.activeModal.parentNode.removeChild(this.activeModal);
            }
            this.activeModal = null;
            document.body.style.overflow = '';
            if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
                this.previousActiveElement.focus();
            }
            if (typeof this._onClose === 'function') this._onClose();
        }, 250);
    }

    confirm(options = {}) {
        const {
            title = 'Confirmar',
            message = '¿Estás seguro?',
            confirmLabel = 'Confirmar',
            cancelLabel = 'Cancelar',
            confirmVariant = 'primary',
            onConfirm = null,
            onCancel = null,
            danger = false
        } = options;

        return new Promise((resolve) => {
            this.open({
                title,
                size: 'sm',
                content: `
                    <div class="confirm-dialog">
                        <div class="confirm-icon confirm-icon--danger">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </div>
                        <h3 class="confirm-title">${escapeHtml(title)}</h3>
                        <p class="confirm-message">${escapeHtml(message)}</p>
                    </div>
                `,
                actions: [
                    {
                        label: cancelLabel,
                        variant: 'secondary',
                        onClick: () => {
                            this.close();
                            if (typeof onCancel === 'function') onCancel();
                            resolve(false);
                        }
                    },
                    {
                        label: confirmLabel,
                        variant: danger ? 'danger' : confirmVariant,
                        onClick: () => {
                            this.close();
                            if (typeof onConfirm === 'function') onConfirm();
                            resolve(true);
                        }
                    }
                ]
            });
        });
    }

    getSizeWidth(size) {
        const sizes = {
            sm: '400px',
            md: '520px',
            lg: '720px',
            full: 'calc(100vw - 32px)'
        };
        return sizes[size] || sizes.md;
    }
}
