# Arquitectura del Sistema — CONTEXTO

## 1. Stack Tecnológico

### Frontend
- HTML5 puro.
- CSS3 puro con variables CSS custom properties.
- JavaScript moderno (ES modules).
- Fetch API para comunicación.
- Sin frameworks ni librerías innecesarias.
- PWA con Service Worker (preparado, desactivado por defecto).

### Backend
- Supabase (PostgreSQL + Auth + Storage + Edge Functions + Cron).
- Row Level Security (RLS) en todas las tablas.

### Despliegue
- Frontend: sitio estático (hosting estático o VPS) con SPA fallback.
- Backend: Supabase cloud.
- Dev: `npx serve . -l 3000 -s` (clean URLs + SPA fallback).

---

## 2. Estructura de carpetas (ACTUAL)

```
/
├── index.html                      # Shell SPA único
├── package.json                    # Scripts: dev/start con SPA fallback (-s)
├── manifest.json                   # PWA manifest
├── .gitignore
├── .env                            # Variables de entorno (NO en producción pública)
│
├── config/
│   ├── env.js                        # Config app + Supabase keys
│   └── supabase.js                   # Cliente Supabase singleton (CDN importmap)
│
├── css/
│   ├── reset.css                     # Reset global + variables base
│   ├── typography.css                # Tipografía y escala
│   ├── dashboard-new.css             # Dashboard oficial (órbitas + modales)
│   ├── patients.css                  # Página pacientes (tabla CRUD)
│   ├── auth-neural.css               # Login / Register / Forgot-password
│   └── themes/
│       ├── variables.css             # Design tokens (colores, spacing, radii, shadows)
│       ├── dark.css                  # Overrides tema oscuro
│       └── light.css                 # Overrides tema claro
│
├── js/
│   ├── core/
│   │   ├── app.js                    # Bootstrap + punto de entrada + link interceptor
│   │   ├── router.js                 # Router SPA (History API, clean URLs)
│   │   ├── theme.js                  # Gestor tema oscuro/claro (localStorage)
│   │   ├── roles.js                  # Catálogo roles (admin, psychologist, assistant, patient)
│   │   └── permissions.js            # Catálogo permisos + matrix por rol
│   │
│   ├── components/                   # Componentes reutilizables (solo 3 activos)
│   │   ├── modal.js                  # Modal accesible (focus trap, ESC, backdrop)
│   │   ├── toast.js                  # Toast global (success/error/warning/info)
│   │   ├── confirm.js                # Wrapper modal.confirm (Promise-based)
│   │   ├── loading.js                # 🔄 Preparado: loading overlay (no usado aún)
│   │   └── skeleton.js               # 🔄 Preparado: skeleton loaders (no usado aún)
│   │
│   ├── services/                     # Servicios (fuentes de verdad)
│   │   ├── authService.js            # Supabase Auth (login, register, session, magic link)
│   │   ├── permissionService.js      # RBAC cliente (hasPermission, canAccessPage)
│   │   ├── auditService.js           # Auditoría (log a Supabase)
│   │   └── mockData.js               # 🔑 Fuente única de datos mock (dashboard + patients)
│   │
│   ├── utils/                        # Utilidades puras
│   │   ├── helpers.js                # debounce, throttle, generateId, formatFileSize, etc.
│   │   └── sanitizer.js              # escapeHtml, sanitizeInput, stripTags
│   │
│   ├── pages/                        # Páginas / módulos (5 funcionales)
│   │   ├── login.js                  # Login (orbital rings, particles)
│   │   ├── register.js               # Registro (mismo estilo auth)
│   │   ├── forgot-password.js        # Recuperar contraseña
│   │   ├── dashboard.js              # 🎯 OFICIAL: órbitas + 7 módulos + 8 modales funcionales
│   │   └── patients.js               # Tabla pacientes + CRUD modales (crear/editar/ver/eliminar)
│   │
│   └── pwa/
│       └── install.js                # Prompt instalación PWA (beforeinstallprompt)
│
├── assets/
│   └── icons/                        # 8 SVGs (72-512px) para PWA manifest
│
├── database/
│   ├── schema.sql                    # Esquema completo (profiles, roles, permissions, user_roles, audit_logs)
│   ├── rls.sql                       # Políticas RLS con funciones SECURITY DEFINER (anti-recursión)
│   ├── seed.sql                      # Roles, permisos, site_settings
│   ├── seed-admin.sql                # Setup usuario admin inicial
│   └── migrations/                   # 001_add_profiles_columns, 002_fix_rls_recursion
│
├── docs/
│   ├── architecture.md               # Este archivo
│   ├── security.md                   # Seguridad, RLS, auth flow
│   ├── database.md                   # Esquema BD, relaciones
│   ├── RULES.md                      # Reglas de desarrollo
│   └── Memory.md                     # Memoria proyecto
│
└── scripts/
    └── create-admin-user.js          # Script Node para crear admin en Supabase
```

