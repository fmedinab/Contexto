# MEMORY / AUDITORÍA DEL PROYECTO — CONTEXTO Psicología

> Archivo de continuidad entre sesiones. Actualizado el 2026-09-09.
> Leer esto primero en cada sesión para retomar contexto sin re-derivar todo.

---

## 1. ¿Qué es el proyecto?

SPA clínica de psicología ("CONTEXTO") en **vanilla JS (ES modules) + Supabase**.
- **Ruta raíz**: `C:\Projects\Contexto`
- **Stack**: Sin framework; hash-routing (`#/ruta`); servidor local `npx serve -l 3000 -s .`
- **Supabase**: `https://bpfouoddrdelcqicdnor.supabase.co` — supabase-js v2 desde CDN
- **Ramas**: `main` (working tree limpio tras `760992b Fix; Partiants Service`)

### Roles del sistema
`admin`, `psychologist`, `assistant`, `patient` (`js/core/roles.js`).
Pacientes auto-crean rol `patient` + ficha clínica al registrarse (trigger `handle_new_user` de la migración 016).

### Flujo de citas (importante)
- Visitante/paciente → crea `booking_requests` (INSERT abierto a anon/authenticated).
- Staff → convierte solicitud en `appointments` (`convertToAppointment` en `bookingRequestsService.js`, con slot picker en `dashboard.js`). El paciente NO inserta citas (RLS).
- Horarios libres → RPC `get_available_slots(p_date)` (SECURITY DEFINER) consumido por landing, portal paciente y dashboard.

### Verificación estándar
- `node --check <archivo>.js`
- `curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/<ruta>`

---

## 2. RUTAS REGISTRADAS (`js/core/app.js` `setupRoutes`)

| Ruta | Página | Guard |
|---|---|---|
| `/` | `LandingPage` (`landing.js`) | Pública |
| `/login`, `/register`, `/forgot-password` | (`login.js`, `register.js`, `forgot-password.js`) | Públicas; autenticados → redirigidos a `/dashboard` |
| `/reset-password` | (`reset-password.js`) | Requiere auth (PKCE) |
| `/privacidad`, `/cookies`, `/aviso-legal` | `LegalPage` | Públicas |
| `/dashboard` | `DashboardPage` (staff) **o** `PatientPortalPage` (paciente) | Requiere auth; fallback `ensure_patient_account` RPC |
| `/patients`, `/appointments`, `/evaluations`, `/tasks`, `/notes`, `/reports` | páginas standalone | Staff (vía `canAccessPage`) |
| `*` | 404 (`errors.js`) | — |

**Retos del router**:
- Guard de `/dashboard` en `app.js:128-152`: si no es staff y no tiene roles → llama RPC `ensure_patient_account` + refresca sesión.
- Rutas huérfanas que existen en permisos/títulos pero **no** están registradas → 404: `/sessions`, `/assessments`, `/settings`, `/admin` (`permissionService.js:89-93`, `router.js:108`).

---

## 3. INVENTARIO DE PÁGINAS (`js/pages/`)

| Archivo | Propósito |
|---|---|
| `landing.js` (1141) | Landing pública con formulario de reserva (CMS + settings) |
| `login.js`, `register.js`, `forgot-password.js`, `reset-password.js` | Auth flow |
| `legalPage.js` | Páginas legales desde CMS |
| `dashboard.js` (2706) | Dashboard staff MONOLÍTICO (orbit UI + modales inline) + aloja settings/clinic/CMS/users panels |
| `patient.js` (621) | Portal paciente SOLO LECTURA dentro de `/dashboard` |
| `patients.js`, `appointments.js`, `evaluations.js`, `tasks.js`, `notes.js`, `reports.js` | CRUD staff standalone |
| `clinicSettings.js` | Ajustes globales (horarios, tiempo fuera, contacto, moneda, TZ) |
| `cmsPanel.js` | Editor CMS de la landing |
| `settings.js` | Perfil de usuario + avatar + password |
| `usersPanel.js` + `usersService.js` | Panel "Usuarios y roles" del admin (nuevo) |
| `errors.js` | Páginas de error 404/403/500/offline |

---

## 4. SERVICIOS (`js/services/`) — tabla/RPC usados

