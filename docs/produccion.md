# CONTEXTO — Auditoría, Plan de Producción y Precio

> **Fecha:** 2026-10-12
> **Alcance:** repositorio completo (46 JS / 12.503 LOC · 14 CSS / 7.756 LOC · 22 SQL / 2.749 LOC)
> **Estado actual:** desplegado en `https://fmedinab.github.io/Contexto/#/dashboard`
> **Objetivo:** decidir si es viable pasar a producción con dominio propio y definir cuánto cobrar al cliente.

---

## 0. Estado de ejecución (2026-10-12)

Lo que ya está hecho en el repo. **Tú solo tienes que hacer lo marcado como 👤 ACCIÓN TUYA.**

### Fases 0–2 aplicadas

| # | Cambio | Archivo |
|---|---|---|
| ✅ | Bucket `avatars` + 4 policies de storage (B0.3) | `database/migrations/020_storage_avatars.sql` *(aplicar en Supabase)* |
| ✅ | Script de verificación de BD, 8 checks | `database/verify.sql` *(pegar en SQL Editor)* |
| ✅ | 404 con diseño de marca | `404.html` |
| ✅ | SEO básico | `robots.txt`, `sitemap.xml` |
| ✅ | Open Graph + Twitter Card | `index.html` |
| ✅ | Imagen OG 1200×630 generada | `assets/og-image.png` (`npm run og-image`) |
| ✅ | 8 iconos PNG maskable | `assets/icons/*.png` (`npm run icons`) |
| ✅ | Lockout silencioso eliminado (B1.1) | `permissionService.js`, `app.js` |
| ✅ | Ceros falsos en reportes (B1.2) | `reportsService.js` |
| ✅ | `mockData.js` → `dashboardData.js` (B1.3) | renombrado |
| ✅ | Módulo Mensajes oculto (B1.4) | `dashboard.js` `FEATURE_FLAGS` |
| ✅ | ESLint + Prettier | `eslint.config.mjs`, `.prettierrc.json` |
| ✅ | **Smoke tests sin dependencias** (42 checks) | `scripts/smoke-test.js` |
| ✅ | CI en GitHub Actions (9 pasos) | `.github/workflows/ci.yml` |
| ✅ | Migración 021: permisos `tasks:*` / `notes:*` | `database/migrations/021_tasks_notes_permissions.sql` |
| ✅ | Migración 022: **brecha de datos clínicos** — `assistant` podía leer notas | `database/migrations/022_rls_clinical_staff_only.sql` |
| ✅ | Fix rutas `/tasks` y `/notes` inaccesibles para todos | `permissionService.js`, `permissions.js` |
| ✅ | Errores tragados donde `supabase` no lanza | `tasksService.js`, `evaluationsService.js` |
| ✅ | `memory.md` y docs corregidos | `memory.md` |

**Resultado:** `npm run lint` → **0 errores, 15 warnings** (preexistentes) · `npm run smoke` → **42 OK / 0 FAIL**

### Lo que falta (todo requiere que tú decidas o accesses al panel)

**👤 ACCIÓN TUYA — obligatorio antes de cobrar:**

- [ ] **Rotar** `SUPABASE_ACCESS_TOKEN` y `SUPABASE_SECRET_KEY` (están en texto plano en `C:\Projects\Contexto\.env`)
- [ ] **Aplicar migraciones 020, 021 y 022** en Supabase SQL Editor
- [ ] **Correr `database/verify.sql`** — el CHECK 9 es nuevo y detecta la brecha de datos clínicos
- [ ] `npm install` para instalar ESLint/Prettier (ya hay `package-lock.json`)
- [ ] **Primer push** para que corra el CI por primera vez

> ⚠️ **La migración 022 cambia a quién ve datos clínicos.** Si el negocio
> espera que recepción lea notas, no la apliques sin decidirlo: es una decisión
> clínica y legal, no técnica. El razonamiento está en el encabezado del archivo.

**👤 ACCIÓN TUYA — requiere comprar el dominio:**

- [ ] Comprar dominio → crear `CNAME` → DNS → `Enforce HTTPS`
- [ ] Actualizar **Site URL + Redirect URLs** en Supabase Authentication
- [ ] Reemplazar `github.io` en `index.html`, `robots.txt`, `sitemap.xml`

