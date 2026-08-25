# Arquitectura del Sistema — CONTEXTO

## 1. Stack Tecnológico

### Frontend
- HTML5 puro.
- CSS3 puro con variables CSS custom properties.
- JavaScript moderno (ES modules).
- Fetch API para comunicación.
- Sin frameworks ni librerías innecesarias.
- PWA con Service Worker.

### Backend
- Supabase (PostgreSQL + Auth + Storage + Edge Functions + Cron).
- Row Level Security (RLS) en todas las tablas.

### Despliegue
- Frontend: sitio estático (hosting estático o VPS).
- Backend: Supabase cloud.

## 2. Estructura de carpetas

```
/
├── index.html                      # Shell SPA + routing
├── manifest.json                   # PWA manifest
├── sw.js                           # Service Worker
├── .gitignore
├── .env                            # Variables de entorno (NO en producción pública)
│
├── config/
│   ├── env.js                        # Variables de entorno
│   └── supabase.js                    # Cliente Supabase singleton
│
├── css/
│   ├── reset.css                   # Reset y base
│   ├── typography.css              # Tipografía y escala
│   ├── layout.css                  # Layout (header, sidebar, main, footer)
│   ├── components.css              # Componentes visuales
│   ├── auth.css                    # Estilos para autenticación
│   ├── utilities.css               # Utilidades
│   └── themes/
│       ├── variables.css           # Design tokens
│       ├── light.css               # Overrides light
│       └── dark.css                # Overrides dark
│
├── js/
│   ├── core/
│   │   ├── app.js                  # Bootstrap y punto de entrada
│   │   ├── theme.js                # Gestor de tema oscuro/claro
│   │   ├── router.js               # Router SPA
│   │   ├── roles.js                # Catálogo de roles
│   │   └── permissions.js          # Catálogo de permisos
│   │
│   ├── components/                 # Componentes reutilizables
│   │   ├── modal.js
│   │   ├── toast.js
│   │   ├── alert.js
│   │   ├── confirm.js
│   │   ├── loading.js
│   │   ├── skeleton.js
│   │   ├── empty-state.js
│   │   ├── error-state.js
│   │   ├── form-validation.js
│   │   ├── input-validation.js
│   │   ├── select.js
│   │   ├── search.js
│   │   ├── pagination.js
│   │   ├── dropdown.js
│   │   ├── tabs.js
│   │   ├── button.js
│   │   ├── card.js
│   │   ├── badge.js
│   │   ├── tooltip.js
│   │   ├── file-uploader.js       # Subida de archivos
│   │   └── image-preview.js        # Vista previa de imágenes
│   │
│   ├── services/                   # Servicios
│   │   ├── supabaseClient.js       # Cliente Supabase singleton
│   │   ├── authService.js          # Autenticación (Supabase Auth)
│   │   ├── permissionService.js    # RBAC y verificación de permisos
│   │   ├── auditService.js         # Registro de auditoría
│   │   ├── notificationService.js  # Notificaciones (toast + programación)
│   │   ├── storageService.js       # Supabase Storage helpers
│   │   ├── patientService.js       # Stub: futuros pacientes
│   │   ├── appointmentService.js   # Stub: futuras citas
│   │   ├── sessionService.js       # Stub: futuras sesiones
│   │   ├── assessmentService.js    # Stub: futuras evaluaciones
│   │   ├── reportService.js        # Stub: futuros informes
│   │   └── settingsService.js      # Stub: futura configuración
│   │
│   ├── utils/                      # Utilidades puras
│   │   ├── validators.js
│   │   ├── sanitizer.js
│   │   ├── formatters.js
│   │   └── helpers.js
│   │
│   ├── pages/                      # Páginas / módulos
│   │   ├── landing.js              # Página pública de inicio
│   │   ├── login.js                # Login
│   │   ├── register.js             # Registro
│   │   ├── forgot-password.js      # Recuperar contraseña
│   │   ├── dashboard.js            # Panel principal
│   │   ├── patients.js             # (stub)
│   │   ├── appointments.js         # (stub)
│   │   ├── sessions.js             # (stub)
│   │   ├── assessments.js          # (stub)
│   │   ├── reports.js              # (stub)
│   │   ├── settings.js             # (stub)
│   │   └── admin.js                # (stub)
│   │
│   └── pwa/
│       └── install.js              # Prompt de instalación PWA
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
└── database/
    ├── schema.sql                  # Esquema inicial
    ├── rls.sql                     # Políticas de seguridad
    └── seed.sql                    # Datos iniciales
```

## 3. Flujo de datos

```
Usuario → index.html → app.js → router.js → page module
                                          ↓
                                    Componentes (modal, toast, etc.)
                                          ↓
                                    Services (authService, permissionService, etc.)
                                          ↓
                                    supabaseClient.js → Supabase (PostgreSQL + Auth + Storage)
                                          ↓
                                    RLS + validaciones backend
```

## 4. Convenciones

- URLs y rutas en inglés.
- Nombres de funciones en inglés.
- Comentarios en español.
- Mensajes al usuario en español.
- Variables con nombres descriptivos (`patientData`, `appointmentData`, `currentUser`).

## 5. Multi-usuario y RBAC

Roles:
- `admin`: acceso total.
- `psychologist`: gestión clínica.
- `assistant`: gestión administrativa y agenda.
- `patient`: acceso limitado a su propia información.

Los permisos se consultan en:
- Frontend: para ocultar/mostrar UI y bloquear navegación.
- Backend: RLS en Supabase como barrera final.

## 6. PWA

- `manifest.json`: nombre, iconos, colores, orientación, display standalone.
- `sw.js`: caché de assets estáticos, network-first para API, offline fallback.
- Instalación guiada desde UI con `beforeinstallprompt`.

## 7. Producción

- Variables de entorno en `.env` (no commitear a repos públicos).
- Build estático (solo copia de archivos; sin transpilación necesaria por ahora).
- HTTPS obligatorio.
- Headers de seguridad en hosting (CSP, X-Frame-Options, etc.).
- Minificación de CSS y JS en paso de build futuro.
