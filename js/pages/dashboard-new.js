// js/pages/dashboard-new.js
// Dashboard nuevo — Mente Serena
// Page module integrado con el sistema de routing y auth de CONTEXTO.

import {
    getClinicianProfile, getGreeting, getSummary, getPatients,
    getAppointments, getEvaluations, getTasks, getNotes,
    getReports, getMessages, getEmotionalState, getQuote,
    formatDate, formatTime, getInitials
} from '../services/dashboardNewService.js';

const ICONS = {
    patients: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v3M16 3v3"/>',
    clipboard: '<path d="M9 12l2 2 4-4"/><path d="M7 3.5h7l4 4V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/>',
    checklist: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10"/>',
    notes: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    reports: '<path d="M4 19V9M12 19V5M20 19v-6"/><path d="M2 19h20"/>',
    messages: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
    therapy: '<path d="M12 21s-7-4.35-9.5-8.5C.7 9 2 5 6 5c2 0 3.4 1 4 2 .6-1 2-2 4-2 4 0 5.3 4 3.5 7.5C19 16.65 12 21 12 21Z"/>',
    settings: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9.06 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.29 1.04 1.56.6.25 1.3.12 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.46.57-.6 1.27-.34 1.87.27.63.88 1.04 1.56 1.04H21a2 2 0 1 1 0 4h-.09c-.68 0-1.29.4-1.56 1.04Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevRight: '<path d="M9 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
};