**Ver el checklist completo en §6.**

---

## 1. Respuesta corta a las 3 preguntas

| Pregunta | Respuesta |
|---|---|
| ¿Alcanza con comprar el dominio? | **SÍ.** GitHub Pages soporta dominio propio y el sistema **ya es 100% estático**. Solo se agrega un archivo `CNAME` + registros DNS. No hay nada que recompilar ni migrar. |
| ¿Hay bugs? | **Sí, ~14**, ninguno bloqueante pero 3 son P0/P1 (deuda de seguridad y de permisos). |
| ¿Cuánto cobrar? | **S/ 14.500** (rango S/ 6.500 – 26.000 según alcance) por el sistema ya construido + hardeo previo. Detalle en §7. |

---

## 2. Dominio propio: sí, y es trivial

### 2.1 Por qué funciona

El proyecto tiene **cero build step**. No hay Vite, ni webpack, ni npm deps en runtime. `package.json` solo tiene `dependencies: {}`. Todo son archivos estáticos servidos tal cual. El "build" es copiar archivos.

Además el router es **hash-based** (`#/dashboard`), no History API. Esto es clave:

- Con History API (`/dashboard`) necesitarías reglas de rewrite en el servidor → GitHub Pages NO las tiene → 404 al recargar.
- Con hash routing, `https://tudominio.com/#/dashboard` siempre resuelve a `index.html` → **funciona en cualquier host estático sin configuración**.

Back end aparte: Supabase ya está hosteado en `bpfouoddrdelcqicdnor.supabase.co`. Cambiar el dominio del front **no toca la base de datos**.

### 2.2 Verificado: no hay URLs de GitHub Pages hardcodeadas

```
grep "github.io|fmedinab" en js/, index.html, config/  →  0 resultados
```

El único punto que reconstruye la URL base es dinámico y ya está preparado:

```js
// js/services/authService.js:8
const APP_BASE = window.location.origin
                + window.location.pathname.replace(/[#?].*$/, '');
```

Funciona igual en `/Contexto/`, en `/` o en `https://contexto.com.pe`. **No hay que tocar una línea de código.**

### 2.3 Procedimiento exacto (15 minutos)

**Paso 1 — Comprar el dominio** (Namecheap / Cloudflare / GoDaddy). `.com` o `.com.pe`. Cloudflare es gratis y más rápido en DNS.

**Paso 2 — Crear `CNAME` en la raíz del repo:**

```
contexto.com.pe
```

**Paso 3 — DNS.** Con Cloudflare:

| Tipo | Nombre | Valor |
|---|---|---|
| CNAME | `@` | `fmedinab.github.io` |
| CNAME | `www` | `contexto.com.pe` |

> GitHub Pages sirve de apex con CNAME a `*.github.io` si el DNS está en Cloudflare.
> Si usas Namecheap/GoDaddy, usa los **A records** de GitHub en vez de CNAME:
> `185.199.108.153` · `185.199.109.153` · `185.199.110.153` · `185.199.111.153`

**Paso 4 — Activar HTTPS** en `Settings → Pages → Enforce HTTPS` (checkbox). GitHub emite el certificado Let's Encrypt automáticamente. **Obligatorio**: sin esto, Supabase rechazará los magic links por redirect HTTP→HTTPS.

**Paso 5 — Actualizar Supabase** (este paso se **olvida siempre** y rompe los magic links):

`Supabase Dashboard → Authentication → URL Configuration`

| Campo | Valor |
|---|---|
| Site URL | `https://contexto.com.pe` |
| Redirect URLs | `https://contexto.com.pe/**` |
| | `https://fmedinab.github.io/Contexto/**` ← **déjalo también**, por si rollbacks |

**Paso 6 — Agregar los dominios al bucket de Supabase** (solo si subes archivos/avatares): `Storage → avatars → Settings → Permitted domains`.

**Paso 7 — DNS de correo.** Si quieres que `@contexto.com.pe` reciba correo, hay que configurar MX/SPF/DKIM del hosting de correo. **GitHub Pages no envía correo** — por eso hoy usas links de WhatsApp, que es correcto para este negocio.

