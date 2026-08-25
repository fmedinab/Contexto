-- ============================================
-- CONTEXTO - Datos iniciales (seed)
-- ============================================

-- Insertar roles del sistema
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
    ('admin', 'Administrador', 'Acceso total al sistema. Gestiona usuarios, roles y configuración.', TRUE),
    ('psychologist', 'Psicólogo', 'Profesional que atiende pacientes y gestiona su práctica clínica.', TRUE),
    ('assistant', 'Recepcionista', 'Gestiona citas, agenda y atención administrativa.', TRUE),
    ('patient', 'Paciente', 'Acceso limitado a su propia información.', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insertar permisos base
INSERT INTO public.permissions (code, name, module, description) VALUES
    -- Dashboard
    ('dashboard:view', 'Ver dashboard', 'dashboard', 'Acceso al panel de control'),
    
    -- Pacientes
    ('patients:view', 'Ver pacientes', 'patients', 'Ver listado de pacientes'),
    ('patients:create', 'Crear pacientes', 'patients', 'Registrar nuevos pacientes'),
    ('patients:edit', 'Editar pacientes', 'patients', 'Modificar datos de pacientes'),
    ('patients:delete', 'Eliminar pacientes', 'patients', 'Eliminar registros de pacientes'),
    ('patients:view_own', 'Ver propio perfil de paciente', 'patients', 'Los pacientes ven solo su propia información'),
    
    -- Citas
    ('appointments:view', 'Ver citas', 'appointments', 'Ver todas las citas'),
    ('appointments:create', 'Crear citas', 'appointments', 'Programar nuevas citas'),
    ('appointments:edit', 'Editar citas', 'appointments', 'Modificar citas existentes'),
    ('appointments:delete', 'Eliminar citas', 'appointments', 'Cancelar o eliminar citas'),
    ('appointments:view_own', 'Ver mis citas', 'appointments', 'Los pacientes ven solo sus propias citas'),
    
    -- Sesiones
    ('sessions:view', 'Ver sesiones', 'sessions', 'Ver registro de sesiones'),
    ('sessions:create', 'Crear sesiones', 'sessions', 'Registrar nuevas sesiones'),
    ('sessions:edit', 'Editar sesiones', 'sessions', 'Modificar registros de sesiones'),
    ('sessions:delete', 'Eliminar sesiones', 'sessions', 'Eliminar registros de sesiones'),
    ('sessions:view_own', 'Ver mis sesiones', 'sessions', 'Los pacientes ven solo sus propias sesiones'),
    
    -- Evaluaciones
    ('assessments:view', 'Ver evaluaciones', 'assessments', 'Ver evaluaciones aplicadas'),
    ('assessments:create', 'Crear evaluaciones', 'assessments', 'Aplicar nuevas evaluaciones'),
    ('assessments:edit', 'Editar evaluaciones', 'assessments', 'Modificar evaluaciones'),
    ('assessments:delete', 'Eliminar evaluaciones', 'assessments', 'Eliminar evaluaciones'),
    ('assessments:view_own', 'Ver mis evaluaciones', 'assessments', 'Los pacientes ven solo sus propias evaluaciones'),
    
    -- Informes
    ('reports:view', 'Ver informes', 'reports', 'Acceso a informes y estadísticas'),
    ('reports:create', 'Crear informes', 'reports', 'Generar nuevos informes'),
    ('reports:export', 'Exportar informes', 'reports', 'Exportar informes a PDF/Excel'),
    
    -- Configuración
    ('settings:view', 'Ver configuración', 'settings', 'Acceso a configuración del sistema'),
    ('settings:edit', 'Editar configuración', 'settings', 'Modificar configuración del sistema'),
    
    -- Administración
    ('admin:users', 'Gestionar usuarios', 'admin', 'Crear, editar y eliminar usuarios'),
    ('admin:roles', 'Gestionar roles', 'admin', 'Asignar roles y permisos'),
    ('admin:audit', 'Ver auditoría', 'admin', 'Acceso a logs de auditoría'),
    ('admin:settings', 'Gestionar configuración global', 'admin', 'Modificar configuraciones globales')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Asignar permisos a roles
-- ============================================

-- Admin: todos los permisos
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Psychologist: permisos clínicos y administrativos (sin admin)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'psychologist'
  AND p.code NOT LIKE 'admin:%'
ON CONFLICT DO NOTHING;

-- Assistant: permisos administrativos básicos
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'assistant'
  AND p.code IN (
    'dashboard:view',
    'appointments:view', 'appointments:create', 'appointments:edit',
    'patients:view', 'patients:create',
    'sessions:view'
  )
ON CONFLICT DO NOTHING;

-- Patient: permisos limitados a su propia información
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'patient'
  AND p.code IN (
    'dashboard:view',
    'appointments:view_own',
    'sessions:view_own',
    'assessments:view_own',
    'patients:view_own'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- Configuraciones iniciales del sitio
-- ============================================
INSERT INTO public.site_settings (key, value, type, description) VALUES
    ('site_name', 'CONTEXTO', 'text', 'Nombre del sitio'),
    ('site_tagline', 'Gestión psicológica inteligente', 'text', 'Subtítulo del sitio'),
    ('site_developer', 'Frank Medina', 'text', 'Desarrollador del sistema'),
    ('site_version', '1.0.0', 'text', 'Versión actual del sistema'),
    ('session_timeout_minutes', '30', 'number', 'Tiempo de expiración de sesión en minutos'),
    ('max_login_attempts', '5', 'number', 'Intentos máximos de login antes de bloqueo'),
    ('lockout_duration_minutes', '15', 'number', 'Duración del bloqueo en minutos'),
    ('allow_registration', 'true', 'boolean', 'Permitir registro público de usuarios'),
    ('default_user_role', 'patient', 'text', 'Rol asignado por defecto en registros públicos'),
    ('maintenance_mode', 'false', 'boolean', 'Modo mantenimiento activado')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- NOTAS
-- ============================================
-- Este seed asigna permisos por rol.
-- Los roles de usuario se asignan a través de la tabla user_roles,
-- que se puede gestionar desde el panel de administración.
-- El usuario admin inicial debe crearse manualmente desde Supabase Dashboard
-- o mediante un Edge Function con privilegios elevados.