function icon(name, size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

const MODAL_TITLES = {
    core: ['Centro de Psicología', 'Accede rápidamente a todos los módulos de tu consultorio.'],
    patients: ['Pacientes', 'Consulta y gestiona los expedientes de tus pacientes.'],
    appointments: ['Agenda de citas', 'Organiza y da seguimiento a las citas del consultorio.'],
    evaluations: ['Evaluaciones', 'Administra los instrumentos psicológicos aplicados.'],
    tasks: ['Tareas terapéuticas', 'Seguimiento de las tareas asignadas a tus pacientes.'],
    notes: ['Notas clínicas', 'Historial de notas de sesión por paciente.'],
    reports: ['Reportes', 'Indicadores generales del consultorio.'],
    messages: ['Mensajes', 'Conversaciones recientes con tus pacientes.'],
    patientDetail: ['Expediente del paciente', ''],
    appointmentDetail: ['Detalle de la cita', ''],
    newAppointment: ['Nueva cita', 'Programa una nueva cita para un paciente.'],
    newNote: ['Nueva nota clínica', 'Registra el resumen de una sesión.'],
    newTask: ['Nueva tarea terapéutica', 'Asigna una tarea de seguimiento a un paciente.']
};

export class DashboardNewPage {
    constructor() {
        this.container = null;
        this.clockInterval = null;
        this.currentModal = null;
        this.activeEvaluationTab = 'pending';
        this.panelEvaluationTab = 'pending';
    }

    render() {
        this.container = document.getElementById('pageBody');
        if (!this.container) return;

        const profile = getClinicianProfile();
        const greeting = getGreeting();
        const quote = getQuote();

        this.container.innerHTML = `
            <div class="ambient-bg" aria-hidden="true"></div>
            <div class="app">
                <header class="app-header-dash">
                    <div class="header-shape" aria-hidden="true"></div>
                    <svg class="header-border-svg" viewBox="0 0 1536 100" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M0,100 C384,100 384,70 576,70 L960,70 C1152,70 1152,100 1536,100" />
                    </svg>
                    <div class="header-content">
                        <div class="brand">
                            <div class="brand-icon" aria-hidden="true">
                                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                    <path d="M20 12c-2.5 0-4.5 2-4.5 4.3 0 1-.6 1.4-1.2 2-.9.9-1.3 1.8-1.3 3 0 1 .4 1.8 1 2.4-.5.6-.8 1.3-.8 2.1 0 1.8 1.5 3.2 3.3 3.2h3.5V12Z" stroke="#c4b5fd" stroke-width="1.3" stroke-linejoin="round"/>
                                    <path d="M20 12c2.5 0 4.5 2 4.5 4.3 0 1 .6 1.4 1.2 2 .9.9 1.3 1.8 1.3 3 0 1-.4 1.8-1 2.4.5.6.8 1.3.8 2.1 0 1.8-1.5 3.2-3.3 3.2H20V12Z" stroke="#7dd3fc" stroke-width="1.3" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="brand-text">
                                <div class="brand-name">Mente Serena</div>
                                <div class="brand-sub">Consultorio de Psicología</div>
                            </div>
                        </div>
                        <div class="header-center">
                            <span class="clock-date" id="dashDate">—</span>
                            <span class="dot-sep" aria-hidden="true"></span>
                            <span class="clock-time" id="dashTime">--:--</span>
                        </div>
                        <div class="header-right">
                            <button class="icon-btn notif-btn" id="dashNotifications" aria-label="Ver notificaciones">
                                <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
                                <span class="badge-dot" aria-hidden="true"></span>
                            </button>
                            <button class="icon-btn" id="dashCalendar" aria-label="Abrir calendario">
                                <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v3M16 3v3"/></svg>
                            </button>
                            <button class="icon-btn" id="dashSettings" aria-label="Configuración">
                                <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 4.6a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1c0 .7.4 1.3 1 1.5.6.3 1.3.1 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1c-.5.5-.6 1.2-.3 1.8.2.6.8 1 1.5 1H21a2 2 0 1 1 0 4h-.1c-.7 0-1.3.4-1.5 1Z"/></svg>
                            </button>
                            <span class="header-divider" aria-hidden="true"></span>
                            <div class="user-menu" id="dashUserMenu">
                                <button class="user-trigger" id="dashUserTrigger" aria-haspopup="true" aria-expanded="false">
                                    <div class="avatar">${profile.avatarInitials}</div>
                                    <div class="user-text">
                                        <div class="user-name">${profile.name}</div>
                                        <div class="user-role">${profile.role}</div>
                                    </div>
                                    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                                </button>
                                <div class="dropdown" role="menu">
                                    <button role="menuitem" data-action="profile">Mi perfil</button>
                                    <button role="menuitem" data-action="preferences">Preferencias</button>
                                    <hr>
                                    <button role="menuitem" data-action="logout">Cerrar sesión</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div class="main-grid">
                    <div class="col">
                        <div class="greeting-card">
                            <h1 class="greeting-title">${greeting.text} <span class="heart" aria-hidden="true">♡</span></h1>
                            <p class="greeting-quote">"${greeting.phrase}"</p>
                        </div>
                        <section class="card">
                            <div class="card-title">Resumen del día</div>
                            <div class="summary-list" id="dashSummary"></div>
                            <div class="summary-footer">✦ Tú haces la diferencia</div>
                        </section>
                        <section class="card" id="dashPatientsPanel">
                            <div class="card-title">
                                Pacientes
                                <button class="modal-close" id="dashClosePatients" aria-label="Cerrar panel de pacientes" style="width:28px;height:28px;">
                                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                                </button>
                            </div>
                            <div class="search-row">
                                <input class="search-input" id="dashPatientSearch" type="text" placeholder="Buscar paciente..." aria-label="Buscar paciente">
                                <button class="filter-btn" id="dashPatientFilter">${icon('search', 13)} Filtrar</button>
                            </div>
                            <div id="dashPatientList"></div>
                            <button class="card-footer-link" data-modal="patients">Ver todos los pacientes</button>
                        </section>
                    </div>

                    <div class="orbit-section">
                        <div class="orbit-stage" id="dashOrbitStage">
                            <div class="orbit-ring ring-1" aria-hidden="true"></div>
                            <div class="orbit-ring ring-2" aria-hidden="true"></div>
                            <div class="orbit-ring ring-3" aria-hidden="true"></div>
                            <div id="dashParticleField" aria-hidden="true"></div>

                            <button class="module-orbit mod-pacientes" data-modal="patients" aria-label="Abrir módulo de pacientes">
                                <span class="mod-icon">${icon('patients', 17)}</span>Pacientes
                            </button>
                            <button class="module-orbit mod-citas" data-modal="appointments" aria-label="Abrir módulo de citas">
                                <span class="mod-icon">${icon('calendar', 17)}</span>Citas
                            </button>
                            <button class="module-orbit mod-evaluaciones" data-modal="evaluations" aria-label="Abrir módulo de evaluaciones">
                                <span class="mod-icon">${icon('clipboard', 17)}</span>Evaluaciones
                            </button>
                            <button class="module-orbit mod-tareas" data-modal="tasks" aria-label="Abrir módulo de tareas">
                                <span class="mod-icon">${icon('checklist', 17)}</span>Tareas
                            </button>
                            <button class="module-orbit mod-notas" data-modal="notes" aria-label="Abrir módulo de notas">
                                <span class="mod-icon">${icon('notes', 17)}</span>Notas
                            </button>
                            <button class="module-orbit mod-reportes" data-modal="reports" aria-label="Abrir módulo de reportes">
                                <span class="mod-icon">${icon('reports', 17)}</span>Reportes
                            </button>
                            <button class="module-orbit mod-mensajes" data-modal="messages" aria-label="Abrir módulo de mensajes">
                                <span class="mod-icon">${icon('messages', 17)}</span>Mensajes
                            </button>

                            <button class="brain-core" id="dashBrainCore" data-modal="core" aria-label="Abrir centro de control">
                                <svg viewBox="0 0 40 40" fill="none">
                                    <path d="M20 6c-3.6 0-6.5 2.9-6.5 6.3 0 1.4-.8 2-1.7 2.8-1.3 1.3-1.9 2.6-1.9 4.3 0 1.4.6 2.6 1.5 3.5-.7.9-1.1 1.9-1.1 3 0 2.6 2.1 4.6 4.7 4.6H20V6Z" stroke="#c4b5fd" stroke-width="1.3" stroke-linejoin="round"/>
                                    <path d="M20 6c3.6 0 6.5 2.9 6.5 6.3 0 1.4.8 2 1.7 2.8 1.3 1.3 1.9 2.6 1.9 4.3 0 1.4-.6 2.6-1.5 3.5.7.9 1.1 1.9 1.1 3 0 2.6-2.1 4.6-4.7 4.6H20V6Z" stroke="#7dd3fc" stroke-width="1.3" stroke-linejoin="round"/>
                                    <path d="M20 6v28.5" stroke="#f1f2f8" stroke-width="0.6" opacity="0.4"/>
                                </svg>
                            </button>

                            <div class="orbit-hint">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/></svg>
                                Haz clic en un módulo<br>para comenzar
                            </div>
                        </div>
                    </div>

                    <div class="col">
                        <section class="card">
                            <div class="card-title">
                                Próximas citas
                                <button class="card-link" data-modal="appointments">Ver agenda ${icon('chevRight', 12)}</button>
                            </div>
                            <div class="appt-list" id="dashAppointments"></div>
                        </section>
                        <section class="card emotion-card">
                            <div style="flex:1;min-width:0;">
                                <div class="card-title" style="margin-bottom:8px;">Estado emocional del consultorio</div>
                                <div class="emotion-chart-wrap" id="dashEmotionChart"></div>
                            </div>
                            <div class="emotion-side">
                                <div class="emotion-face" aria-hidden="true">🙂</div>
                                <div class="emotion-label">Ambiente positivo</div>
                                <div class="emotion-pct">78% ${icon('chevRight', 11)}</div>
                            </div>
                        </section>
                        <section class="card" id="dashEvaluationsPanel">
                            <div class="card-title">Evaluaciones</div>
                            <div class="tabs" id="dashEvalTabs">
                                <button class="tab-btn active" data-tab="pending">Pendientes <span class="tab-count">3</span></button>
                                <button class="tab-btn" data-tab="inProgress">En progreso <span class="tab-count">2</span></button>
                                <button class="tab-btn" data-tab="completed">Completadas <span class="tab-count">6</span></button>
                            </div>
                            <div id="dashEvalList"></div>
                            <button class="card-footer-link" data-modal="evaluations">Ver todas las evaluaciones</button>
                        </section>
                    </div>
                </div>

                <footer class="quote-footer">
                    <div class="quote-piece">
                        <span class="quote-mark" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15c-1.7 0-3-1.3-3-3 0-3 2.3-5.4 5-6l.5 1.4C7.8 8 7 9.2 7 10.5c1.4.2 2.5 1.3 2.5 2.5 0 1.2-1.1 2-2.5 2Zm9 0c-1.7 0-3-1.3-3-3 0-3 2.3-5.4 5-6l.5 1.4c-1.7.6-2.5 1.8-2.5 3.1 1.4.2 2.5 1.3 2.5 2.5 0 1.2-1.1 2-2.5 2Z"/></svg>
                        </span>
                        <p>"${quote.text}"</p>
                        <span class="quote-author">— ${quote.author}</span>
                    </div>
                </footer>
            </div>

            <div class="modal-overlay" id="dashModalOverlay" role="dialog" aria-modal="true">
                <div class="modal-box" id="dashModalBox"></div>
            </div>
            <div class="toast-dash" id="dashToast" role="status" aria-live="polite"></div>
        `;

        this._bindEvents();
        this._renderSummary();
        this._renderPatients();
        this._renderAppointments();
        this._renderEmotionChart();
        this._renderEvaluationsPanel();
        this._initParticles();
        this._startClock();
    }

    destroy() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
        if (this._docClickHandler) document.removeEventListener('click', this._docClickHandler);
        if (this._docKeyHandler) document.removeEventListener('keydown', this._docKeyHandler);
        this.container = null;
    }

    // ========== CLOCK ==========

    _startClock() {
        const update = () => {
            const now = new Date();
            const dateEl = $('#dashDate');
            const timeEl = $('#dashTime');
            if (dateEl) dateEl.textContent = formatDate(now);
            if (timeEl) timeEl.textContent = formatTime(now);
        };
        update();
        this.clockInterval = setInterval(update, 1000);
    }

    // ========== PARTICLES ==========

    _initParticles() {
        const field = $('#dashParticleField');
        if (!field) return;
        const count = 16;
        let html = '';
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
            const radius = 200 + Math.random() * 90;
            const x = 50 + (Math.cos(angle) * radius) / 6.4;
            const y = 50 + (Math.sin(angle) * radius) / 6.4;
            const delay = (Math.random() * 4).toFixed(2);
            html += `<span class="orbit-particle" style="left:${x}%; top:${y}%; animation-delay:${delay}s;"></span>`;
        }
        field.innerHTML = html;
    }

    // ========== RENDER SECTIONS ==========

    _renderSummary() {
        const s = getSummary();
        const el = $('#dashSummary');
        if (!el) return;
        el.innerHTML = `
            <div class="summary-item">
                <div class="summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v3M16 3v3"/></svg></div>
                <div><div class="summary-value">${s.todayAppointments}</div><div class="summary-label">Citas de hoy</div></div>
            </div>
            <div class="summary-item">
                <div class="summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/></svg></div>
                <div><div class="summary-value">${s.newEvaluations}</div><div class="summary-label">Nueva evaluación</div></div>
            </div>
            <div class="summary-item">
                <div class="summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10"/></svg></div>
                <div><div class="summary-value">${s.pendingTasks}</div><div class="summary-label">Tareas pendientes</div></div>
            </div>
        `;
    }

    _renderPatients(filter = '') {
        const list = $('#dashPatientList');
        if (!list) return;
        const patients = getPatients().filter(p => p.name.toLowerCase().includes(filter.trim().toLowerCase()));
        if (!patients.length) {
            list.innerHTML = `<div class="empty-state">No se encontraron pacientes.</div>`;
            return;
        }
        list.innerHTML = patients.map(p => `
            <button class="patient-row" data-patient-id="${p.id}">
                <div class="patient-avatar">${getInitials(p.name)}</div>
                <div class="patient-info">
                    <div class="patient-name-row">
                        <span class="patient-name">${p.name}</span>
                        <span class="tag ${p.status === 'new' ? 'tag-new' : ''}">${p.therapyType}</span>
                    </div>
                    <div class="patient-meta">${p.id} · ${p.age} años · ${p.nextAppointment}</div>
                </div>
                ${icon('chevRight', 15)}
            </button>
        `).join('');
    }

    _renderAppointments() {
        const list = $('#dashAppointments');
        if (!list) return;
        list.innerHTML = getAppointments().map((a, i) => `
            <button class="appt-row" data-appt-index="${i}">
                <span class="appt-status-dot ${a.status}"></span>
                <span class="appt-info">
                    <span class="appt-time-name">${a.time}<span class="sep">·</span>${a.patient}</span>
                    <span class="appt-type">${a.type}</span>
                </span>
                ${icon('chevRight', 16)}
            </button>
        `).join('');
    }

    _renderEmotionChart() {
        const wrap = $('#dashEmotionChart');
        if (!wrap) return;
        const points = getEmotionalState().points;
        const w = 320, h = 70, pad = 4;
        const max = Math.max(...points), min = Math.min(...points);
        const stepX = (w - pad * 2) / (points.length - 1);
        const coords = points.map((p, i) => {
            const x = pad + i * stepX;
            const y = h - pad - ((p - min) / (max - min || 1)) * (h - pad * 2);
            return [x, y];
        });
        const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ');
        const areaPath = `${linePath} L${coords[coords.length - 1][0]},${h} L${coords[0][0]},${h} Z`;
        wrap.innerHTML = `
            <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="emoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.35"/>
                        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                <path d="${areaPath}" fill="url(#emoGrad)" />
                <path d="${linePath}" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>`;
    }

    _renderEvaluationsPanel() {
        const container = $('#dashEvalList');
        if (!container) return;
        const tab = this.panelEvaluationTab;
        const evals = getEvaluations();
        const items = evals[tab] || [];
        $$('#dashEvalTabs .tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        if (!items.length) {
            container.innerHTML = `<div class="empty-state">No hay evaluaciones en esta categoría.</div>`;
            return;
        }
        container.innerHTML = items.slice(0, 3).map(ev => `
            <div class="eval-row">
                <div class="eval-icon">${icon('clipboard', 14)}</div>
                <div class="eval-info">
                    <div class="eval-name">${ev.name}</div>
                    <div class="eval-meta">${ev.patient} · ${ev.date}</div>
                </div>
                ${tab !== 'completed' ? `<button class="btn-start" data-eval-start="${ev.name}">Comenzar</button>` : `<span class="status-pill completed">Lista</span>`}
            </div>
        `).join('');
    }

    // ========== EVENTS ==========

    _bindEvents() {
        // User menu
        const userTrigger = $('#dashUserTrigger');
        const userMenu = $('#dashUserMenu');
        if (userTrigger && userMenu) {
            userTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = userMenu.classList.toggle('open');
                userTrigger.setAttribute('aria-expanded', String(isOpen));
            });
        }

        // Dropdown actions
        const userMenuEl = $('#dashUserMenu');
        if (userMenuEl) {
            userMenuEl.addEventListener('click', (e) => {
                const action = e.target.closest('[data-action]')?.dataset.action;
                if (action === 'logout') {
                    window.app?.auth?.logout().catch(() => {});
                } else if (action === 'profile') {
                    window.router?.navigate('/settings');
                }
                userMenuEl.classList.remove('open');
            });
        }

        // Notifications
        const notifBtn = $('#dashNotifications');
        if (notifBtn) {
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showToast('Tienes 2 mensajes nuevos y 1 recordatorio de evaluación.');
            });
        }

        // Calendar
        const calBtn = $('#dashCalendar');
        if (calBtn) {
            calBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._openModal('appointments');
            });
        }

        // Theme toggle
        const themeBtn = $('#dashSettings');
        if (themeBtn) {
            const appEl = document.getElementById('app');
            const savedTheme = localStorage.getItem('dash-theme') || 'dark';
            if (savedTheme === 'light' && appEl) {
                appEl.classList.add('light-mode');
            }
            themeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!appEl) return;
                appEl.classList.toggle('light-mode');
                const isLight = appEl.classList.contains('light-mode');
                localStorage.setItem('dash-theme', isLight ? 'light' : 'dark');
                this._showToast(isLight ? 'Modo claro activado.' : 'Modo oscuro activado.');
            });
        }

        // Patient search
        const patientSearch = $('#dashPatientSearch');
        if (patientSearch) {
            patientSearch.addEventListener('input', () => this._renderPatients(patientSearch.value));
        }

        // Close patients panel
        const closePatients = $('#dashClosePatients');
        if (closePatients) {
            closePatients.addEventListener('click', () => {
                const panel = $('#dashPatientsPanel');
                if (panel) panel.style.display = 'none';
            });
        }

        // Patient rows
        const patientList = $('#dashPatientList');
        if (patientList) {
            patientList.addEventListener('click', (e) => {
                const row = e.target.closest('[data-patient-id]');
                if (!row) return;
                const patient = getPatients().find(p => p.id === row.dataset.patientId);
                this._openModal('patientDetail', patient);
            });
        }

        // Appointment rows
        const apptList = $('#dashAppointments');
        if (apptList) {
            apptList.addEventListener('click', (e) => {
                const row = e.target.closest('[data-appt-index]');
                if (!row) return;
                const appt = getAppointments()[Number(row.dataset.apptIndex)];
                this._openModal('appointmentDetail', appt);
            });
        }

        // Eval tabs
        const evalTabs = $('#dashEvalTabs');
        if (evalTabs) {
            evalTabs.addEventListener('click', (e) => {
                const btn = e.target.closest('.tab-btn');
                if (!btn) return;
                this.panelEvaluationTab = btn.dataset.tab;
                this._renderEvaluationsPanel();
            });
        }

        // Eval start buttons
        const evalList = $('#dashEvalList');
        if (evalList) {
            evalList.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-eval-start]');
                if (!btn) return;
                this._showToast(`Iniciando: ${btn.dataset.evalStart}`);
            });
        }

        // Modal triggers (data-modal)
        document.body.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-modal]');
            if (trigger) {
                this._openModal(trigger.dataset.modal);
            }
        });

        // Close modal on overlay click
        const overlay = $('#dashModalOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) this._closeModal();
            });
        }

        // Close modal on Escape
        this._docKeyHandler = (e) => {
            if (e.key === 'Escape' && this.currentModal) this._closeModal();
        };
        document.addEventListener('keydown', this._docKeyHandler);

        // Close dropdowns on outside click
        this._docClickHandler = () => {
            const userMenu = $('#dashUserMenu');
            if (userMenu) {
                userMenu.classList.remove('open');
                const trigger = $('#dashUserTrigger');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
            }
        };
        document.addEventListener('click', this._docClickHandler);
    }

    // ========== MODALS ==========

    _openModal(type, payload = null) {
        this.currentModal = type;
        const overlay = $('#dashModalOverlay');
        const box = $('#dashModalBox');
        if (!overlay || !box) return;

        const [title, subtitle] = MODAL_TITLES[type] || ['Módulo', ''];
        const wide = ['core', 'patients', 'appointments', 'evaluations', 'reports', 'tasks'].includes(type);

        box.className = 'modal-box' + (wide ? ' modal-wide' : '');
        box.innerHTML = `
            <div class="modal-header">
                <div class="modal-title-group">
                    <h2 class="modal-title">${title}</h2>
                    ${subtitle ? `<p class="modal-subtitle">${subtitle}</p>` : ''}
                </div>
                <button class="modal-close" id="dashModalClose" aria-label="Cerrar">${icon('close', 15)}</button>
            </div>
            <div class="modal-body" id="dashModalBody"></div>
        `;

        this._renderModalBody(type, payload);
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        $('#dashModalClose')?.addEventListener('click', () => this._closeModal());
        setTimeout(() => $('#dashModalClose')?.focus(), 50);
    }

    _closeModal() {
        const overlay = $('#dashModalOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        this.currentModal = null;
    }

    _renderModalBody(type, payload) {
        const body = $('#dashModalBody');
        if (!body) return;

        switch (type) {
            case 'core': body.innerHTML = this._coreModalHTML(); break;
            case 'patients': body.innerHTML = this._patientsModalHTML(); this._renderModalPatientList(); break;
            case 'appointments': body.innerHTML = this._appointmentsModalHTML(); break;
            case 'evaluations': body.innerHTML = this._evaluationsModalHTML(); this._renderModalEvalList(); break;
            case 'tasks': body.innerHTML = this._tasksModalHTML(); break;
            case 'notes': body.innerHTML = this._notesModalHTML(); break;
            case 'reports': body.innerHTML = this._reportsModalHTML(); this._renderReportsChart(); break;
            case 'messages': body.innerHTML = this._messagesModalHTML(); break;
            case 'patientDetail': body.innerHTML = this._patientDetailHTML(payload); break;
            case 'appointmentDetail': body.innerHTML = this._appointmentDetailHTML(payload); break;
            case 'newAppointment': body.innerHTML = this._newAppointmentFormHTML(); break;
            case 'newNote': body.innerHTML = this._newNoteFormHTML(); break;
            case 'newTask': body.innerHTML = this._newTaskFormHTML(); break;
            default: body.innerHTML = '<div class="empty-state">Módulo en construcción.</div>';
        }

        this._bindModalBodyEvents(type);
    }

    _coreModalHTML() {
        const items = [
            ['patients', 'Pacientes', 'patients'], ['appointments', 'Citas', 'calendar'],
            ['evaluations', 'Evaluac.', 'clipboard'], ['tasks', 'Terapia', 'therapy'],
            ['notes', 'Notas', 'notes'], ['tasks', 'Tareas', 'checklist'],
            ['reports', 'Reportes', 'reports'], ['messages', 'Mensajes', 'messages'],
            ['settings', 'Config.', 'settings']
        ];
        return `<div class="core-grid">${items.map(([modal, label, ic]) => `
            <button class="core-module" data-core-open="${modal}">
                <span class="mod-icon">${icon(ic, 18)}</span>${label}
            </button>`).join('')}</div>`;
    }

    _patientsModalHTML() {
        return `
            <div class="search-row modal-search">
                <input class="search-input" id="dashModalPatientSearch" type="text" placeholder="Buscar paciente...">
                <button class="filter-btn">${icon('search', 13)} Filtrar</button>
                <button class="btn btn-primary" id="dashBtnNewPatient">${icon('plus', 14)} Nuevo paciente</button>
            </div>
            <div class="data-rows" id="dashModalPatientList"></div>
        `;
    }

    _renderModalPatientList(filter = '') {
        const el = $('#dashModalPatientList');
        if (!el) return;
        const patients = getPatients().filter(p => p.name.toLowerCase().includes(filter.trim().toLowerCase()));
        if (!patients.length) { el.innerHTML = `<div class="empty-state">No se encontraron pacientes.</div>`; return; }
        el.innerHTML = patients.map(p => `
            <div class="data-row">
                <div class="patient-avatar">${getInitials(p.name)}</div>
                <div class="data-main">
                    <div class="data-title">${p.name} <span class="tag" style="margin-left:6px;">${p.therapyType}</span></div>
                    <div class="data-sub">${p.id} · ${p.age} años</div>
                    <div class="data-sub2">Próxima cita: ${p.nextAppointment}</div>
                </div>
                <div class="action-row" style="margin-top:0;">
                    <button class="btn" data-view-patient="${p.id}">Ver</button>
                    <button class="btn" data-edit-patient="${p.id}">Editar</button>
                </div>
            </div>
        `).join('');
    }

    _appointmentsModalHTML() {
        const statusLabel = { confirmed: 'Confirmada', pending: 'Pendiente', 'in-progress': 'En curso', completed: 'Completada', cancelled: 'Cancelada' };
        return `
            <div class="action-row" style="justify-content:space-between; align-items:center;">
                <span class="data-sub" style="font-size:12.5px;">${formatDate(new Date())}</span>
                <button class="btn btn-primary" id="dashBtnNewAppointment">${icon('plus', 14)} Nueva cita</button>
            </div>
            <div class="data-rows">${getAppointments().map(a => `
                <div class="data-row">
                    <div class="patient-avatar">${getInitials(a.patient)}</div>
                    <div class="data-main">
                        <div class="data-title">${a.time} · ${a.patient}</div>
                        <div class="data-sub">${a.type}</div>
                    </div>
                    <span class="status-pill ${a.status}">${statusLabel[a.status] || a.status}</span>
                </div>
            `).join('')}</div>
        `;
    }

    _evaluationsModalHTML() {
        const tab = this.activeEvaluationTab;
        const evals = getEvaluations();
        return `
            <div class="tabs">
                <button class="tab-btn ${tab === 'pending' ? 'active' : ''}" data-modal-tab="pending">Pendientes <span class="tab-count">${evals.pending.length}</span></button>
                <button class="tab-btn ${tab === 'inProgress' ? 'active' : ''}" data-modal-tab="inProgress">En progreso <span class="tab-count">${evals.inProgress.length}</span></button>
                <button class="tab-btn ${tab === 'completed' ? 'active' : ''}" data-modal-tab="completed">Completadas <span class="tab-count">${evals.completed.length}</span></button>
            </div>
            <div class="data-rows" id="dashModalEvalList"></div>
        `;
    }

    _renderModalEvalList() {
        const el = $('#dashModalEvalList');
        if (!el) return;
        const items = getEvaluations()[this.activeEvaluationTab] || [];
        if (!items.length) { el.innerHTML = `<div class="empty-state">No hay evaluaciones en esta categoría.</div>`; return; }
        el.innerHTML = items.map(ev => `
            <div class="data-row">
                <div class="eval-icon">${icon('clipboard', 14)}</div>
                <div class="data-main">
                    <div class="data-title">${ev.name}</div>
                    <div class="data-sub">${ev.patient} · Asignada: ${ev.date}</div>
                </div>
                ${this.activeEvaluationTab !== 'completed' ? `<button class="btn-start" data-eval-start="${ev.name}">Comenzar</button>` : `<span class="status-pill completed">Completada</span>`}
            </div>
        `).join('');
    }

    _tasksModalHTML() {
        const tasks = getTasks();
        const groups = [['pending', 'Pendientes'], ['inProgress', 'En progreso'], ['completed', 'Completadas']];
        return `
            <div class="action-row" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="dashBtnNewTask">${icon('plus', 14)} Nueva tarea</button>
            </div>
            ${groups.map(([key, label]) => `
                <div class="data-title" style="margin:6px 0 -2px; color:var(--dash-text-secondary); font-size:12px; text-transform:uppercase; letter-spacing:.04em;">${label}</div>
                <div class="data-rows">
                    ${(tasks[key] || []).map(t => `
                        <div class="data-row" style="flex-direction:column; align-items:stretch;">
                            <div style="display:flex; gap:12px; align-items:center;">
                                <div class="patient-avatar">${getInitials(t.patient)}</div>
                                <div class="data-main">
                                    <div class="data-title">${t.description}</div>
                                    <div class="data-sub">${t.patient} · Vence: ${t.due} · Prioridad: ${t.priority}</div>
                                </div>
                                <span class="status-pill ${key === 'completed' ? 'completed' : key === 'inProgress' ? 'in-progress' : 'pending'}">${t.progress}%</span>
                            </div>
                            <div class="progress-track"><div class="progress-fill" style="width:${t.progress}%;"></div></div>
                        </div>
                    `).join('') || `<div class="empty-state">Sin tareas en esta categoría.</div>`}
                </div>
            `).join('')}
        `;
    }

    _notesModalHTML() {
        return `
            <div class="action-row" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="dashBtnNewNote">${icon('plus', 14)} Nueva nota clínica</button>
            </div>
            <div class="data-rows">${getNotes().map(n => `
                <div class="data-row">
                    <div class="eval-icon">${icon('notes', 14)}</div>
                    <div class="data-main">
                        <div class="data-title">${n.patient} <span class="tag" style="margin-left:6px;">${n.sessionType}</span></div>
                        <div class="data-sub">${n.date}</div>
                        <div class="data-sub2">${n.summary}</div>
                    </div>
                </div>
            `).join('')}</div>
        `;
    }

    _reportsModalHTML() {
        const reports = getReports();
        return `
            <div class="indicator-grid">${reports.indicators.map(i => `
                <div class="indicator-box">
                    <div class="indicator-value">${i.value}</div>
                    <div class="indicator-label">${i.label}</div>
                    <div class="indicator-delta">${i.delta} vs. mes anterior</div>
                </div>
            `).join('')}</div>
            <div class="data-title" style="margin-top:6px; font-size:12px; color:var(--dash-text-secondary); text-transform:uppercase; letter-spacing:.04em;">Sesiones por mes</div>
            <div class="mini-chart" id="dashReportsChart"></div>
        `;
    }

    _renderReportsChart() {
        const el = $('#dashReportsChart');
        if (!el) return;
        const values = getReports().monthlySessions;
        const w = 680, h = 90, gap = 6;
        const barW = (w - gap * (values.length - 1)) / values.length;
        const max = Math.max(...values);
        const bars = values.map((v, i) => {
            const bh = (v / max) * (h - 10);
            const x = i * (barW + gap);
            const y = h - bh;
            return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="url(#barGrad)" />`;
        }).join('');
        el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%; height:100%;">
            <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#38bdf8"/></linearGradient></defs>
            ${bars}
        </svg>`;
    }

    _messagesModalHTML() {
        return `<div class="data-rows">${getMessages().map((m, i) => `
            <div class="message-row" data-message-index="${i}">
                <span class="unread-dot ${m.unread ? '' : 'read'}"></span>
                <div style="flex:1; min-width:0;">
                    <div class="message-name-row">
                        <span class="message-name">${m.patient}</span>
                        <span class="message-time">${m.time}</span>
                    </div>
                    <div class="message-preview">${m.preview}</div>
                </div>
            </div>
        `).join('')}</div>`;
    }

    _patientDetailHTML(patient) {
        if (!patient) return `<div class="empty-state">Paciente no encontrado.</div>`;
        return `
            <div class="data-row">
                <div class="patient-avatar" style="width:52px;height:52px;font-size:15px;">${getInitials(patient.name)}</div>
                <div class="data-main">
                    <div class="data-title" style="font-size:16px;">${patient.name}</div>
                    <div class="data-sub">${patient.id} · ${patient.age} años · ${patient.therapyType}</div>
                    <div class="data-sub2">Próxima cita: ${patient.nextAppointment}</div>
                </div>
            </div>
            <div class="data-title" style="font-size:12px; color:var(--dash-text-secondary); text-transform:uppercase; letter-spacing:.04em; margin-top:4px;">Notas recientes</div>
            <div class="data-row" style="background:rgba(255,255,255,0.02);">
                <div class="data-main"><div class="data-sub2">${patient.notes}</div></div>
            </div>
            <div class="action-row">
                <button class="btn btn-primary" data-edit-patient="${patient.id}">Editar</button>
                <button class="btn" data-history-patient="${patient.id}">Ver historial completo</button>
            </div>
        `;
    }

    _appointmentDetailHTML(a) {
        if (!a) return `<div class="empty-state">Cita no encontrada.</div>`;
        const statusLabel = { confirmed: 'Confirmada', pending: 'Pendiente', 'in-progress': 'En curso', completed: 'Completada', cancelled: 'Cancelada' };
        return `
            <div class="data-row">
                <div class="patient-avatar">${getInitials(a.patient)}</div>
                <div class="data-main">
                    <div class="data-title">${a.patient}</div>
                    <div class="data-sub">${a.type}</div>
                    <div class="data-sub2">Hoy · ${a.time}</div>
                </div>
                <span class="status-pill ${a.status}">${statusLabel[a.status] || a.status}</span>
            </div>
            <div class="action-row">
                <button class="btn btn-primary" data-confirm-appt="1">Confirmar asistencia</button>
                <button class="btn" data-reschedule-appt="1">Reprogramar</button>
                <button class="btn" data-cancel-appt="1">Cancelar</button>
            </div>
        `;
    }

    _newAppointmentFormHTML() {
        const patientOptions = getPatients().map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        return `
            <form class="form-grid" id="dashFormNewAppointment">
                <div class="form-field"><label for="fPatient">Paciente</label><select id="fPatient">${patientOptions}</select></div>
                <div class="form-field"><label for="fDate">Fecha</label><input type="date" id="fDate"></div>
                <div class="form-field"><label for="fTime">Hora</label><input type="time" id="fTime"></div>
                <div class="form-field"><label for="fType">Tipo de sesión</label>
                    <select id="fType"><option>Terapia Individual</option><option>Terapia de Pareja</option><option>Evaluación Inicial</option></select>
                </div>
                <div class="action-row"><button type="submit" class="btn btn-primary">Guardar cita</button><button type="button" class="btn" id="dashCancelNewAppointment">Cancelar</button></div>
            </form>
        `;
    }

    _newNoteFormHTML() {
        const patientOptions = getPatients().map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        return `
            <form class="form-grid" id="dashFormNewNote">
                <div class="form-field"><label for="nPatient">Paciente</label><select id="nPatient">${patientOptions}</select></div>
                <div class="form-field"><label for="nType">Tipo de sesión</label>
                    <select id="nType"><option>Terapia Individual</option><option>Terapia de Pareja</option><option>Evaluación Inicial</option></select>
                </div>
                <div class="form-field"><label for="nSummary">Resumen de la sesión</label><textarea id="nSummary" placeholder="Escribe el resumen clínico..."></textarea></div>
                <div class="action-row"><button type="submit" class="btn btn-primary">Guardar nota</button><button type="button" class="btn" id="dashCancelNewNote">Cancelar</button></div>
            </form>
        `;
    }

    _newTaskFormHTML() {
        const patientOptions = getPatients().map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        return `
            <form class="form-grid" id="dashFormNewTask">
                <div class="form-field"><label for="tPatient">Paciente</label><select id="tPatient">${patientOptions}</select></div>
                <div class="form-field"><label for="tDesc">Descripción</label><input type="text" id="tDesc" placeholder="Ej. Registro diario de emociones"></div>
                <div class="form-field"><label for="tDue">Fecha límite</label><input type="date" id="tDue"></div>
                <div class="form-field"><label for="tPriority">Prioridad</label>
                    <select id="tPriority"><option>Alta</option><option>Media</option><option>Baja</option></select>
                </div>
                <div class="action-row"><button type="submit" class="btn btn-primary">Asignar tarea</button><button type="button" class="btn" id="dashCancelNewTask">Cancelar</button></div>
            </form>
        `;
    }

    // ========== MODAL EVENT BINDING ==========

    _bindModalBodyEvents(type) {
        if (type === 'core') {
            $$('#dashModalBody [data-core-open]').forEach(btn => {
                btn.addEventListener('click', () => this._openModal(btn.dataset.coreOpen));
            });
        }

        if (type === 'patients') {
            const search = $('#dashModalPatientSearch');
            if (search) search.addEventListener('input', () => this._renderModalPatientList(search.value));
            $('#dashBtnNewPatient')?.addEventListener('click', () => this._showToast('Formulario de nuevo paciente (demo).'));
            this._bindPatientRowActions();
        }

        if (type === 'appointments') {
            $('#dashBtnNewAppointment')?.addEventListener('click', () => this._openModal('newAppointment'));
        }

        if (type === 'evaluations') {
            $$('#dashModalBody [data-modal-tab]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.activeEvaluationTab = btn.dataset.modalTab;
                    $$('#dashModalBody .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
                    this._renderModalEvalList();
                });
            });
            $$('[data-eval-start]').forEach(btn => {
                btn.addEventListener('click', (e) => { e.stopPropagation(); this._showToast(`Iniciando: ${btn.dataset.evalStart}`); });
            });
        }

        if (type === 'tasks') {
            $('#dashBtnNewTask')?.addEventListener('click', () => this._openModal('newTask'));
        }

        if (type === 'notes') {
            $('#dashBtnNewNote')?.addEventListener('click', () => this._openModal('newNote'));
        }

        if (type === 'messages') {
            $$('#dashModalBody [data-message-index]').forEach(row => {
                row.addEventListener('click', () => {
                    this._showToast(`Conversación marcada como leída.`);
                });
            });
        }

        if (type === 'patientDetail') this._bindPatientRowActions();

        if (type === 'appointmentDetail') {
            const map = { 'confirm-appt': 'Cita confirmada.', 'reschedule-appt': 'Iniciando reprogramación (demo).', 'cancel-appt': 'Cita cancelada.' };
            Object.keys(map).forEach(key => {
                const el = $(`#dashModalBody [data-${key}]`);
                if (el) el.addEventListener('click', () => { this._showToast(map[key]); this._closeModal(); });
            });
        }

        if (type === 'newAppointment') {
            $('#dashFormNewAppointment')?.addEventListener('submit', e => { e.preventDefault(); this._showToast('Cita creada correctamente.'); this._closeModal(); });
            $('#dashCancelNewAppointment')?.addEventListener('click', () => this._openModal('appointments'));
        }

        if (type === 'newNote') {
            $('#dashFormNewNote')?.addEventListener('submit', e => { e.preventDefault(); this._showToast('Nota clínica guardada.'); this._closeModal(); });
            $('#dashCancelNewNote')?.addEventListener('click', () => this._openModal('notes'));
        }

        if (type === 'newTask') {
            $('#dashFormNewTask')?.addEventListener('submit', e => { e.preventDefault(); this._showToast('Tarea terapéutica asignada.'); this._closeModal(); });
            $('#dashCancelNewTask')?.addEventListener('click', () => this._openModal('tasks'));
        }
    }

    _bindPatientRowActions() {
        $$('#dashModalBody [data-view-patient]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const p = getPatients().find(pt => pt.id === btn.dataset.viewPatient);
                this._openModal('patientDetail', p);
            });
        });
        $$('#dashModalBody [data-edit-patient]').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); this._showToast('Editar paciente (demo).'); });
        });
        $$('#dashModalBody [data-history-patient]').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); this._showToast('Abriendo historial clínico completo (demo).'); });
        });
    }

    // ========== TOAST ==========

    _showToast(message) {
        const toast = $('#dashToast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => toast.classList.remove('show'), 2600);
    }
}