### 2.4 Limitación real de GitHub Pages (importante)

GitHub Pages **no permite configurar HTTP headers**. No hay forma de enviar:

| Header ausente | Consecuencia |
|---|---|
| `Content-Security-Policy` | Sin protección contra XSS inyectado vía CDN |
| `Strict-Transport-Security` | Sin HSTS |
| `X-Frame-Options` / `frame-ancestors` | La app se puede embeber en un `<iframe>` (**clickjacking** sobre datos clínicos) |
| `X-Content-Type-Options` | Sin `nosniff` |
| `Referrer-Policy` | Fuga de URLs a terceros |

**Impacto real en este proyecto:** bajo-medio. El riesgo de clickjacking sobre un panel clínico es real pero bajo. Si el cliente exige headers, hay 2 salidas:

1. **Cloudflare Workers/Pages** (gratis hasta 100k req/día) → sí permite headers. **Migración: 30 minutos**, solo cambia el deploy target.
2. Mantener GitHub Pages y aceptar el riesgo.

> **Recomendación:** si vas a producción con datos clínicos reales, migra a **Cloudflare Pages**. Es gratis, más rápido, te da headers, te da analytics gratis, y elimina la dependencia de `fmedinab.github.io`. Lo dejo como decisión del §6.

---

## 3. Lo que ya está bien (no toques esto)

Para que no se pierda en el ruido, esto está **correcto y bien resuelto**:

- ✅ **RLS completa en las 15 tablas** con `SECURITY DEFINER` + `SET search_path` explícito → la defense real está en Postgres, no en el cliente. Es la decisión de arquitectura más importante y está tomada.
- ✅ **Anti-recursión de RLS** con `is_user_admin()` / `has_role()` — el error clásico de Supabase, bien esquivado.
- ✅ **Exclusión `btree_gist`** `no_overlapping_appointments_per_patient` → doble cita imposible a nivel de motor.
- ✅ **Sin service worker.** Fue borrado a propósito porque cacheaba respuestas de Supabase con datos de pacientes. **Esa decisión hay que defenderla**, no "arreglarla".
- ✅ **RBAC de 4 roles × ~40 permisos** con matriz declarativa.
- ✅ **Escape de HTML consistente.** ~209 usos de `innerHTML` y donde hay datos de usuario hay `escapeHtml()`. Revisé los puntos calientes (`appointments.js`, `dashboard.js`, `landing.js`) — están cubiertos.
- ✅ **Fail-closed en el guard** (`app.js:92-171`): si los roles no cargan, va al portal de paciente, no al dashboard.
- ✅ **Timeout de inactividad** configurable desde `site_settings`.
- ✅ **Sanitización correcta** en `sanitizer.js` (escapa `& < > " '`).

---

## 4. BUGS Y DEUDA REAL

### 🔴 P0 — Corregir ANTES de producción

#### B0.1 — La API key de Supabase está hardcodeada y versionada

```js
// config/env.js:8-9
url: 'https://bpfouoddrdelcqicdnor.supabase.co',
anonKey: 'sb_publishable_TT386pKgfPIukn7QiqD3ZA_am0SsTKO'
```

El encabezado del archivo dice *"este archivo no debe commitearse"* y luego se commiteó. Ahora mismo es **técnicamente aceptable** (una `sb_publishable_` es pública por diseño, y el RLS es el que protege), **pero:**

- No hay separación dev/prod. Si mañana creas un Supabase de pruebas, el front sigue apuntando a producción.
- Cualquiera que clone el repo tiene el identificador del proyecto del cliente.
- Si en algún momento usás `sb_secret_` por error, **queda expuesto en el historial de git para siempre**.

**Fix:** mover a un `config/env.prod.js` generado, o al menos documentar en `RULES.md` que `env.js` es público por diseño y que el service-role key **nunca** va ahí.

#### B0.2 — `.env` con secretos en texto plano en el disco

`SUPABASE_ACCESS_TOKEN` y `SUPABASE_SECRET_KEY` viven en `C:\Projects\Contexto\.env`.

**Verificado:** está correctamente en `.gitignore` y `git log --all -- .env` **no devuelve nada**. El repo está limpio en este punto. Pero hay dos secretos reales de producción en texto plano en un directorio local.

