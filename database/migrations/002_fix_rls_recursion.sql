-- ============================================
-- Migración 002: Fix RLS infinite recursion
-- 
-- El problema: Las políticas RLS en user_roles, roles, profiles, etc.
-- hacen consultas a la misma tabla user_roles con RLS activado, causando
-- recursión infinita:
--   policy → SELECT FROM user_roles → policy → SELECT FROM user_roles → ...
--
-- La solución: crear una función SECURITY DEFINER que compruebe el rol
-- del usuario saltándose RLS, y usarla en todas las políticas.
-- ============================================

-- 1. Función SECURITY DEFINER para verificar si un usuario es admin
--    Se ejecuta con los privilegios del owner, no del llamador,
--    por lo que no activa las políticas RLS.
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
        AND r.name = 'admin'
    );
END;
$$;

-- 2. Función SECURITY DEFINER para verificar si un usuario tiene un rol específico
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
        AND r.name = p_role_name
    );
END;
$$;

-- 3. Eliminar políticas existentes que causan recursión
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Admins can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can manage site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can view audit_logs" ON public.audit_logs;

-- 4. Recrear políticas usando funciones SECURITY DEFINER (sin recursión)

-- user_roles
CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user_roles"
    ON public.user_roles FOR ALL
    USING (
        auth.uid() = user_id
        OR public.is_user_admin(auth.uid())
    )
    WITH CHECK (
        public.is_user_admin(auth.uid())
    );

-- profiles
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_user_admin(auth.uid()));

-- roles
CREATE POLICY "Admins can view roles"
    ON public.roles FOR SELECT
    USING (public.is_user_admin(auth.uid()));

-- permissions
CREATE POLICY "Admins can view permissions"
    ON public.permissions FOR SELECT
    USING (public.is_user_admin(auth.uid()));

-- role_permissions
CREATE POLICY "Admins can view role_permissions"
    ON public.role_permissions FOR SELECT
    USING (public.is_user_admin(auth.uid()));

-- site_settings
CREATE POLICY "Admins can manage site_settings"
    ON public.site_settings FOR ALL
    USING (public.is_user_admin(auth.uid()))
    WITH CHECK (public.is_user_admin(auth.uid()));

-- audit_logs
CREATE POLICY "Admins can view audit_logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_user_admin(auth.uid()));