| Servicio | Tablas | RPC | Notas |
|---|---|---|---|
| `authService` | — | `ensure_patient_account` | login, magic link, reset, idle timeout |
| `appointmentsService` | `appointments`, `patients` | — | duration default 50 min |
| `bookingRequestsService` | `booking_requests` | `get_available_slots` | flujo solicitud→cita; `WHATSAPP_NUMBER` hardcodeado `50212345678` |
| `patientsService` | `patients` | — | **owner_id filter eliminado** (era bug); RLS limita por rol |
| `notesService`, `evaluationsService`, `tasksService` | `clinical_notes`, `assessments`, `therapeutic_tasks` (+`patients`) | `check_overdue_tasks` (tasksService, error tragado) | |
| `usersService` | `profiles`, `roles`, `user_roles` | — | setRole: DELETE + INSERT; protege auto-remover admin |
| `reportsService` | `patients`, `appointments`, `assessments` | — | KPIs; errores enmascarados a 0 |
| `remindersService` | `reminders` | `prepare_reminders` | cola WhatsApp |
| `auditService` | `audit_logs` | — | fire-and-forget; IP siempre null |
| `cmsService` | `cms_website` | — | `DEFAULT_CONTENT` de fallback (~140 líneas) |
| `patientPortalService` | `patients`, `appointments`, `assessments`, `therapeutic_tasks`, `booking_requests` | — | SOLO lectura, sin manejo de errores (devuelve raw) |
| `profilesService` | `profiles` + Storage bucket `avatars` | — | fallback de perfil si falla; bucket NO se crea en migraciones |
| `siteSettingsService` | `site_settings` | — | caché en memoria; `get()` hace 2 queries (1 redundante) |
| `permissionService` | `user_roles`, `roles` | — | **CORREGIDO**: ya distingue error de "sin roles" (`hasLoadError()`) y `app.js` muestra pantalla de error en vez de degradar a paciente |
| `dashboardData.js` | `assessments`, `appointments`, `therapeutic_tasks` | — | **RENOMBRADO** desde `mockData.js` (2026-10-12). El N+1 de `getEmotionalState` **ya estaba arreglado** (1 query agregada); lo pendiente era solo el nombre engañoso |

### Gap de seguridad DATOS CONTRA SECRETOS
- `config/env.js` tiene URL + anon key (`sb_publishable_`, pública por diseño) hardcodeadas. **CORRECCIÓN 2026-10-12:** este archivo afirmaba que `.env` estaba commiteado. **Es falso.** Verificado dos veces: `git ls-files` no lo lista y `git log --all -- .env` devuelve 0 commits. `.env` sí está correctamente en `.gitignore`.
  - Lo que **sí** es cierto: hay secretos reales (`SUPABASE_SECRET_KEY`, `SUPABASE_ACCESS_TOKEN`) en texto plano en el disco local, leídos por `scripts/create-admin-user.js`. **Rotarlos es recomendable** (2 min en el panel de Supabase), no urgente.
  - El app NO lee `.env` en el browser; solo usa `config/env.js`.

---

## 5. AUDITORÍA DE MIGRACIONES (`database/migrations/001..017`)

| Migración | Resumen |
|---|---|
| 001 | columnas `profiles` (dni/currency/language); rebuild `handle_new_user` |
| 002 | `is_user_admin()`/`has_role()` SECURITY DEFINER para romper recursión RLS; recrea políticas |
| 003 | seed admin `admin@context.test` |
| 004 | `appointments` + EXCLUDE GiST anti-solapamiento + RLS |
| 005 | `assessments` + trigger dedicado (duplicado funcional) + RLS |
| 006 | `therapeutic_tasks` + `check_overdue_tasks()` + RLS |
| 007 | `clinical_notes` + RLS |
| 008 | patch: btree_gist, redefine funciones, re-fija EXCLUDE, corrige 3 políticas pacientes |
| 009 | `booking_requests` (INSERT abierto anon/authenticated) |
| 010 | seed `work_schedule` **array** + `slot_duration_minutes`; crea `get_available_slots` |
| 011 | `reminders` + `prepare_reminders()` (AT TIME ZONE 'America/Guatemala' DURA) |
| 012 | `cms_website` + seed completo + RLS |
| 013 | seed settings consultorio **object** `work_schedule` (descartado por 010) |
| 014 | `site_settings.is_public` + políticas públicas |
| 015 | seed páginas legales; pacientes pueden leer `appointments` y `booking_requests` |
| 016 | reescribe `handle_new_user` (rol paciente + ficha); `ensure_patient_account` RPC |
| 017 | **convierte work_schedule array→objeto; reescribe `get_available_slots` (slots 30 min, excluye ocupados)** |

### Tablas existentes (schema)
`profiles`, `roles`, `permissions`, `role_permissions`, `user_roles`, `site_settings`, `audit_logs`, `patients`, `appointments`, `assessments`, `therapeutic_tasks`, `clinical_notes`, `booking_requests`, `reminders`, `cms_website`.

---

## 6. HALLAZGOS CRÍTICOS / FALLAS CONOCIDAS (priorizados)

### 🔴 P1 — Seguridad y bloqueantes

