import { Roles } from '../core/roles.js';

// js/core/permissions.js
// Catálogo de permisos del sistema.

export const Permissions = {
    DASHBOARD_VIEW: 'dashboard:view',

    PATIENTS_VIEW: 'patients:view',
    PATIENTS_CREATE: 'patients:create',
    PATIENTS_EDIT: 'patients:edit',
    PATIENTS_DELETE: 'patients:delete',
    PATIENTS_VIEW_OWN: 'patients:view_own',

    APPOINTMENTS_VIEW: 'appointments:view',
    APPOINTMENTS_CREATE: 'appointments:create',
    APPOINTMENTS_EDIT: 'appointments:edit',
    APPOINTMENTS_DELETE: 'appointments:delete',
    APPOINTMENTS_VIEW_OWN: 'appointments:view_own',

    SESSIONS_VIEW: 'sessions:view',
    SESSIONS_CREATE: 'sessions:create',
    SESSIONS_EDIT: 'sessions:edit',
    SESSIONS_DELETE: 'sessions:delete',
    SESSIONS_VIEW_OWN: 'sessions:view_own',

    ASSESSMENTS_VIEW: 'assessments:view',
    ASSESSMENTS_CREATE: 'assessments:create',
    ASSESSMENTS_EDIT: 'assessments:edit',
    ASSESSMENTS_DELETE: 'assessments:delete',
    ASSESSMENTS_VIEW_OWN: 'assessments:view_own',

    REPORTS_VIEW: 'reports:view',
    REPORTS_CREATE: 'reports:create',
    REPORTS_EXPORT: 'reports:export',

    SETTINGS_VIEW: 'settings:view',
    SETTINGS_EDIT: 'settings:edit',

    ADMIN_USERS: 'admin:users',
    ADMIN_ROLES: 'admin:roles',
    ADMIN_AUDIT: 'admin:audit',
    ADMIN_SETTINGS: 'admin:settings'
};

export const PermissionLabels = {
    [Permissions.DASHBOARD_VIEW]: 'Ver dashboard',

    [Permissions.PATIENTS_VIEW]: 'Ver pacientes',
    [Permissions.PATIENTS_CREATE]: 'Crear pacientes',
    [Permissions.PATIENTS_EDIT]: 'Editar pacientes',
    [Permissions.PATIENTS_DELETE]: 'Eliminar pacientes',
    [Permissions.PATIENTS_VIEW_OWN]: 'Ver propio perfil',

    [Permissions.APPOINTMENTS_VIEW]: 'Ver citas',
    [Permissions.APPOINTMENTS_CREATE]: 'Crear citas',
    [Permissions.APPOINTMENTS_EDIT]: 'Editar citas',
    [Permissions.APPOINTMENTS_DELETE]: 'Eliminar citas',
    [Permissions.APPOINTMENTS_VIEW_OWN]: 'Ver mis citas',

    [Permissions.SESSIONS_VIEW]: 'Ver sesiones',
    [Permissions.SESSIONS_CREATE]: 'Crear sesiones',
    [Permissions.SESSIONS_EDIT]: 'Editar sesiones',
    [Permissions.SESSIONS_DELETE]: 'Eliminar sesiones',
    [Permissions.SESSIONS_VIEW_OWN]: 'Ver mis sesiones',

    [Permissions.ASSESSMENTS_VIEW]: 'Ver evaluaciones',
    [Permissions.ASSESSMENTS_CREATE]: 'Crear evaluaciones',
    [Permissions.ASSESSMENTS_EDIT]: 'Editar evaluaciones',
    [Permissions.ASSESSMENTS_DELETE]: 'Eliminar evaluaciones',
    [Permissions.ASSESSMENTS_VIEW_OWN]: 'Ver mis evaluaciones',

    [Permissions.REPORTS_VIEW]: 'Ver informes',
    [Permissions.REPORTS_CREATE]: 'Crear informes',
    [Permissions.REPORTS_EXPORT]: 'Exportar informes',

    [Permissions.SETTINGS_VIEW]: 'Ver configuración',
    [Permissions.SETTINGS_EDIT]: 'Editar configuración',

    [Permissions.ADMIN_USERS]: 'Gestionar usuarios',
    [Permissions.ADMIN_ROLES]: 'Gestionar roles',
    [Permissions.ADMIN_AUDIT]: 'Ver auditoría',
    [Permissions.ADMIN_SETTINGS]: 'Gestionar configuración global'
};

export const RolePermissions = {
    [Roles.ADMIN]: Object.values(Permissions),

    [Roles.PSYCHOLOGIST]: [
        Permissions.DASHBOARD_VIEW,
        Permissions.PATIENTS_VIEW, Permissions.PATIENTS_CREATE, Permissions.PATIENTS_EDIT,
        Permissions.APPOINTMENTS_VIEW, Permissions.APPOINTMENTS_CREATE, Permissions.APPOINTMENTS_EDIT, Permissions.APPOINTMENTS_DELETE,
        Permissions.SESSIONS_VIEW, Permissions.SESSIONS_CREATE, Permissions.SESSIONS_EDIT, Permissions.SESSIONS_DELETE,
        Permissions.ASSESSMENTS_VIEW, Permissions.ASSESSMENTS_CREATE, Permissions.ASSESSMENTS_EDIT, Permissions.ASSESSMENTS_DELETE,
        Permissions.REPORTS_VIEW, Permissions.REPORTS_CREATE, Permissions.REPORTS_EXPORT,
        Permissions.SETTINGS_VIEW
    ],

    [Roles.ASSISTANT]: [
        Permissions.DASHBOARD_VIEW,
        Permissions.APPOINTMENTS_VIEW, Permissions.APPOINTMENTS_CREATE, Permissions.APPOINTMENTS_EDIT,
        Permissions.PATIENTS_VIEW, Permissions.PATIENTS_CREATE,
        Permissions.SESSIONS_VIEW
    ],

    [Roles.PATIENT]: [
        Permissions.DASHBOARD_VIEW,
        Permissions.APPOINTMENTS_VIEW_OWN,
        Permissions.SESSIONS_VIEW_OWN,
        Permissions.ASSESSMENTS_VIEW_OWN,
        Permissions.PATIENTS_VIEW_OWN
    ]
};