**Fix:** rotar ambas claves en el panel de Supabase (barato, 2 minutos) y migrar a Windows Credential Manager o `.env` fuera del árbol del proyecto.

#### B0.3 — Bucket `avatars` no lo crea ninguna migración

`profilesService.js` sube avatares al bucket `avatars`. **Ninguna migración SQL lo crea.** Si alguien no lo creó a mano en el dashboard, la subida de foto de perfil falla en producción con un error que el usuario solo ve como "no puedo subir mi foto".

**Fix:** migración `020_storage_avatars.sql` con `INSERT INTO storage.buckets ...` + las policies de SELECT (público) y UPDATE (solo al dueño). 20 líneas, elimina una dependencia invisible del estado actual.

---

### 🟠 P1 — Antes de cobrarle al cliente "esto está listo"

#### B1.1 — `permissionService.js:29` falla en silencio → bloqueo silencioso

Si la query de `user_roles` falla (timeout de red, RLS mal aplicado, tabla vacía), el servicio devuelve `[]`. El guard de `app.js` ve "sin roles" y manda al usuario al portal de paciente.

**Síntoma en producción:** "ayer podía ver mis pacientes y hoy me aparece como paciente". Sin error en pantalla, sin log. **Esto es la clase de bug que destruye la confianza en un sistema.**

**Fix:** distinguir `error` de `data: []`. Si hay error de red → mostrar pantalla de error con botón reintentar, no redirigir.

#### B1.2 — Errores enmascarados con `|| 0` en `reportsService.js`

```js
const totalPatients = patientsRes.count || 0;   // línea 51
const sessionsThisMonth = apptsRes.count || 0;  // línea 55
// ... 8 métricas más idénticas
```

Si Supabase devuelve error, los reportes muestran **"0 pacientes", "0 sesiones"** con aspecto de dato real. Un psicólogo puede tomar una decisión clínica sobre un dashboard que está mintiendo.

**Fix:** si `res.error`, devolver el error. Un reporte vacío honesto (`—`) es infinitamente mejor que un cero falso.

#### B1.3 — `mockData.js:129` — N+1 de 12 queries

`getEmotionalState()` dispara **12 consultas a Supabase por mes**. Con nombre que promete mock pero hace queries reales. Con 500 pacientes, esto son 12 round-trips en cada render del dashboard.

**Fix:** renombrar a `dashboardData.js` (el nombre actual es una trampa para el siguiente que lo lea) y colapsar a 1 query con `select('*, patient:patients(full_name)')`.

#### B1.4 — El módulo "Mensajes" está vacío

`mockData.js:125` → `getMessages()` devuelve `[]`. El botón existe en la UI, abre un modal vacío. **Es una función visible que no funciona** — el cliente la va a probar en la demo.

**Decisión:** ocultarlo hasta que exista, o implementarlo. Recomendación: **ocultarlo** (§5, F4).

#### B1.5 — Rutas huérfanas

`permissionService.canAccessPage()` y `router._buildTitle()` manejan `/sessions`, `/assessments`, `/settings`, `/admin`, pero **no están registradas** en `app.js`. Si el usuario navega a cualquiera → 404.

No es urgente, pero si un día agregás un link a esas rutas en un email o favorito, se rompe.

---

### 🟡 P2 — Calidad / mantenibilidad

