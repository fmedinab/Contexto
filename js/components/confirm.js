// js/components/confirm.js
// Wrapper para confirmaciones modales.

export class Confirm {
    constructor(modal) {
        this.modal = modal;
    }

    show(options = {}) {
        if (!this.modal) {
            const message = options.message || options.title || '¿Confirmar acción?';
            return Promise.resolve(window.confirm(message));
        }
        return this.modal.confirm(options);
    }
}
