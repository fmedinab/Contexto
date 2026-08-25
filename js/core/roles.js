// js/core/roles.js
// Catálogo de roles del sistema.

export const Roles = {
    ADMIN: 'admin',
    PSYCHOLOGIST: 'psychologist',
    ASSISTANT: 'assistant',
    PATIENT: 'patient'
};

export const RoleLabels = {
    [Roles.ADMIN]: 'Administrador',
    [Roles.PSYCHOLOGIST]: 'Psicólogo',
    [Roles.ASSISTANT]: 'Recepcionista',
    [Roles.PATIENT]: 'Paciente'
};

export const RoleDescriptions = {
    [Roles.ADMIN]: 'Acceso total al sistema.',
    [Roles.PSYCHOLOGIST]: 'Gestión clínica y administrativa.',
    [Roles.ASSISTANT]: 'Agenda y atención administrativa.',
    [Roles.PATIENT]: 'Acceso limitado a su información.'
};