| # | Hallazgo | Ubicación | Impacto |
|---|---|---|---|
| B2.1 | **`dashboard.js` = 2.750 líneas / 152 KB.** Es el archivo más grande del proyecto, 4× el siguiente. Contiene el shell + 4 modales + 4 paneles. | `js/pages/dashboard.js` | Cada cambio toca un archivo que nadie quiere abrir. **El mayor riesgo de velocidad de desarrollo del proyecto.** |
| B2.2 | `tasksService.js:64` — `catch { /* function may not exist yet */ }` traga el error de `check_overdue_tasks`. Si la función falla, las tareas vencidas nunca se marcan. | `js/services/tasksService.js:64` | Bug silencioso de datos |
| B2.3 | `evaluationsService.js:179` — `catch { /* continue without patient details */ }` traga errores de resolución de nombres | `js/services/evaluationsService.js:179` | Listados sin nombre de paciente, sin error |
| B2.4 | Política RLS huérfana `rls.sql:130` "Authenticated users can view site_settings" usa `auth.role()` (inválido en Postgres). Nunca se dropeó. | `database/rls.sql:130` | Redundante con migración 014; potencial fuga si alguien la "arregla" mal |
| B2.5 | Sin tests, sin ESLint, sin Prettier, sin typecheck. `npm test` es un `echo`. | `package.json:10` | **Toda la verificación actual es `node --check` (sintaxis) y un `curl` de status 200.** No detecta ni un error de lógica. |
| B2.6 | 0 CI/CD. `.github/` no existe, nunca se commiteó. Deploy = `git push` a ciegas. | — | Un push a `main` con un typo rompe producción sin ENTERAR a nadie |
| B2.7 | Sin `404.html`, `robots.txt`, `sitemap.xml` | raíz | 404 de GitHub Pages feo + **cero SEO**, crítico si el sitio es la puerta de entrada del cliente |
| B2.8 | `js/pwa/` está vacío. Manifest declara `screenshots: []`. Icons solo SVG (Android requiere PNG para maskable). | `js/pwa/`, `manifest.json` | La PWA no instala en varios Android |
| B2.9 | **4 de 6 docs desactualizados.** `architecture.md` describe History API (es hash router). `database.md` dice que `patients`/`appointments` "no existen". `security.md` §2.10 recomienda service worker que `RULES.md` prohíbe. | `docs/` | Contradicciones activas engañan al próximo que lea |
| B2.10 | `memory.md` afirma que `.env` fue commiteado. **Es falso** — el repo está limpio. | `memory.md:88` | Un dev futuro pierde tiempo "arreglando" algo que no está roto |

---

### 🟢 Nota — hallazgo de `memory.md` que **ya fue arreglado**

`memory.md:143` dice que *"los modales del dashboard evaden la matriz de permisos: un asistente puede abrir evaluaciones/tareas/notas"*.

**Verificado en `dashboard.js:474-500`: ya no es cierto.** `_canOpenModal(type, payload)` consulta la matriz para cada tipo de modal, y `tasks/notes/messages` exigen explícitamente rol admin o psychologist. **El fix ya está aplicado.** Actualizá `memory.md`.

---

## 5. FUNCIONALIDADES RECOMENDADAS

Ordenadas por relación valor/esfuerzo para un consultorio psicológico.

### Tier 1 —Altamente recomendadas (alto valor, bajo esfuerzo)

**F1. Facturación / cobros** ⭐ la más valiosa
Hoy el consultorio agenda sesiones pero no cobra. El sistema no tiene ni una tabla de pagos.
→ Tabla `invoices` + `payments`, estados `PENDIENTE/PAGADA/ANULADA`,Fn de saldo por paciente, integración con el KPI de facturación del dashboard.
**Valor:** pasa de "gestor de citas" a "sistema de negocio". Es lo que justifica el precio.

**F2. Recordatorios automáticos por email/WhatsApp reales**
Ya existe la cola de `reminders` y el enlace de WhatsApp manual, pero no hay automatización real.
→ Supabase Edge Function + cron, o Integrate con la API de WhatsApp Business.
**Valor:** reduce el no-show, que es la fuga de dinero #1 de un consultorio.

**F3. Respaldo / exportación de datos**
Cero backups. Si el cliente borra una nota clínica, no hay recuperación.
→ Script de export a JSON/CSV + snapshot programado de Postgres.
**Valor:** es la garantía que el cliente va a pedir antes de entregarle datos de pacientes.

**F4. Quitar el botón "Mensajes"** (si no se implementa messaging real)
1 línea. Removes un botón que no hace nada de la demo.

### Tier 2 — Valiosas (valor medio, esfuerzo medio)

**F5. Gráficas reales en el dashboard.** Hoy hay KPIs numéricos. Una línea de "sesiones por mes" y un donut de "estado emocional promedio" dan una percepción de producto terminado que vale más que 3 módulos más.

**F6. Adjuntos / documentos clínicos.** PDF de tests psicométricos, consentimientos firmados. Bucket `clinical-docs` con RLS estricta (solo el psicólogo tratante).

