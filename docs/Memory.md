# AUDITORÍA — Migración Dashboard (25 Ago 2026)

## A. Arquitectura
- Proyecto raíz: C:\Projects\Contexto
- SPA vanilla HTML/CSS/JS, hash routing, Supabase Auth
- Entry: index.html → js/core/app.js (ES modules)
- Nuevo dashboard en: mente-serena/ (standalone, sin auth, sin modules)

## B. Flujo auth
Login → authService.login() → Supabase Auth → onAuthStateChange → router.navigate('/dashboard')

## C. Routing
- #/login (no auth) → login.js
- #/dashboard (auth) → dashboard.js (ANTIGUO)
- #/patients, /appointments, /sessions, /assessments, /reports, /settings, /admin (auth)
- Logout → authService.logout() → /#/login

## D. Dashboard antiguo
- js/pages/dashboard.js (662 líneas) — Interfaz neural/orbital
- css/dashboard.css (1901 líneas)
- js/components/orbitalCore.js, orbitalNodes.js, contextPanel.js
- js/services/dashboardService.js (313 líneas)
- Variables CSS propias (--dashboard-*)

## E. Dashboard nuevo (mente-serena/)
- mente-serena/index.html (245 líneas)
- mente-serena/css/dashboard.css (1244 líneas)
- mente-serena/js/dashboard.js (845 líneas)
- mente-serena/js/data.js (135 líneas)
- Layout 3 columnas, header con CSS mask, órbita CSS, modales inline
- Variables completamente diferentes (--bg-base, --violet, --bg-card)
- Fuentes: Fraunces (serif) + Inter
- Sin auth, sin routing, sin ES modules

## F. Riesgos identificados
1. Variables CSS en conflicto total (misma semántica, valores distintos)
2. No usa ES modules (globals)
3. Sin autenticación
4. Nombre "Mente Serena" vs "CONTEXTO"
5. CSS global redefine html/body/button/input
6. Fuentes diferentes
7. Sistema de modales/toasts diferente

## G. Migración realizada
- CSS nuevo encapsulado bajo .app--dashboard para evitar conflictos
- JS convertido a ES module (DashboardNewPage class)
- Datos mock en servicio separado (dashboardNewService.js)
- Integrado con router y auth existente
- Carpeta mente-serena eliminada tras integración



Plan de Remediación Recomendado
Semana 1 (Seguridad):
1. Rotar todas las keys y credenciales
2. Corregir RLS en migraciones 005, 006, 007
3. Agregar btree_gist al schema
4. Fix XSS en login.js y dashboard.js
5. Eliminar credenciales de Memory.md + historial git
Semana 2 (Bugs críticos):
6. Fix memory leak en dashboard.js (unsubscribe en destroy)
7. Fix race condition en modal.js
8. Fix botón stuck en settings.js
9. Agregar ruta /reset-password o arreglar redirect
10. Fix carga de permisos en recarga (escuchar INITIAL_SESSION)
Semana 3 (Calidad):
11. Unificar sistema de temas
12. Eliminar mockData.js (o reemplazar con datos reales)
13. Fix password policy consistente
14. Mover conflict detection de citas a BD
15. Limpiar console.logs