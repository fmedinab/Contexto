// js/components/form-validation.js
// Validación de formularios completa.

export class FormValidation {
    constructor(form) {
        this.form = typeof form === 'string' ? document.querySelector(form) : form;
        this.fields = new Map();
        this.errors = new Map();
    }

    addField(name, options = {}) {
        const {
            required = false,
            validate = [],
            message = 'Campo inválido'
        } = options;

        this.fields.set(name, {
            element: this.form.querySelector(`[name="${name}"]`),
            required,
            validate,
            message
        });

        return this;
    }

    validate() {
        this.errors.clear();
        let isValid = true;

        this.fields.forEach((field, name) => {
            const value = field.element ? field.element.value.trim() : '';
            const fieldErrors = [];

            if (field.required && !value) {
                fieldErrors.push('Este campo es obligatorio.');
            }

            field.validate.forEach(rule => {
                const result = rule(value);
                if (result !== true) {
                    fieldErrors.push(result);
                }
            });

            if (fieldErrors.length > 0) {
                this.errors.set(name, fieldErrors);
                this.showError(name, fieldErrors[0]);
                isValid = false;
            } else {
                this.clearError(name);
            }
        });

        return isValid;
    }

    showError(fieldName, message) {
        const field = this.fields.get(fieldName);
        if (!field || !field.element) return;

        field.element.classList.add('input--error');
        field.element.classList.remove('input--success');

        let errorEl = field.element.parentNode.querySelector('.form-error');
        if (!errorEl) {
            errorEl = document.createElement('p');
            errorEl.className = 'form-error';
            field.element.parentNode.appendChild(errorEl);
        }
        errorEl.textContent = message;
    }

    clearError(fieldName) {
        const field = this.fields.get(fieldName);
        if (!field || !field.element) return;

        field.element.classList.remove('input--error');
        field.element.classList.add('input--success');

        const errorEl = field.element.parentNode.querySelector('.form-error');
        if (errorEl) errorEl.remove();
    }

    clearAllErrors() {
        this.fields.forEach((field, name) => this.clearError(name));
    }

    getErrors() {
        return Object.fromEntries(this.errors);
    }

    getData() {
        const data = {};
        this.fields.forEach((field, name) => {
            data[name] = field.element ? field.element.value.trim() : '';
        });
        return data;
    }

    reset() {
        this.fields.forEach((field) => {
            if (field.element) field.element.value = '';
        });
        this.clearAllErrors();
        this.errors.clear();
    }
}
