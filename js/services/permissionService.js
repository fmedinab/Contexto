// js/services/permissionService.js
// Servicio de verificación de permisos basado en roles.

import { Roles } from '../core/roles.js';
import { RolePermissions, Permissions } from '../core/permissions.js';
import { authService } from './authService.js';

export class PermissionService {
    constructor() {
        this.userRoles = [];
        this.userPermissions = new Set();
        // Último error al cargar los roles. Existe para poder distinguir
        // "el usuario no tiene roles" de "no se pudo consultar si los tiene".
        // Sin esa distinción, un fallo de red silencioso expulsaba al
        // usuario al portal de paciente (bug B1.1).
        this.loadError = null;
        this._loadUserRoles();
    }

    async _loadUserRoles() {
        this.loadError = null;

        const user = authService.getCurrentUser();
        if (!user) return;

        const { data, error } = await authService.getSupabaseClient()
            .from('user_roles')
            .select(`
                role_id,
                roles (
                    name
                )
            `)
            .eq('user_id', user.id);

        // Fallo real de la consulta: se registra y se marca. No se pisa
        // userRoles, para no convertir un error de red en "sin permisos".
        if (error) {
            this.loadError = error;
            console.error('[PermissionService] No se pudieron cargar los roles:', error.message || error);
            return;
        }
        if (!data) {
            this.loadError = new Error('Respuesta vacía al consultar los roles');
            return;
        }

        this.userRoles = data.map(ur => ur.roles?.name).filter(Boolean);
        this._recalculatePermissions();
    }

    /* True si la consulta de roles falló. El guard de rutas debe usar esto
       para mostrar un error en vez de degradar al usuario a paciente. */
    hasLoadError() {
        return this.loadError !== null;
    }

    _recalculatePermissions() {
        this.userPermissions.clear();
        this.userRoles.forEach(role => {
            const perms = RolePermissions[role] || [];
            perms.forEach(p => this.userPermissions.add(p));
        });
    }

    hasPermission(permission) {
        return this.userPermissions.has(permission);
    }

    hasAnyPermission(permissions = []) {
        return permissions.some(p => this.hasPermission(p));
    }

    hasAllPermissions(permissions = []) {
        return permissions.every(p => this.hasPermission(p));
    }

    hasRole(role) {
        return this.userRoles.includes(role);
    }

    isAdmin() {
        return this.hasRole(Roles.ADMIN);
    }

    isPsychologist() {
        return this.hasRole(Roles.PSYCHOLOGIST);
    }

    isAssistant() {
        return this.hasRole(Roles.ASSISTANT);
    }

    isPatient() {
        return this.hasRole(Roles.PATIENT);
    }

    /* Rol de staff (puede gestionar pacientes). Si no hay ningún rol cargado,
       NO se considera staff: así /dashboard nunca falla abierto hacia el panel
       de gestión por roles no cargados aún. */
    isStaff() {
        return this.hasRole(Roles.ADMIN) ||
               this.hasRole(Roles.PSYCHOLOGIST) ||
               this.hasRole(Roles.ASSISTANT);
    }

    /* Un usuario de staff real casi siempre tiene roles cargados. Si la
       consulta falló y aun así no hay ningún rol, no se puede decidir:
       devolver 'unknown' para que la UI muestre un error en vez de
       expulsar silenciosamente a un psicólogo a su portal de paciente. */
    staffStatus() {
        if (this.hasLoadError()) return 'unknown';
        if (!this.userRoles.length) return 'none';
        return this.isStaff() ? 'staff' : 'patient';
    }

    /* Mapa ruta → permisos requeridos.

       Solo se listan rutas que EXISTEN en el router (ver setupRoutes en
       js/core/app.js). Antes étaient también /sessions, /assessments,
       /settings y /admin, que nunca se registraron: un enlace a esas
       rutas daba 404 silencioso (bug B1.5). Si se agrega una ruta al
       router, hay que agregarla acá; `npm run smoke` lo verifica.

       Notas de equivalencias:
       - /evaluations es la ruta real de evaluaciones; por eso usa
         ASSESSMENTS_* (el módulo se llama assessments en la BD).
       - /settings y /admin no son rutas: son paneles que dashboard.js
         monta dentro del shell con import dinámico. Los controla
         _canManageClinicSettings() / _canManageUsers(), no canAccessPage. */
    canAccessPage(page) {
        const pagePermissions = {
            '/dashboard': [Permissions.DASHBOARD_VIEW],
            '/patients': [Permissions.PATIENTS_VIEW],
            '/appointments': [Permissions.APPOINTMENTS_VIEW, Permissions.APPOINTMENTS_VIEW_OWN],
            '/evaluations': [Permissions.ASSESSMENTS_VIEW, Permissions.ASSESSMENTS_VIEW_OWN],
            '/tasks': [Permissions.TASKS_VIEW, Permissions.TASKS_VIEW_OWN],
            '/notes': [Permissions.NOTES_VIEW, Permissions.NOTES_VIEW_OWN],
            '/reports': [Permissions.REPORTS_VIEW],
        };

        const required = pagePermissions[page];
        // Ruta desconocida: denegar en vez de devolver true por defecto.
        // canAccessPage() se llama desde el guard de rutas; un default
        // permisivo sería un agujero.
        if (!required) return false;
        return this.hasAnyPermission(required);
    }

    async refresh() {
        await this._loadUserRoles();
        return !this.hasLoadError();
    }
}

export const permissionService = new PermissionService();
