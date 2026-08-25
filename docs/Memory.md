fmedina@gmail.com
123456


 kilo -s ses_fd99f5d97ffeR6LnO7V1B0s43N

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

