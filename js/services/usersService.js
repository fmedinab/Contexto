// js/services/usersService.js
// Servicio de gestión de usuarios y roles para el panel de administración.
// El frontend NO puede leer auth.users (schema reservado de Supabase), así
// que la fuente de listado es public.profiles (un registro por usuario,
// creado por el trigger handle_new_user). Los roles se leen de roles y de
// user_roles. La RLS garantiza que solo un admin pueda ver/manipular estos
// datos (políticas "Admins can view/manage...").
//
// Seguridad adicional aplicada aquí:
//   * El admin NO puede quitarse a sí mismo el rol admin (evita lockout).
//   * setRole siempre reemplaza los roles previos del usuario por el elegido.

import { supabase } from '../../config/supabase.js';
import { authService } from './authService.js';
import { Roles } from '../core/roles.js';

class UsersService {
    async _ownsAdmin(userId) {
        const current = authService.getCurrentUser?.();
        return !!(current && userId === current.id);
    }

    /* Lista todos los usuarios con sus roles actuales.
       Devuelve: { data: [{ id, email, fullName, createdAt, roles: [nombre...] }], error } */
    async getAll() {
        const [profilesRes, rolesRes, userRolesRes] = await Promise.all([
            supabase.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }),
            supabase.from('roles').select('id, name'),
            supabase.from('user_roles').select('user_id, role_id')
        ]);

        if (profilesRes.error || rolesRes.error || userRolesRes.error) {
            const err = profilesRes.error || rolesRes.error || userRolesRes.error;
            return { data: [], error: err };
        }

        const roleNameById = Object.fromEntries((rolesRes.data || []).map(r => [r.id, r.name]));
        const rolesByUser = {};
        (userRolesRes.data || []).forEach(ur => {
            const name = roleNameById[ur.role_id];
            if (!name) return;
            (rolesByUser[ur.user_id] = rolesByUser[ur.user_id] || []).push(name);
        });

        const data = (profilesRes.data || []).map(p => ({
            id: p.id,
            email: p.email || '',
            fullName: p.full_name || '',
            createdAt: p.created_at || null,
            roles: rolesByUser[p.id] || []
        }));

        return { data, error: null };
    }

    /* Roles disponibles en el sistema. */
    async getRoles() {
        const { data, error } = await supabase
            .from('roles')
            .select('id, name, display_name, description')
            .order('name');

        if (error) return { data: [], error };
        return {
            data: (data || []).filter(r => Object.values(Roles).includes(r.name)),
            error: null
        };
    }

    /* Asigna un rol único a un usuario (reemplaza los roles existentes).
       Protege: no auto-desasignarse admin. */
    async setRole(userId, roleName) {
        if (!userId || !roleName) {
            return { error: { message: 'Faltan datos para asignar el rol.' } };
        }

        const isSelf = await this._ownsAdmin(userId);
        if (isSelf && roleName !== Roles.ADMIN) {
            return { error: { message: 'No puedes quitarte tu propio rol de administrador.' } };
        }

        const roleRes = await supabase.from('roles').select('id').eq('name', roleName).maybeSingle();
        if (roleRes.error || !roleRes.data) {
            return { error: { message: `El rol "${roleName}" no existe.` } };
        }

        const delRes = await supabase.from('user_roles').delete().eq('user_id', userId);
        if (delRes.error) {
            return { error: delRes.error };
        }

        const insRes = await supabase.from('user_roles').insert({ user_id: userId, role_id: roleRes.data.id });
        if (insRes.error) {
            return { error: insRes.error };
        }

        return { error: null };
    }
}

export const usersService = new UsersService();