**F7. Búsqueda global.** Hoy hay que entrar a cada módulo a buscar. Un `⌘K` con patients/appointments/notes es de las mejoras de UX con mejor relación costo/beneficio.

**F8. Firma digital de consentimiento informado.** Requisito creciente en la práctica clínica privada.

### Tier 3 — Solo si el cliente las pide

- F9. Teleconsulta con link de videollamada integrado
- F10. App nativa (React Native / Capacitor) — la PWA ya cubre bien el caso móvil
- F11. Portal para familiares del paciente
- F12. Integración contable / facturación electrónica

---

## 6. CHECKLIST DE PRODUCCIÓN

`[x]` = hecho en el repo · `[ ]` = falta (requiere tu acción)

### Fase 0 — Cortafuegos (1 día)
- [ ] M0.1 Rotar `SUPABASE_ACCESS_TOKEN` y `SUPABASE_SECRET_KEY` (están en texto plano en disco) 👤
- [x] M0.2 Crear migración `020_storage_avatars.sql` (bucket + 4 policies)
- [ ] M0.3 Aplicar la 020 en Supabase y correr `database/verify.sql` (8 checks) 👤
- [ ] M0.4 Verificar que `002_fix_rls_recursion.sql` esté aplicada 👤 (CHECK 2 de verify.sql lo detecta)

### Fase 1 — Dominio + SEO (1 día)
- [ ] M1.1 Comprar dominio 👤
- [ ] M1.2 `CNAME` + DNS + `Enforce HTTPS` 👤
- [ ] M1.3 Supabase Auth → Site URL + Redirect URLs (nuevo **y** viejo) 👤
- [x] M1.4 `404.html` con diseño de marca (autónomo, funciona en subpath y en raíz)
- [x] M1.5 `robots.txt` + `sitemap.xml`
- [x] M1.6 Open Graph + Twitter Card en `index.html` + `og-image.png` 1200×630
- [x] M1.7 `manifest.json` con 8 iconos **PNG** maskable (los SVG con `<text>` no los instalaba Android)

### Fase 2 — Calidad mínima (3 días)
- [ ] M2.1 Separar el monolito `dashboard.js` en `panels/{settings,clinicSettings,cms,users}.js`
- [x] M2.2 `permissionService` distingue error de vacío + pantalla de error con reintento (fix B1.1)
- [x] M2.3 `reportsService` propaga errores en vez de devolver ceros falsos (fix B1.2)
- [x] M2.4 `mockData.js` → `dashboardData.js` (B1.3). *Nota: el N+1 ya estaba arreglado antes*
- [x] M2.5 Módulo "Mensajes" oculto vía `FEATURE_FLAGS` (fix B1.4)
- [x] M2.6 **ESLint + Prettier** — 0 errores, 15 warnings preexistentes
- [x] M2.7 **Smoke tests** (`scripts/smoke-test.js`, sin dependencias) — 42 checks: grafo de imports, assets, rutas vs router, secretos, migraciones, matriz RBAC, feature flags. **42 OK / 0 FAIL**
- [x] M2.8 **GitHub Actions**: 9 pasos (sintaxis → ESLint → smoke tests → assets → migraciones → `.env` → OG image)

### Fase 2.5 — Bugs de autorización (2026-10-12)

- [x] **M2.5a** Rutas `/tasks` y `/notes` redirigían a `/dashboard` a **todo el mundo**, incluidos admin y psicólogo: no había entrada en `canAccessPage()` y `hasAnyPermission([])` devuelve `false` (B1.5)
- [x] **M2.5b** No existían permisos `tasks:*` ni `notes:*` → añadidos 10 a la matriz (B1.5)
- [x] **M2.5c** `canAccessPage()` ahora **deniega** rutas desconocidas en vez de devolver `false` por accidente
- [x] **M2.5d** Migración `021_tasks_notes_permissions.sql` — seedea los 10 permisos y los reparte
- [x] **M2.5e** Migración `022_rls_clinical_staff_only.sql` — **brecha de datos clínicos**: las policies de `clinical_notes` y `therapeutic_tasks` daban SELECT/INSERT/UPDATE al rol `assistant` (recepcionista). El token de Supabase es público por diseño, así que una cuenta de recepción podía leer **todas las notas clínicas** vía `GET /rest/v1/clinical_notes`. La UI no lo mostraba, pero la API sí lo servía.

