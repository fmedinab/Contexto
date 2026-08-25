// js/services/permissionService.js
// Servicio de verificación de permisos basado en roles.

import { Roles } from '../core/roles.js';
import { RolePermissions, Permissions } from '../core/permissions.js';
import { authService } from './authService.js';

export class PermissionService {
    constructor() {
        this.userRoles = [];
        this.userPermissions = new Set();
        this._loadUserRoles();
    }

    async _loadUserRoles() {
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

        if (error || !data) return;

        this.userRoles = data.map(ur => ur.roles?.name).filter(Boolean);
        this._recalculatePermissions();
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

    canAccessPage(page) {
        const pagePermissions = {
            '/dashboard': [Permissions.DASHBOARD_VIEW],
            '/patients': [Permissions.PATIENTS_VIEW],
            '/appointments': [Permissions.APPOINTMENTS_VIEW, Permissions.APPOINTMENTS_VIEW_OWN],
            '/sessions': [Permissions.SESSIONS_VIEW, Permissions.SESSIONS_VIEW_OWN],
            '/assessments': [Permissions.ASSESSMENTS_VIEW, Permissions.ASSESSMENTS_VIEW_OWN],
            '/reports': [Permissions.REPORTS_VIEW],
            '/settings': [Permissions.SETTINGS_VIEW],
            '/admin': [Permissions.ADMIN_USERS]
        };

        const required = pagePermissions[page] || [];
        return this.hasAnyPermission(required);
    }

    async refresh() {
        await this._loadUserRoles();
    }
}

export const permissionService = new PermissionService();
