// scripts/preview-header.js
// Renderiza el header del dashboard sin necesidad de Supabase.
// Inyecta un stub de los módulos que el header necesita, para poder
// iterar sobre el diseño sin una sesión.
//
// Uso:  node scripts/preview-header.js
// Abre http://localhost:3111/scripts/preview-header.html

const fs = require('fs');
const path = require('path');

const html = `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview header + footer</title>
<link rel="stylesheet" href="../css/themes/variables.css">
<link rel="stylesheet" href="../css/themes/dark.css">
<link rel="stylesheet" href="../css/themes/light.css">
<link rel="stylesheet" href="../css/reset.css">
<link rel="stylesheet" href="../css/typography.css">
<link rel="stylesheet" href="../css/dashboard-new.css">
<link rel="stylesheet" href="../css/landing.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
  /* Solo para la preview: el dashboard real aplica esto en .app--dashboard */
  body { background: #07070f; padding: 24px 0; }
</style>
</head>
<body>
<div id="app" class="app--dashboard">
  <div class="page-body" id="pageBody"></div>
</div>

<script type="module">
/* Stub mínimo del dashboard: solo el marcado del header y del footer,
   para iterar el diseño sin tocar Supabase. */
const headerHTML = \`
    <header class="app-header-dash">
        <div class="header-shape" aria-hidden="true"></div>
        <svg class="header-border-svg" viewBox="0 0 1536 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,100 C260,100 300,52 600,52 L936,52 C1236,52 1276,100 1536,100" />
        </svg>
        <div class="header-content">
            <div class="brand">
                <div class="brand-icon">
                    <svg class="brand-logo-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 3a9 9 0 000 18" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round"/>
                        <path d="M12 21a9 9 0 000-18" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="17" cy="7" r="2.2" fill="#93c5fd"/>
                        <circle cx="7" cy="17" r="2.2" fill="#67e8f9"/>
                        <circle cx="12" cy="3" r="1.4" fill="#fcd34d"/>
                    </svg>
                </div>
                <div class="brand-text">
                    <div class="brand-name">CONTEXTO</div>
                    <div class="brand-sub">Psicología</div>
                </div>
            </div>
            <div class="header-center">
                <span class="clock-date" id="dashDate">Lunes, 12 de Octubre 2026</span>
                <span class="dot-sep" aria-hidden="true"></span>
                <span class="clock-time" id="dashTime">09:21 PM</span>
            </div>
            <div class="header-right">
                <button class="icon-btn notif-btn" id="dashNotifications" aria-label="Ver notificaciones">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
                    <span class="badge-dot" id="dashNotifDot" hidden aria-hidden="true"></span>
                </button>
                <button class="icon-btn" id="dashCalendar" aria-label="Abrir calendario">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v3M16 3v3"/></svg>
                </button>
                <button class="icon-btn" id="dashSettings" aria-label="Configuración">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 4.6a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1c0 .7.4 1.3 1 1.5.6.3 1.3.1 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1c-.5.5-.6 1.2-.3 1.8.2.6.8 1 1.5 1H21a2 2 0 1 1 0 4h-.1c-.7 0-1.3.4-1.5 1Z"/></svg>
                </button>
                <span class="header-divider" aria-hidden="true"></span>
                <div class="user-menu">
                    <button class="user-trigger">
                        <div class="avatar">CO</div>
                        <div class="user-text">
                            <div class="user-name">Context</div>
                            <div class="user-role">Profesional</div>
                        </div>
                        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                </div>
            </div>
        </div>
    </header>
    <div style="padding: 28px 24px 0;">
      <div class="dash-card" style="padding:28px;color:var(--dash-text-secondary);font-family:var(--font-sans);">
        Contenido de ejemplo — para medir el contraste entre el header y el cuerpo.
      </div>
    </div>
\`;

document.getElementById('pageBody').innerHTML = headerHTML;
document.documentElement.setAttribute('data-ready', 'true');
</script>
</body>
</html>
`;

const out = path.join(__dirname, 'preview-header.html');
fs.writeFileSync(out, html);
console.log('OK  ' + out);