1. ~~**`.env` commiteado con secretos**~~ → **FALSO, retirado de la lista (2026-10-12).** Verificado: `.env` nunca estuvo en el repo. Queda solo la recomendación de rotar los secretos que están en el disco local, y `database/verify.sql` ahora automatiza la comprobación de la BD.
2. **Sin seed de roles**: ninguna migración crea las filas `admin/psychologist/assistant/patient` en `roles`. Si no están seedeadas manualmente → TODAS las políticas RLS y `handle_new_user` fallan en silencio. Verificar con `SELECT name FROM roles;` o el CHECK 1 de `database/verify.sql`.
3. **Política fantasma en `site_settings`**: `rls.sql:130` ("Authenticated users can view site_settings" con `auth.role()`) NUNCA se eliminó. Redundante con 014 y potencial fuga si se ajusta 014. → Drop.
4. **Falta `search_path`** en `is_user_admin()`, `has_role()`, `update_assessments_updated_at()`, `check_overdue_tasks()`, `fecha_es()`, `urlencode()`. Riesgo de seguridad/corrección.

### 🟠 P2 — Bugs funcionales pendientes de verificación

5. **Aplicar migración 017 en Supabase** (SQL Editor) — crítico para horarios dinámicos. Sin ella, RPC con formato viejo. Verificar con `SELECT * FROM public.get_available_slots('2026-09-10'::date);`.
6. **Verificar qué migraciones están aplicadas** (sobre todo 009-017) y si existe seed de roles. No verificado en producción.
7. **Zona horaria inconsistente**: `prepare_reminders()` usa `America/Guatemala` DURA; `get_available_slots()` usa TZ de la sesión de BD. El setting `timezone` de site_settings NO se consume.
8. **Validación de tiempo en 017**: `work_schedule` con string inválido (`"foo-bar"`) rompe `get_available_slots` con excepción sin manejo.
9. **`slot_duration_minutes` (50) vs slots cada 30 min**: la lógica de solapamiento lo tolera, pero confirmar que produce horarios con sentido clínico (slot 10:00 y 10:30 no coexisten si la sesión dura 50').

### 🟡 P3 — Calidad / deuda técnica

10. ~~**N+1**~~ → **CORREGIDO (antes de esta auditoría).** `getEmotionalState()` ya hace 1 query agregada y cuenta en cliente (`dashboardData.js:140`). Retirado de la lista.
11. **`getStats()` de appointments/patients/evaluations/reports** hacen `list()` completa o `|| 0` en silencio → errores enmascarados; debería ser server-side. **PARCIALMENTE CORREGIDO**: `reportsService.getIndicators()` ya lanza el error en vez de devolver ceros falsos.
12. **Errores tragados**: `permissionService.js:29` **CORREGIDO** (distingue error de vacío + pantalla de error con reintento). `tasksService.js:64` y `evaluationsService.js:179` **CORREGIDOS (2026-10-12)**: ambos usaban `catch {}` esperando que supabase lanzara excepción, pero supabase devuelve `{error}` — el catch nunca se disparaba para fallos de red. Ahora se registra el error explícitamente. Pendiente: `appointmentsService.js:328` (conflicto sin check).
13. ~~Módulo "Mensajes" abre modal vacío~~ **CORREGIDO**: ocultado tras `FEATURE_FLAGS.messages = false`. `mockData.js` → renombrado a `dashboardData.js`.
14. ~~**Rutas huérfanas** `/sessions`, `/assessments`, `/settings`, `/admin`~~ **CORREGIDO (2026-10-12)**: canAccessPage() ahora solo lista rutas existentes y **deniega** las desconocidas. Al hacerlo se descubrió algo más grave: **`/tasks` y `/notes` no tenían entrada**, así que `hasAnyPermission([])` devolvía `false` y esas dos rutas redirigían a `/dashboard` a **todo el mundo**, admin y psychologist incluidos.
15. ~~**Sus modales `_openModal` NO chequean permisos**~~ **CORREGIDO (antes de esta auditoría)**: `dashboard.js:474 _canOpenModal()` consulta la matriz por tipo de modal.
16. **Código muerto**: `js/utils/helpers.js` (no importado), `updateNavigationVisibility` (sin `[data-nav]` en DOM), `landing.js:880` `a[data-noop]` (no existe), `renderErrorInline`, import `EVAL_STATUS_LABELS` sin usar en `dashboard.js:12`.
17. **Dobles mapas de labels**: `patient.js:18-31` duplica `ASSESSMENT_STATUS_LABELS`/`TASK_STATUS_LABELS` ya definidos en services.
18. ~~**Faltan triggers `updated_at`**~~ **CORREGIDO en migración 019.**
19. ~~**Faltan índices en FKs**~~ **CORREGIDO en migración 019.**
20. ~~**Bucket `avatars` no creado por migraciones**~~ **CORREGIDO**: `020_storage_avatars.sql`.
21. **Archivos residuales**: `modal-loading-demo.html`, carpeta `contexto-psicologia/` (landing legacy), `iu.png`.
22. **Docs desactualizadas**: `docs/RULES.md:86` y `docs/architecture.md:71` referencian `js/utils/validators.js` (no existe). **Tests y lint:** añadidos ESLint + Prettier + `scripts/smoke-test.js` (42 checks) + GitHub Actions CI (9 pasos) el 2026-10-12.
23. **BRECHA DE DATOS CLÍNICOS (corregida, migraciones 021/022):** no existían permisos `tasks:*` ni `notes:*`, y las policies RLS de `clinical_notes` / `therapeutic_tasks` daban SELECT/INSERT/UPDATE al rol `assistant`. Como la anon key es pública por diseño, una cuenta de recepción podía leer **todas las notas clínicas** vía REST aunque la UI no las mostrara. La 022 lo cierra. CHECK 9 de `database/verify.sql` lo detecta.

### 🔵 P4 — Mejoras de producto pendientes
- Confirmación de citas: paciente crea `booking_requests`; staff convierte. Verificar flujo de email/SMTP en Supabase (recuperación de contraseña depende de SMTP).
- Contacto: `whatsapp_number` y `contact_phone` con fallback hardcodeado (`50212345678`) en varios sitios → leer de settings siempre.
- Portal paciente: tiempo de slots dinámico listo; evaluar agregar recordatorio/programas.

---

## 7. LO QUE SE HIZO EN LA ÚLTIMA SESIÓN (2026-09-09)

1. **Bug visibilidad pacientes** — `patientsService.getAll()/getStats()` sin filtro `owner_id` (los auto-creados por trigger 016 tienen `owner_id = uid paciente`).
2. **Portal paciente read-only fall-closed** — `patient.js` + `patient.css`.
3. **Modal "Solicitar una cita"** en portal (INSERT `booking_requests`).
4. **Panel "Usuarios y roles"** — `usersService.js`, `usersPanel.js`, integración `dashboard.js`, `admin.css`.
5. **Bug raíz de horarios**: formato `work_schedule` doble (010 array vs 013 objeto). Migración **017** unifica + reescribe `get_available_slots` (slots 30 min, excluye citas/solicitudes activas/pasados).
   - `landing.js`: `_scheduleSummaryHtml()` dinámico (ambos formatos); textos "24h" → `_confirmHoursHtml()`.
   - `patient.js`: `_loadTimeOptions()` cargan horarios reales por fecha; servicios desde CMS; "confirmamos en X horas" dinámico.

**Commits recientes**: `760992b Fix Partiants Service` · `eea3878 Fix Partiants Portal` · `a43cb44 Fix Partiants Profiles` · `10f0ff7 Add Partiants sign up`.

---

## 8. PRÓXIMOS PASOS RECOMENDADOS (orden sugerido)

1. **Verificación DB en Supabase** (SQL Editor):
   - Aplicar `017_unify_work_schedule.sql`.
   - `SELECT * FROM roles;` (¿existen admin/psychologist/assistant/patient?).
   - Comparar con migraciones aplicadas (preferiblemente con `supabase migration list` si hay CLI).
2. **Rotar secretos**: sacar `.env` del repo, añadir a `.gitignore`, rotar `SUPABASE_SECRET_KEY`/`SUPABASE_ACCESS_TOKEN`.
3. **Limpiar política antigua de `site_settings`** + agregar `search_path` a funciones sin él → nueva migración 018.
4. **Gatear modales de `dashboard.js` por rol** para que coincidan con la matriz de permisos.
5. **Arreglar N+1** (`getEmotionalState`) y deuda de stats.
6. **Eliminar módulo Mensajes stub** o implementarlo (decidir con el cliente).
7. **Revisar códigos muertos** según sección 6 listado.

---

## 9. NOTAS DE PROCESO / REGLAS DEL REPO

- Los commits en este repo usan formato corto tipo `Fix:...`, `Add:...`, `New:...`. Seguir ese estilo.
- Migraciones se aplican MANUALMENTE en el SQL Editor de Supabase (no hay script local). Verificar idempotencia y orden.
- El usuario suele pedir verificación HTTP / `node --check` tras cambios.
- Idioma de la conversación y del código: español.
- La carpeta de trabajo de opencode para temp files: `C:\Users\frank\AppData\Local\Temp\opencode`.

---

_Generado como memoria/auditoría para continuar en la siguiente sesión._