### Fase 3 — Producción (2 días)
- [ ] M3.1 Banner de cookies con enlaces reales 👤
- [ ] M3.2 **Política de privacidad y tratamiento de datos** redactada con el cliente. **Perú:** Ley 29733 (Protección de Datos Personales) + su Reglamento, y Ley 31814 sobre el tratamiento de datos personales en servicios de salud. Los `#/privacidad` y `#/aviso-legal` actuales salen del CMS y **deben ser texto revisado por un abogado**, no boilerplate. 👤
- [ ] M3.3 Probar matriz de permisos con las 4 cuentas reales (admin / psicólogo / asistente / paciente)
- [ ] M3.4 Probar los 2 roles de portal: paciente con registro, paciente creado por staff vía magic link
- [ ] M3.5 Verificar que las agendas no crucen (constraint GiST) con 2 citas simultáneas reales
- [ ] M3.6 Probar flujo completo de booking público → convertir a cita → enviar recordatorio
- [ ] M3.7 Probar reset de contraseña con el dominio nuevo
- [ ] M3.8 Verificar que `pnpm-lock` / `.env` / `.DS_Store` estén en `.gitignore` antes de entregar

### Fase 4 — Extra (decisión del cliente)

- [ ] M4.1 **¿Migrar de GitHub Pages a Cloudflare Pages?** (30 min, gratis, habilita CSP + HSTS + analytics)
- [ ] M4.2 Facturación (F1)
- [ ] M4.3 WhatsApp Business API (F2)
- [ ] M4.4 Backups automáticos (F3)

**Tiempo total sin extras: ~7 días laborables.**
**Con F1–F3: ~12–14 días.**

---

## 7. PRECIO

> **Moneda:** soles (S/ · PEN). Tasa de referencia usada: **1 USD ≈ S/ 3.75** (oct-2026).
> Todo el proyecto ya usa `currency: 'PEN'` como default en `profiles`, así que el sistema está coherente con la moneda del cliente.

### 7.1 Contexto de mercado

Un sistema de gestión de clínica psicológica **a medida** (no SaaS enlatado) en Perú/Latinoamérica se mueve en este rango:

| Modalidad | Rango típico |
|---|---|
| Sistema enlatado / SaaS (Radar, Fisio, Nexup) | S/ 100 – 450 / mes, con límites y poca personalización |
| Desarrollo a medida, alcance completo | S/ 90 – 225 / hora |
| **Lo que este proyecto representa** | **~600 – 900 horas de desarrollo** |

### 7.2 Lo que ya está construido

Módulos funcionando: landing CMS-driven, portal de paciente, autenticación con magic link, RBAC de 4 roles, pacientes, agenda con prevención de conflictos a nivel de motor, evaluaciones, tareas terapéuticas, notas clínicas, reportes, solicitudes de cita públicas, cola de recordatorios por WhatsApp, panel de administración, 19 migraciones, RLS en 15 tablas, 14 hojas de estilos con sistema de diseño, tema oscuro/claro, PWA.

**Eso es la parte cara. Ya está hecha.**

### 7.3 Recomendación

**Presupuesto al cliente: S/ 14.500**

| Concepto | Horas est. | S/ |
|---|---|---|
| Sistema ya construido (15 módulos, 19 migraciones, RLS, RBAC, CMS, PWA) | 600 | 9.000 |
| Fase 0 — Cortafuegos de datos | 8 | 900 |
| Fase 1 — Dominio, SEO, 404, Open Graph | 8 | 900 |
| Fase 2 — Refactor + hardening + tests + CI | 20 | 1.875 |
| Fase 3 — Validación con usuarios reales | 12 | 1.050 |
| **Subtotal** | **648** | **13.725** |
| Gestión de proyecto y garantía (10 %) | | 775 |
| **TOTAL** | | **~S/ 14.500** |

### 7.4 Rango de negociación

