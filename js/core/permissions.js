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

    TASKS_VIEW: 'tasks:view',
    TASKS_CREATE: 'tasks:create',
    TASKS_EDIT: 'tasks:edit',
    TASKS_DELETE: 'tasks:delete',
    TASKS_VIEW_OWN: 'tasks:view_own',

    NOTES_VIEW: 'notes:view',
    NOTES_CREATE: 'notes:create',
    NOTES_EDIT: 'notes:edit',
    NOTES_DELETE: 'notes:delete',
    NOTES_VIEW_OWN: 'notes:view_own',

    REPORTS_VIEW: 'reports:view',
    REPORTS_CREATE: 'reports:create',
    REPORTS_EXPORT: 'reports:export',

    SETTINGS_VIEW: 'settings:view',
    SETTINGS_EDIT: 'settings:edit',

    CMS_MANAGE: 'cms:manage',

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

    [Permissions.TASKS_VIEW]: 'Ver tareas terapéuticas',
    [Permissions.TASKS_CREATE]: 'Crear tareas terapéuticas',
    [Permissions.TASKS_EDIT]: 'Editar tareas terapéuticas',
    [Permissions.TASKS_DELETE]: 'Eliminar tareas terapéuticas',
    [Permissions.TASKS_VIEW_OWN]: 'Ver mis tareas',

    [Permissions.NOTES_VIEW]: 'Ver notas clínicas',
    [Permissions.NOTES_CREATE]: 'Crear notas clínicas',
    [Permissions.NOTES_EDIT]: 'Editar notas clínicas',
    [Permissions.NOTES_DELETE]: 'Eliminar notas clínicas',
    [Permissions.NOTES_VIEW_OWN]: 'Ver mis notas',

    [Permissions.REPORTS_VIEW]: 'Ver informes',
    [Permissions.REPORTS_CREATE]: 'Crear informes',
    [Permissions.REPORTS_EXPORT]: 'Exportar informes',

    [Permissions.SETTINGS_VIEW]: 'Ver configuración',
    [Permissions.SETTINGS_EDIT]: 'Editar configuración',

    [Permissions.CMS_MANAGE]: 'Gestionar contenido del sitio',

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
        Permissions.TASKS_VIEW, Permissions.TASKS_CREATE, Permissions.TASKS_EDIT, Permissions.TASKS_DELETE,
        Permissions.NOTES_VIEW, Permissions.NOTES_CREATE, Permissions.NOTES_EDIT, Permissions.NOTES_DELETE,
        Permissions.REPORTS_VIEW, Permissions.REPORTS_CREATE, Permissions.REPORTS_EXPORT,
        Permissions.SETTINGS_VIEW
    ],

    // El asistente es administrativo: agenda, pacientes y solicitudes.
    // NO lleva tareas ni notas clínicas — son datos terapéuticos y el
    // dashboard ya lo restringía por rol en los modales; esta matriz
    // ahora coincide con ese comportamiento (bug B1.5 / B2.4).
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
        Permissions.TASKS_VIEW_OWN,
        Permissions.NOTES_VIEW_OWN,
        Permissions.PATIENTS_VIEW_OWN
    ]
};