---

## 3. Routing — Clean URLs (History API)

| Ruta | Página | Auth | Estado |
|------|--------|------|--------|
| `/` | Redirect → `/dashboard` o `/login` | No | ✅ |
| `/login` | LoginPage | No | ✅ |
| `/register` | RegisterPage | No | ✅ |
| `/forgot-password` | ForgotPasswordPage | No | ✅ |
| `/dashboard` | DashboardPage | Sí | ✅ (órbitas + modales) |
| `/patients` | PatientsPage | Sí | ✅ (tabla CRUD) |
| `*` (404) | NotFound | - | ✅ |

- **Mecanismo**: `history.pushState` + `popstate` (sin hash `#`)
- **SPA Fallback**: `serve -s` sirve `index.html` en refresh directo (F5)
- **Links internos**: `<a href="/login" data-link>` → interceptado globalmente en `app.js`

---

## 4. Flujo de datos

```
Usuario → index.html → app.js → router.js (History API) → page module
                                           ↓
                                     Components (modal, toast, confirm)
                                           ↓
                                     Services (authService, permissionService, mockData)
                                           ↓
                                     supabase.js (CDN) → Supabase (PostgreSQL + Auth + Storage)
                                           ↓
                                     RLS + validaciones backend
```

---

## 5. Dashboard Oficial (`dashboard.js`)

**Características implementadas:**
- **Header**: brand, clock, notificaciones, calendario, user menu (avatar + dropdown)
- **Órbitas centrales**: cerebro (core) + 7 módulos orbitando (Pacientes, Citas, Evaluaciones, Tareas, Notas, Reportes, Mensajes)
- **Columna izquierda**: saludo + resumen día + panel pacientes (search + lista)
- **Columna derecha**: próximas citas + estado emocional (SVG chart) + evaluaciones (tabs)
- **Footer**: frase inspiracional rotativa

**Modales funcionales (8):**
1. `core` — Centro de control (grid 3x3 módulos)
2. `patients` — Lista completa + search + nuevo/editar/ver
3. `appointments` — Agenda día + nueva cita
4. `evaluations` — Tabs (pendientes/en progreso/completadas) + comenzar
5. `tasks` — Kanban simple (pendientes/en progreso/completadas) + nueva tarea
6. `notes` — Historial notas clínicas + nueva nota
7. `reports` — Indicadores KPI + mini chart sesiones/mes
8. `messages` — Lista conversaciones + unread dots

**Estilo**: Glassmorphism, dark/light mode, responsive (mobile: órbita primero), reduced-motion.

---

## 6. Datos Mock — Fuente Única (`mockData.js`)

Unifica lo que antes estaban en `dashboardNewService.js` + `patientService.js`:

- **8 pacientes completos** (id, email, phone, age, gender, therapyType, status, nextAppointment, startDate, notes, diagnosis, emergencyContact)
- **Subset dashboard** (4 pacientes con cita hoy, campos reducidos)
- **Citas, evaluaciones, tareas, notas, reportes, mensajes, estado emocional, quotes, saludos**
- **Helpers**: `getInitials`, `formatAppointmentDate`, `formatDateShort`, `formatDate`, `formatTime`
- **Catálogos**: `THERAPY_TYPES`, `STATUS_LABELS`

> **Para conectar Supabase**: reemplazar `mockData.js` por llamadas reales a `authService.getSupabaseClient().from(...)` manteniendo misma API pública.

---

## 7. Componentes — Estado Actual

| Componente | Usado | Notas |
|------------|-------|-------|
| `modal.js` | ✅ | Dashboard (8 modales), patients (3 modales), confirm wrapper |
| `toast.js` | ✅ | Global (`window.app.toast`) + local en dashboard/patients |
| `confirm.js` | ✅ | Wrapper Promise-based sobre modal |
| `loading.js` | ⏳ | Preparado para futuras llamadas async (overlay + spinner) |
| `skeleton.js` | ⏳ | Preparado para loading states (text, circle, card, table, list) |

> `loading.js` y `skeleton.js` están listos para usar cuando se conecten APIs reales. No añadir más hasta necesitarse.

---

## 8. Convenciones

- URLs y rutas en inglés, lowercase, kebab-case (`/forgot-password`).
- Nombres de funciones/variables en inglés.
- Comentarios en español.
- Mensajes al usuario en español.
- Variables descriptivas: `patientData`, `appointmentData`, `currentUser`.
- CSS encapsulado por página (`.app--dashboard`, `.patients-page`, `.auth-page`).

---

## 9. Multi-usuario y RBAC

**Roles:**
- `admin`: acceso total.
- `psychologist`: gestión clínica y administrativa.
- `assistant`: agenda y atención administrativa.
- `patient`: acceso limitado a su propia información.

**Permisos**: catálogo en `permissions.js` + matrix `RolePermissions`.
- Frontend: `permissionService.canAccessPage()` para ocultar UI / bloquear navegación.
- Backend: RLS en Supabase como barrera final (ver `database/rls.sql`).

---

## 10. PWA

- `manifest.json`: nombre, iconos (72-512px), colores, orientación, `display: standalone`.
- `install.js`: prompt guiado con `beforeinstallprompt`.
- Service Worker (`sw.js`) preparado pero desactivado en `app.js` (limpieza de registros). Reactivar cuando se necesite offline.

---

## 11. Próximos Módulos (cuando toque implementar)

Estructura lista para crear páginas reales:

```
/appointments   → js/pages/appointments.js   + css/appointments.css
/sessions       → js/pages/sessions.js       + css/sessions.css
/assessments    → js/pages/assessments.js    + css/assessments.css
/reports        → js/pages/reports.js        + css/reports.css
/settings       → js/pages/settings.js       + css/settings.css
/admin          → js/pages/admin.js          + css/admin.css
```

**Patrón a seguir:**
1. Crear `js/pages/<modulo>.js` extendiendo patrón de `patients.js` (tabla + modales CRUD)
2. Crear `css/<modulo>.css` usando variables de `themes/variables.css`
3. Registrar ruta en `app.js` → `router.addRoute('/modulo', ...)`
4. Reemplazar datos mock en `mockData.js` por llamadas Supabase reales
5. Añadir permisos en `permissions.js` si son nuevos

---

## 12. Producción

- Variables de entorno en `.env` (no commitear a repos públicos).
- Build estático: solo copia de archivos (sin transpilación).
- HTTPS obligatorio.
- Headers de seguridad en hosting (CSP, X-Frame-Options, Referrer-Policy).
- Minificación CSS/JS en paso de build futuro (opcional).
- Reactivar Service Worker para offline-first si se requiere.