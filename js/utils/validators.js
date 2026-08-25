// js/utils/validators.js
// Validaciones reutilizables centralizadas.

export function validateRequired(value) {
    if (!value || value.trim() === '') return 'Este campo es obligatorio.';
    return true;
}

export function validateEmail(value) {
    if (!value) return true;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(value)) return 'Ingresa un correo electrónico válido.';
    return true;
}

export function validatePhone(value) {
    if (!value) return true;
    const cleaned = value.replace(/[\s\-()]/g, '');
    if (!/^\+?[\d]{7,15}$/.test(cleaned)) return 'Ingresa un número de teléfono válido.';
    return true;
}

export function validateLength(value, min, max) {
    if (!value) return true;
    if (value.length < min) return `Debe tener al menos ${min} caracteres.`;
    if (value.length > max) return `No debe superar los ${max} caracteres.`;
    return true;
}

export function validateNumber(value, min, max) {
    const num = parseFloat(value);
    if (isNaN(num)) return 'Debe ser un número válido.';
    if (min !== undefined && num < min) return `El valor mínimo es ${min}.`;
    if (max !== undefined && num > max) return `El valor máximo es ${max}.`;
    return true;
}

export function validateDate(value) {
    if (!value) return true;
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Ingresa una fecha válida.';
    return true;
}

export function validateDateNotFuture(value) {
    if (!value) return true;
    const date = new Date(value);
    const now = new Date();
    if (date > now) return 'La fecha no puede ser futura.';
    return true;
}

export function validatePassword(value) {
    if (!value) return true;
    if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!/[A-Z]/.test(value)) return 'Debe incluir al menos una letra mayúscula.';
    if (!/[a-z]/.test(value)) return 'Debe incluir al menos una letra minúscula.';
    if (!/[0-9]/.test(value)) return 'Debe incluir al menos un número.';
    return true;
}

export function validateMatch(value, compareValue, fieldName = 'campo') {
    if (value !== compareValue) return `Debe coincidir con ${fieldName}.`;
    return true;
}

export function validateUrl(value) {
    if (!value) return true;
    try {
        new URL(value);
        return true;
    } catch {
        return 'Ingresa una URL válida.';
    }
}

export function validateDni(value) {
    if (!value) return true;
    const cleaned = value.replace(/[\s\-]/g, '');
    if (!/^[\d]{7,8}[A-Za-z]?$/.test(cleaned)) return 'Ingresa un DNI válido.';
    return true;
}

export function validateAge(value) {
    if (!value) return true;
    const age = parseInt(value, 10);
    if (isNaN(age) || age < 0 || age > 120) return 'Edad inválida.';
    return true;
}
