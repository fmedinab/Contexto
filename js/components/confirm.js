// js/components/confirm.js
// Wrapper para confirmaciones modales.

export class Confirm {
    constructor(modal) {
        this.modal = modal;
    }

    show(options = {}) {
        return this.modal.confirm(options);
    }
}