| Si… | Precio | Estrategia |
|---|---|---|
| Cliente pide solo "que funcione en mi dominio" | **S/ 2.800 – 4.200** | Solo Fase 0 + Fase 1 + validación. No prometas más. |
| Cliente espera sistema "hecho" | **S/ 10.500 – 12.000** | Aceptable si no exiges garantía ni soporte largo. Es vender software sin verificar. |
| **Precio justo (recomendado)** | **S/ 14.500 – 17.000** | Con 3 meses de garantía y 1 año de soporte |
| Cliente quiere facturación + WhatsApp + backups | **S/ 20.000 – 26.000** | Sube el alcance, sube el precio |

**Piso absoluto: S/ 6.500.** Por debajo, estás regalando 600 horas de trabajo especializado.

### 7.5 Cómo presentarlo

No digas *"te vendí un sistema"*. Decí:

> *"CONTEXTO está en producción y funcionando. Lo que estoy cotizando es ponerlo a nombre de tu clínica con tu dominio, verificarlo con tus usuarios reales, y garantizarte que funciona durante 3 meses."*

Esa versión justifica el precio **y** es honesta: no estás vendiendo humo.

### 7.6 Costos recurrentes que hay que cotizar por separado

| Concepto | Costo real |
|---|---|
| Dominio `.com` | S/ 40 – 55 / año |
| Dominio `.com.pe` | S/ 110 – 150 / año |
| Supabase Pro | S/ 95 / mes (recomendado: el plan gratis tiene límites insuficientes para datos clínicos) |
| GitHub Pages | S/ 0 |
| Respaldo externo | S/ 20 – 75 / mes |
| **Total mensual para el cliente** | **~S/ 115 – 170** |

**Esto es un argumento de venta fuerte:** el sistema completo cuesta menos que una cena para dos.

### 7.7 Estructura de pago sugerida

Para un cliente en Perú, esto es lo que suele funcionar mejor:

| Momento | Monto | % |
|---|---|---|
| Anticipo al firmar | S/ 5.800 | 40 % |
| Al entregar en el dominio del cliente | S/ 5.800 | 40 % |
| Al cerrar los 3 meses de garantía | S/ 2.900 | 20 % |

Facturar en soles conFactura/boleta electrónica vía un proveedor de facturación electrónica peruano (ContaFy, Facturama, Alegra). **Cobrar el 100 % por adelantado es raro en Perú y retrasa el proyecto**; 40/40/20 protege a ambas partes.

---

## 8. Orden de ejecución sugerido

```
Semana 1  ▸ Fase 0 (cortafuegos) + Fase 1 (dominio y SEO)
          ▸ Smoke tests manuales de la matriz de permisos
          ▸ENTREGABLE: funcionando en dominio propio

Semana 2  ▸ Fase 2 (refactor dashboard.js + hardening + ESLint + CI)
          ▸ Fase 3 (validación con usuarios reales)
          ▸ENTREGABLE: listo para cobrar

Semana 3+ ▸ Fases 4 y funcionalidades Tier 1 (según presupuesto)
```

---

## 9. Resumen ejecutivo para el cliente

**Lo bueno.** La arquitectura de seguridad está bien: RLS completa en las 15 tablas, funciones `SECURITY DEFINER` con `search_path` explícito, constraint GiST que impide doble cita a nivel de motor, y ninguna respuesta de Supabase cacheada en el cliente. La decisión de no usar service worker fue deliberada y correcta. El RBAC de 4 roles funciona.

**Lo que falta.** Cero tests, cero linter, cero CI. Eso significa que **no hay forma automática de saber si un cambio rompió algo**. No es terrible hoy porque el sistema es chico, pero es la razón #1 por la que un sistema como este se rompe a los 6 meses de uso real. Hay 3 bugs de datos que fallan en silencio (el más grave: si falla la carga de roles, el usuario aparece como paciente sin explicación), y el bucket de avatars no lo crea ninguna migración.

**El precio.** 600–900 horas de desarrollo a S/ 90–225/h da S/ 54.000–200.000 de valor de mercado. **S/ 14.500** es un precio de **amistad profesional con la confianza de mantener el sistema funcionando**. Si el presupuesto del cliente no llega, reduce alcance explícitamente (solo Fase 0+1, sin extras) — **nunca bajes precio manteniendo alcance.**

---

*Documento generado el 2026-10-12 · CONTEXTO v1.0.0 · Frank Medina*