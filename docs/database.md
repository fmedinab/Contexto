# Modelo de Datos Inicial — CONTEXTO

## 1. Tablas creadas en Fase 1

### `auth.users` (Supabase Auth)
Tabla gestionada automáticamente por Supabase Auth.
- `id` (UUID, PK)
- `email` (TEXT, UNIQUE)
- `encrypted_password`
- `email_confirmed_at`
- `last_sign_in_at`
- `raw_user_meta_data` (JSONB)
- `app_metadata` (JSONB)

### `public.profiles`
Extiende `auth.users` con información pública del usuario.
- `id` (UUID, PK, FK a `auth.users.id`)
- `email` (TEXT, UNIQUE)
- `full_name` (TEXT)
- `phone` (TEXT)
- `avatar_url` (TEXT)
- `birth_date` (DATE)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Por qué**: Centraliza datos de perfil sin modificar la tabla de Auth. Permite RLS independiente.

### `public.roles`
Catálogo de roles del sistema.
- `id` (UUID, PK)
- `name` (TEXT, UNIQUE)
- `display_name` (TEXT)
- `description` (TEXT)
- `is_system` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

**Por qué**: Separa la definición de roles de la asignación a usuarios. Permite agregar roles sin alterar esquemas.

### `public.permissions`
Permisos granulares por módulo y acción.
- `id` (UUID, PK)
- `code` (TEXT, UNIQUE) — ej: `patients:view`
- `name` (TEXT)
- `module` (TEXT)
- `description` (TEXT)
- `created_at` (TIMESTAMPTZ)

**Por qué**: Facilita RBAC granular. Permite consultar qué puede hacer cada rol sin hardcodear en el frontend.

### `public.role_permissions`
Relación muchos a muchos entre roles y permisos.
- `id` (UUID, PK)
- `role_id` (UUID, FK)
- `permission_id` (UUID, FK)
- `created_at` (TIMESTAMPTZ)

**Por qué**: Un rol puede tener múltiples permisos; un permiso puede asignarse a múltiples roles.

### `public.user_roles`
Relación muchos a muchos entre usuarios y roles.
- `id` (UUID, PK)
- `user_id` (UUID, FK a `auth.users`)
- `role_id` (UUID, FK a `roles`)
- `created_at` (TIMESTAMPTZ)

**Por qué**: Un usuario puede tener múltiples roles (ej: psychologist + admin). Facilita herencia de permisos.

### `public.site_settings`
Configuración global clave-valor.
- `id` (UUID, PK)
- `key` (TEXT, UNIQUE)
- `value` (TEXT)
- `type` (TEXT)
- `description` (TEXT)
- `updated_at` (TIMESTAMPTZ)

**Por qué**: Permite modificar comportamiento del sistema sin deploy. Ideal para feature flags y configuraciones variables.

### `public.audit_logs`
Registro de auditoría.
- `id` (UUID, PK)
- `user_id` (UUID, FK a `auth.users`, ON DELETE SET NULL)
- `action` (TEXT)
- `module` (TEXT)
- `resource_id` (UUID)
- `old_values` (JSONB)
- `new_values` (JSONB)
- `ip_address` (TEXT)
- `user_agent` (TEXT)
- `created_at` (TIMESTAMPTZ)

**Por qué**: Trazabilidad obligatoria para información sensible. Cumplimiento y seguridad.

## 2. Tablas futuras (no creadas en Fase 1)

Estas tablas están planificadas pero **no se crean** hasta que se solicite el módulo correspondiente:

- `patients` — Datos básicos de pacientes (sin historia clínica sensible).
- `patient_guardians` — Información de tutores legales (si aplica).
- `appointments` — Citas y agenda.
- `sessions` — Registro de sesiones (futuro módulo clínico).
- `session_notes` — Notas de sesión (información sensible, RLS estricto).
- `assessments` — Evaluaciones aplicadas.
- `assessment_results` — Resultados de evaluaciones.
- `documents` — Documentos adjuntos (Supabase Storage).
- `consents` — Consentimientos informados.
- `invoices` — Facturación (si aplica).

## 3. Consideraciones de seguridad

- RLS habilitado en todas las tablas de `public`.
- Políticas restrictivas por defecto.
- Uso de UUID en lugar de IDs secuenciales.
- Triggers para created_at / updated_at automáticos.
- Trigger para crear perfil automáticamente al registrarse un usuario.

## 4. Índices

Se crean índices en:
- `profiles.email`
- `user_roles.user_id`, `user_roles.role_id`
- `audit_logs.user_id`, `audit_logs.created_at`, `audit_logs.module`

Esto garantiza consultas rápidas en las operaciones más frecuentes.
