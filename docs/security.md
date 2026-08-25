# Estrategia de Seguridad — CONTEXTO

## 1. Principios generales

- **Mínimo privilegio**: cada rol accede solo a lo necesario.
- **No confiar en el frontend**: toda validación se complementa con RLS en Supabase.
- **Defensa en profundidad**: validación frontend + sanitización + RLS + validaciones backend.
- **No exponer secretos**: nunca se incluyen `service_role_key`, tokens privados ni credenciales en el frontend.
- **Información sensible protegida**: los datos clínicos se aíslan en tablas separadas con políticas restrictivas desde el inicio.

## 2. Capas de seguridad

### 2.1 Autenticación
- Supabase Auth como proveedor de identidad.
- Soporte para email/password y magic link.
- Sesión gestionada por el SDK de Supabase (no por localStorage manual).
- Renovación automática de access tokens.
- Logout seguro que invalida la sesión en Supabase.

### 2.2 Autorización (RBAC)
- Cuatro roles base: `admin`, `psychologist`, `assistant`, `patient`.
- Permisos granulares por módulo y acción.
- Custom claims en el JWT (cuando sea necesario) o consulta a `user_roles` en cada petición.
- Middleware/filtrado en frontend para ocultar elementos no autorizados.
- RLS en Supabase como última barrera.

### 2.3 Row Level Security (RLS)
- RLS habilitado en **todas** las tablas del esquema `public`.
- Políticas restrictivas por defecto.
- Acceso solo a registros propios o a registros autorizados por rol.
- Ejemplos:
  - Paciente: solo ve/modifica sus propios datos.
  - Psicólogo: ve sus pacientes asignados (cuando se implemente el módulo clínico).
  - Admin: acceso total a tablas administrativas.
  - Recepcionista: acceso limitado a agenda y datos de contacto.

### 2.4 Validaciones
- **Frontend**: `validateRequired()`, `validateEmail()`, `validatePhone()`, `validatePassword()`, `validateFile()`, etc.
- **Backend**:
  - Constraints en PostgreSQL (NOT NULL, CHECK, UNIQUE).
  - Triggers para validaciones complejas.
  - Edge Functions para lógica que no puede ejecutarse en la base de datos.
- **Sanitización**:
  - Escape de salida en todas las inserciones en el DOM (`escapeHtml`).
  - `sanitizeInput` en formularios antes de enviar.
  - Supabase parametriza consultas automáticamente, previniendo SQL Injection.

### 2.5 Sesiones
- Timeout configurable (default 30 minutos).
- Detección de inactividad.
- Invalidate al cerrar sesión o cambiar contraseña.
- No almacenar tokens en URLs.

### 2.6 Protección de endpoints
- Middleware de autenticación en todas las rutas protegidas.
- Verificación de `auth.uid()` en cada operación.
- No exponer IDs secuenciales cuando sea posible (usar UUID).
- Validación de Content-Type en uploads.

### 2.7 Manejo de archivos
- Validación de MIME type y extensión.
- Límite de tamaño (configurable, default 5MB).
- Nombres de archivo sanitizados (`sanitizeFilename`).
- Upload exclusivo mediante Supabase Storage con RLS por bucket.
- No exponer URLs firmadas permanentemente.

### 2.8 Auditoría
- Tabla `audit_logs` con registro de:
  - usuario, acción, módulo, recurso, valores antiguos/nuevos, IP, user agent, fecha.
- Política de retención configurable.
- Solo accesible por administradores (RLS).
- No registrar información sensible en logs.

### 2.9 Errores
- Mensajes genéricos al usuario final.
- No exponer stack traces, rutas internas, SQL ni credenciales.
- Logs detallados solo en el backend (Supabase logs / Edge Functions).
- Captura de errores global en el frontend con transformación a mensajes amigables.

### 2.10 PWA y caché
- No cachear información sensible de pacientes.
- Cache-first para assets estáticos (CSS, JS, iconos).
- Network-first para datos dinámicos.
- Service worker con scope restringido.

## 3. Checklist de cumplimiento

| Requisito | Estado |
|-----------|--------|
| HTTPS obligatorio en producción | Pendiente deploy |
| Variables de entorno | Implementado |
| No exponer service_role_key | Cumplido |
| RLS en todas las tablas | Implementado |
| Validación frontend | Implementado |
| Validación backend (RLS + constraints) | Implementado |
| Sanitización de entrada | Implementado |
| Escape de salida (DOM) | Implementado |
| Sesiones seguras | Implementado (Supabase Auth) |
| Timeout de sesión | Configurable |
| Logout seguro | Implementado |
| Auditoría | Implementado (estructura) |
| Manejo seguro de errores | Implementado |
| No confiar en frontend | Cumplido |
| Protección de uploads | Estructura preparada |

## 4. Futuras capas (no implementadas en Fase 1)

- **MFA / 2FA**: preparado en la arquitectura, no activado.
- **WebAuthn**: preparado para futura integración.
- **Cifrado end-to-end**: no necesario hasta que se implemente historia clínica.
- **Backup automatizado**: depende de configuración de Supabase.
- **Monitoring y alertas**: preparado para integración con Supabase Dashboard / Edge Functions logs.
