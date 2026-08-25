-- ============================================
-- CONTEXTO - Políticas Row Level Security (RLS)
-- ============================================
-- IMPORTANTE: Las políticas admin usan funciones SECURITY DEFINER
-- (is_user_admin, has_role) para evitar recursión infinita.
-- Sin estas funciones, una política que consulta user_roles desde
-- user_roles mismo causa "infinite recursion" (error 42P17).
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNCIONES SECURITY DEFINER
-- ============================================
-- Estas funciones se ejecutan con los privilegios del owner,
-- no del llamador, por lo que no activan las políticas RLS.
-- Esto evita la recursión infinita en políticas que consultan
-- user_roles desde otras políticas de user_roles.

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

-- ============================================
-- PROFILES
-- ============================================

-- Un usuario puede ver su propio perfil
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Un usuario puede actualizar su propio perfil
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Admin puede ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_user_admin(auth.uid()));

-- ============================================
-- ROLES
-- ============================================

-- Solo admin puede ver roles
CREATE POLICY "Admins can view roles"
    ON public.roles FOR SELECT
    USING (public.is_user_admin(auth.uid()));

-- ============================================
-- PERMISSIONS
-- ============================================

-- Solo admin puede ver permisos
CREATE POLICY "Admins can view permissions"
    ON public.permissions FOR SELECT
    USING (public.is_user_admin(auth.uid()));

-- ============================================
-- ROLE_PERMISSIONS
-- ============================================

-- Solo admin puede ver asignaciones de permisos
CREATE POLICY "Admins can view role_permissions"
    ON public.role_permissions FOR SELECT
    USING (public.is_user_admin(auth.uid()));

-- ============================================
-- USER_ROLES
-- ============================================

-- Un usuario puede ver sus propios roles
CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

-- Admin puede ver y gestionar todos los roles de usuario
CREATE POLICY "Admins can manage user_roles"
    ON public.user_roles FOR ALL
    USING (
        auth.uid() = user_id
        OR public.is_user_admin(auth.uid())
    )
    WITH CHECK (
        public.is_user_admin(auth.uid())
    );

-- ============================================
-- SITE_SETTINGS
-- ============================================

-- Cualquier usuario autenticado puede ver configuraciones públicas
CREATE POLICY "Authenticated users can view site_settings"
    ON public.site_settings FOR SELECT
    USING (auth.role() = 'authenticated');

-- Solo admin puede modificar configuraciones
CREATE POLICY "Admins can manage site_settings"
    ON public.site_settings FOR ALL
    USING (public.is_user_admin(auth.uid()))
    WITH CHECK (public.is_user_admin(auth.uid()));

-- ============================================
-- AUDIT_LOGS
-- ============================================

-- Solo admin puede ver logs de auditoría
CREATE POLICY "Admins can view audit_logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_user_admin(auth.uid()));

-- ============================================
-- NOTAS DE SEGURIDAD
-- ============================================
-- 1. Las políticas admin usan funciones SECURITY DEFINER (is_user_admin)
--    para evitar recursión infinita en consultas anidadas (error 42P17).
-- 2. auth.uid() es confiable porque Supabase lo valida en cada petición.
-- 3. Nunca confiar en datos enviados desde el frontend.
-- 4. Las políticas deben ser lo más restrictivas posible.
-- 5. Para módulos futuros (patients, appointments, etc.),
--    se crearán políticas específicas respetando mínimo privilegio.
