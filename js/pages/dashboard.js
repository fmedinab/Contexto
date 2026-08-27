// js/pages/dashboard.js
// Dashboard — Mente Serena
// Page module integrado con el sistema de routing y auth de CONTEXTO.

import {
    getClinicianProfile, getGreeting, getSummary,
    getAppointments, getTasks,
    getMessages, getEmotionalState, getQuote,
    formatDate, formatTime, getInitials, formatAppointmentDate
} from '../services/mockData.js';
import { patientService, THERAPY_TYPES, STATUS_LABELS } from '../services/patientsService.js';
import { appointmentService, STATUS_LABELS as APPT_STATUS_LABELS, STATUS_COLORS as APPT_STATUS_COLORS } from '../services/appointmentsService.js';
import { evaluationService, INSTRUMENTS, STATUS_LABELS as EVAL_STATUS_LABELS } from '../services/evaluationsService.js';
import { tasksService } from '../services/tasksService.js';
import { notesService } from '../services/notesService.js';
import { reportsService } from '../services/reportsService.js';

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

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
    newEvaluation: ['Nueva evaluación', 'Registra una nueva evaluación psicológica.'],
    newNote: ['Nueva nota clínica', 'Registra el resumen de una sesión.'],
    newTask: ['Nueva tarea terapéutica', 'Asigna una tarea de seguimiento a un paciente.'],
    patientForm: ['Paciente', '']
};

export class DashboardPage {
    constructor() {
        this.container = null;
        this.clockInterval = null;
        this.currentModal = null;
        this.activeEvaluationTab = 'pending';
        this.panelEvaluationTab = 'pending';
        this.activeTaskTab = 'PENDIENTE';
        this.panelTaskTab = 'PENDIENTE';
    }

    async render() {
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
                    <div class="col col-left">
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

                    <div class="col col-right">
                        <section class="card">
                            <div class="card-title">
                                Próximas citas
                                <button class="card-link" data-navigate="/appointments">Ver agenda ${icon('chevRight', 12)}</button>
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
                        <section class="card" id="dashTasksPanel">
                            <div class="card-title">Tareas terapéuticas</div>
                            <div class="tabs" id="dashTaskTabs">
                                <button class="tab-btn active" data-tab="PENDIENTE">Pendientes <span class="tab-count" id="dashTaskPendingCount">—</span></button>
                                <button class="tab-btn" data-tab="EN_PROGRESO">En progreso <span class="tab-count" id="dashTaskInProgressCount">—</span></button>
                                <button class="tab-btn" data-tab="COMPLETADA">Completadas <span class="tab-count" id="dashTaskCompletedCount">—</span></button>
                            </div>
                            <div id="dashTaskList"></div>
                            <button class="card-footer-link" data-modal="tasks">Ver todas las tareas</button>
                        </section>
                        <section class="card" id="dashNotesPanel">
                            <div class="card-title">Notas clínicas</div>
                            <div id="dashNotesList"></div>
                            <button class="card-footer-link" data-modal="notes">Ver todas las notas</button>
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
        await this._renderAppointments();
        this._renderEmotionChart();
        await this._renderEvaluationsPanel();
        await this._renderTasksPanel();
        await this._renderNotesPanel();

        patientService.onChange(() => {
            this._renderPatients();
            if (this.currentModal === 'patients') this._renderModalPatientList();
        });

        appointmentService.onChange(() => {
            this._renderAppointments();
        });
        evaluationService.onChange(async () => {
            await this._renderEvaluationsPanel();
            if (this.currentModal === 'evaluations') await this._renderModalEvalList();
        });
        tasksService.onChange(async () => {
            await this._renderTasksPanel();
            if (this.currentModal === 'tasks') await this._renderModalTaskList();
        });
        notesService.onChange(async () => {
            await this._renderNotesPanel();
            if (this.currentModal === 'notes') await this._renderModalNotesList();
        });
        this._initParticles();
        this._startClock();
        this._initResponsiveListeners();
    }

    destroy() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
        if (this._orientationHandler) window.removeEventListener('orientationchange', this._orientationHandler);
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

    // ========== RESPONSIVE LISTENERS ==========

    _initResponsiveListeners() {
        let resizeTimer;
        let lastWidth = window.innerWidth;

        this._resizeHandler = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const newWidth = window.innerWidth;
                if (Math.abs(newWidth - lastWidth) > 50) {
                    this._initParticles();
                    lastWidth = newWidth;
                }
            }, 250);
        };
        window.addEventListener('resize', this._resizeHandler);

        this._orientationHandler = () => {
            setTimeout(() => {
                this._initParticles();
            }, 300);
        };
        window.addEventListener('orientationchange', this._orientationHandler);
    }

    // ========== PARTICLES ==========

    _initParticles() {
        const field = $('#dashParticleField');
        if (!field) return;
        const isMobile = window.innerWidth < 768;
        const count = isMobile ? 8 : 16;
        const maxRadius = isMobile ? 120 : 200;
        let html = '';
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
            const radius = (isMobile ? 80 : 200) + Math.random() * (isMobile ? 40 : 90);
            const x = 50 + (Math.cos(angle) * radius) / (isMobile ? 3.6 : 6.4);
            const y = 50 + (Math.sin(angle) * radius) / (isMobile ? 3.6 : 6.4);
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

    async _renderPatients(filter = '') {
        const list = $('#dashPatientList');
        if (!list) return;
        const { data: patients } = await patientService.getAll({ search: filter || undefined });
        if (!patients.length) {
            list.innerHTML = `<div class="empty-state">No se encontraron pacientes.</div>`;
            return;
        }
        list.innerHTML = patients.slice(0, 6).map(p => `
            <button class="patient-row" data-patient-id="${p.id}">
                <div class="patient-avatar">${getInitials(p.name)}</div>
                <div class="patient-info">
                    <div class="patient-name-row">
                        <span class="patient-name">${escapeHtml(p.name)}</span>
                        <span class="tag ${p.status === 'new' ? 'tag-new' : ''}">${escapeHtml(p.therapyType)}</span>
                    </div>
                    <div class="patient-meta">${escapeHtml(p.id)} · ${p.age != null ? p.age + ' años' : ''} · ${p.nextAppointment ? formatAppointmentDate(p.nextAppointment) : 'Sin cita'}</div>
                </div>
                ${icon('chevRight', 15)}
            </button>
        `).join('');
    }

    async _renderAppointments() {
        const list = $('#dashAppointments');
        if (!list) return;
        try {
            const { data: appointments } = await appointmentService.getAll({ status: 'all' });
            const all = (appointments || []).filter(a => a.status !== 'CANCELADA');
            const now = new Date();
            const upcoming = all.filter(a => new Date(a.appointmentDate) >= now);
            const display = upcoming.length > 0
                ? upcoming.slice(0, 5)
                : all.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate)).slice(0, 5);
            if (!display.length) {
                list.innerHTML = `<div class="empty-state">No hay citas programadas.</div>`;
                return;
            }
            list.innerHTML = display.map(a => `
                <button class="appt-row" data-appt-id="${a.id}">
                    <span class="appt-status-dot ${APPT_STATUS_COLORS[a.status] || 'amber'}"></span>
                    <span class="appt-info">
                        <span class="appt-time-name">${formatAppointmentDate(a.appointmentDate)}<span class="sep">·</span>${escapeHtml(a.patientName)}</span>
                        <span class="appt-type">${escapeHtml(a.title)}</span>
                    </span>
                    ${icon('chevRight', 16)}
                </button>
            `).join('');
        } catch {
            list.innerHTML = `<div class="empty-state">Error al cargar citas.</div>`;
        }
    }

    _renderEmotionChart() {
        const wrap = $('#dashEmotionChart');
        if (!wrap) return;
        const points = getEmotionalState().points;
        const w = Math.max(200, wrap.offsetWidth || 320);
        const h = 70, pad = 4;
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

    async _renderEvaluationsPanel() {
        const container = $('#dashEvalList');
        if (!container) return;
        const tab = this.panelEvaluationTab;
        const statusMap = { pending: 'PENDIENTE', inProgress: 'EN_PROGRESO', completed: 'COMPLETADA' };
        try {
            const { data: items } = await evaluationService.getAll({ status: statusMap[tab] || 'all' });
            $$('#dashEvalTabs .tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
            if (!items.length) {
                container.innerHTML = `<div class="empty-state">No hay evaluaciones en esta categoría.</div>`;
                return;
            }
            container.innerHTML = items.slice(0, 3).map(ev => `
                <div class="eval-row">
                    <div class="eval-icon">${icon('clipboard', 14)}</div>
                    <div class="eval-info">
                        <div class="eval-name">${ev.instrumentCode || ev.instrumentName}</div>
                        <div class="eval-meta">${ev.patientName} · ${new Date(ev.assessmentDate + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    ${tab !== 'completed' ? `<button class="btn-start" data-eval-start="${ev.id}">Comenzar</button>` : `<span class="status-pill completed">Lista</span>`}
                </div>
            `).join('');
        } catch (err) {
            console.error('Error panel evaluaciones:', err);
            container.innerHTML = `<div class="empty-state">Error al cargar evaluaciones.</div>`;
        }
    }

    async _renderTasksPanel() {
        const container = $('#dashTaskList');
        if (!container) return;
        const tab = this.panelTaskTab;
        try {
            const [allTasks, pending, inProgress, completed] = await Promise.all([
                tasksService.list(),
                tasksService.list({ status: 'PENDIENTE' }),
                tasksService.list({ status: 'EN_PROGRESO' }),
                tasksService.list({ status: 'COMPLETADA' }),
            ]);
            $('#dashTaskPendingCount').textContent = pending.length;
            $('#dashTaskInProgressCount').textContent = inProgress.length;
            $('#dashTaskCompletedCount').textContent = completed.length;
            $$('#dashTaskTabs .tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
            const items = { PENDIENTE: pending, EN_PROGRESO: inProgress, COMPLETADA: completed }[tab] || [];
            if (!items.length) {
                container.innerHTML = `<div class="empty-state">No hay tareas en esta categoría.</div>`;
                return;
            }
            const _dd = (ds) => ds ? new Date(ds + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short' }) : '—';
            container.innerHTML = items.slice(0, 3).map(t => {
                const stClass = t.status === 'COMPLETADA' ? 'completed' : t.status === 'EN_PROGRESO' ? 'in-progress' : t.status === 'VENCIDA' ? 'danger' : 'pending';
                return `
                <div class="eval-row">
                    <div class="eval-icon">${icon('checklist', 14)}</div>
                    <div class="eval-info">
                        <div class="eval-name">${escapeHtml(t.title)}</div>
                        <div class="eval-meta">${escapeHtml(t.patient || 'Sin paciente')} · Vence: ${_dd(t.dueDate)}</div>
                    </div>
                    <span class="status-pill ${stClass}">${t.progress}%</span>
                </div>`;
            }).join('');
        } catch (err) {
            console.error('Error panel tareas:', err);
            container.innerHTML = `<div class="empty-state">Error al cargar tareas.</div>`;
        }
    }

    async _renderNotesPanel() {
        const container = $('#dashNotesList');
        if (!container) return;
        try {
            const notes = await notesService.list({ limit: 3 });
            if (!notes.length) {
                container.innerHTML = `<div class="empty-state">No hay notas clínicas registradas.</div>`;
                return;
            }
            const _dd = (ds) => ds ? new Date(ds + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short' }) : '—';
            container.innerHTML = notes.map(n => {
                const riskColor = n.riskLevel === 'ALTO' || n.riskLevel === 'CRISIS' ? 'danger' : n.riskLevel === 'MODERADO' ? 'info' : '';
                return `
                <div class="eval-row">
                    <div class="eval-icon">${icon('notes', 14)}</div>
                    <div class="eval-info">
                        <div class="eval-name">${escapeHtml(n.patient || 'Sin paciente')} <span style="font-size:11px;color:var(--dash-text-tertiary);margin-left:4px;">${escapeHtml(n.sessionType)}</span></div>
                        <div class="eval-meta">${_dd(n.sessionDate)}${n.title ? ' · ' + escapeHtml(n.title) : ''}</div>
                    </div>
                    ${riskColor ? `<span class="status-pill ${riskColor}" style="font-size:10px;">${n.riskLevel}</span>` : ''}
                </div>`;
            }).join('');
        } catch (err) {
            console.error('Error panel notas:', err);
            container.innerHTML = `<div class="empty-state">Error al cargar notas.</div>`;
        }
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
                if (isOpen) {
                    const rect = userTrigger.getBoundingClientRect();
                    const dropdown = userMenu.querySelector('.dropdown');
                    if (dropdown) {
                        dropdown.style.top = (rect.bottom + 8) + 'px';
                    }
                }
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

        // Calendar — navigate to appointments page
        const calBtn = $('#dashCalendar');
        if (calBtn) {
            calBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.router?.navigate('/appointments');
            });
        }

        // Theme toggle — syncs with global ThemeManager
        const themeBtn = $('#dashSettings');
        if (themeBtn) {
            const appEl = document.getElementById('app');
            const currentTheme = window.app?.themeManager?.getTheme() || 'dark';
            if (currentTheme === 'light' && appEl) {
                appEl.classList.add('light-mode');
            }
            themeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!appEl) return;
                const next = window.app?.themeManager?.toggle() || (appEl.classList.contains('light-mode') ? 'dark' : 'light');
                if (next === 'light') {
                    appEl.classList.add('light-mode');
                } else {
                    appEl.classList.remove('light-mode');
                }
                this._showToast(next === 'light' ? 'Modo claro activado.' : 'Modo oscuro activado.');
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
            patientList.addEventListener('click', async (e) => {
                const row = e.target.closest('[data-patient-id]');
                if (!row) return;
                const { data: patient } = await patientService.getById(row.dataset.patientId);
                if (patient) this._openModal('patientDetail', patient);
            });
        }

        // Appointment rows
        const apptList = $('#dashAppointments');
        if (apptList) {
            apptList.addEventListener('click', async (e) => {
                const row = e.target.closest('[data-appt-id]');
                if (!row) return;
                const { data: appt } = await appointmentService.getById(row.dataset.apptId);
                if (appt) this._openModal('appointmentDetail', appt);
            });
        }

        // Eval tabs
        const evalTabs = $('#dashEvalTabs');
        if (evalTabs) {
            evalTabs.addEventListener('click', async (e) => {
                const btn = e.target.closest('.tab-btn');
                if (!btn) return;
                this.panelEvaluationTab = btn.dataset.tab;
                await this._renderEvaluationsPanel();
            });
        }

        // Task tabs
        const taskTabs = $('#dashTaskTabs');
        if (taskTabs) {
            taskTabs.addEventListener('click', async (e) => {
                const btn = e.target.closest('.tab-btn');
                if (!btn) return;
                this.panelTaskTab = btn.dataset.tab;
                await this._renderTasksPanel();
            });
        }

        // Eval start buttons
        const evalList = $('#dashEvalList');
        if (evalList) {
            evalList.addEventListener('click', async (e) => {
                const btn = e.target.closest('[data-eval-start]');
                if (!btn) return;
                const id = btn.dataset.evalStart;
                try {
                    await evaluationService.update(id, { status: 'EN_PROGRESO', startedAt: new Date().toISOString() });
                    this._showToast('Evaluación iniciada');
                    await this._renderEvaluationsPanel();
                } catch { this._showToast('Error al iniciar evaluación'); }
            });
        }

        // Global delegation on document.body — survives innerHTML replacements
        document.body.addEventListener('click', async (e) => {
            // Task action buttons [data-task-action] inside dashModalBody
            const actionBtn = e.target.closest('#dashModalBody [data-task-action]');
            if (actionBtn) {
                e.stopPropagation();
                const act = actionBtn.dataset.taskAction;
                const id = actionBtn.dataset.taskId;
                actionBtn.disabled = true;
                try {
                    if (act === 'start')        await tasksService.start(id);
                    else if (act === 'complete') await tasksService.complete(id);
                    else if (act === 'cancel')   await tasksService.cancel(id);
                    else if (act === 'delete')   await tasksService.delete(id);
                    this._closeModal();
                    this._showToast('Tarea actualizada');
                    await this._renderTasksPanel();
                } catch (err) {
                    this._showToast('Error: ' + (err.message || 'No se pudo actualizar'));
                    actionBtn.disabled = false;
                }
                return;
            }
            // Task row click inside dashModalBody → open detail
            const taskRow = e.target.closest('#dashModalBody [data-task-id]');
            if (taskRow && !e.target.closest('[data-task-action]')) {
                const taskId = taskRow.dataset.taskId;
                try {
                    const task = await tasksService.getById(taskId);
                    if (task) this._showTaskDetail(task);
                } catch { this._showToast('Error al cargar tarea'); }
                return;
            }

            // Note row click inside dashModalBody → open detail
            const noteRow = e.target.closest('#dashModalBody [data-note-id]');
            if (noteRow) {
                const noteId = noteRow.dataset.noteId;
                // Check if it's a delete action button
                const deleteBtn = e.target.closest('[data-note-action="delete"]');
                if (deleteBtn) {
                    e.stopPropagation();
                    if (!confirm('¿Eliminar esta nota clínica permanentemente?')) return;
                    try {
                        await notesService.delete(noteId);
                        this._closeModal();
                        this._showToast('Nota eliminada.');
                        await this._renderNotesPanel();
                    } catch (err) { this._showToast('Error al eliminar: ' + (err.message || '')); }
                    return;
                }
                try {
                    const note = await notesService.getById(noteId);
                    if (note) this._showNoteDetail(note);
                } catch { this._showToast('Error al cargar nota'); }
                return;
            }

            // Modal triggers (data-modal) and Navigate triggers (data-navigate)
            const trigger = e.target.closest('[data-modal]');
            if (trigger) {
                this._openModal(trigger.dataset.modal);
                return;
            }
            const navTrigger = e.target.closest('[data-navigate]');
            if (navTrigger) {
                window.router?.navigate(navTrigger.dataset.navigate);
                return;
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
        const modalSubtitle = type === 'patientForm' && payload?.patient
            ? (payload.isEdit ? `Editar: ${payload.patient.name}` : 'Nuevo paciente')
            : subtitle;
        const wide = ['core', 'patients', 'appointments', 'evaluations', 'reports', 'tasks'].includes(type);

        box.className = 'modal-box' + (wide ? ' modal-wide' : '');

        const hasLoading = ['evaluations', 'patients', 'appointments', 'newEvaluation', 'tasks', 'notes', 'reports', 'messages'].includes(type);

        if (hasLoading) {
            const loadText = modalSubtitle || 'Cargando información';
            box.innerHTML = `
                <div class="modal-header">
                    <div class="modal-title-group">
                        <h2 class="modal-title">${title}</h2>
                        <p class="modal-subtitle">${loadText}...</p>
                    </div>
                    <button class="modal-close" id="dashModalClose" aria-label="Cerrar">${icon('close', 15)}</button>
                </div>
                <div class="modal-body" id="dashModalBody">
                    ${this._modalSpinnerHTML(loadText)}
                </div>
            `;
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            $('#dashModalClose')?.addEventListener('click', () => this._closeModal());
            setTimeout(() => $('#dashModalClose')?.focus(), 50);

            setTimeout(() => {
                this._renderModalBody(type, payload);
                const subtitleEl = box.querySelector('.modal-subtitle');
                if (subtitleEl) subtitleEl.textContent = modalSubtitle || '';
            }, 600);
        } else {
            box.innerHTML = `
                <div class="modal-header">
                    <div class="modal-title-group">
                        <h2 class="modal-title">${title}</h2>
                        ${modalSubtitle ? `<p class="modal-subtitle">${modalSubtitle}</p>` : ''}
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
    }

    _closeModal() {
        const overlay = $('#dashModalOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        this.currentModal = null;
    }

    async _renderModalBody(type, payload) {
        const body = $('#dashModalBody');
        if (!body) return;

        switch (type) {
            case 'core': body.innerHTML = this._coreModalHTML(); break;
            case 'patients': body.innerHTML = this._patientsModalHTML(); await this._renderModalPatientList(); break;
            case 'appointments': body.innerHTML = await this._appointmentsModalHTML(); break;
            case 'evaluations': body.innerHTML = await this._evaluationsModalHTML(); await this._renderModalEvalList(); break;
            case 'tasks': body.innerHTML = await this._tasksModalHTML(); await this._renderModalTaskList(); break;
            case 'notes': body.innerHTML = await this._notesModalHTML(); await this._renderModalNotesList(); break;
            case 'reports': await this._reportsModalHTML(); this._renderReportsChart(); break;
            case 'messages': body.innerHTML = this._messagesModalHTML(); break;
            case 'patientDetail': body.innerHTML = this._patientDetailHTML(payload); break;
            case 'appointmentDetail': body.innerHTML = await this._appointmentDetailHTML(payload); break;
            case 'newAppointment': body.innerHTML = await this._newAppointmentFormHTML(); break;
            case 'newEvaluation': body.innerHTML = await this._newEvaluationFormHTML(); break;
            case 'newNote': body.innerHTML = await this._newNoteFormHTML(); break;
            case 'newTask': body.innerHTML = await this._newTaskFormHTML(); break;
            case 'patientForm': body.innerHTML = this._patientFormHTML(payload || {}); break;
            default: body.innerHTML = '<div class="empty-state">Módulo en construcción.</div>';
        }

        this._bindModalBodyEvents(type, payload);
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
                <button class="btn btn-primary" id="dashBtnNewPatient">${icon('plus', 14)} Nuevo paciente</button>
            </div>
            <div class="dash-patient-stats" id="dashModalPatientStats"></div>
            <div class="data-rows" id="dashModalPatientList"></div>
            <button class="card-footer-link" id="dashViewAllPatients">Ver todos los pacientes</button>
        `;
    }

    async _renderModalPatientList(filter = '') {
        const el = $('#dashModalPatientList');
        const statsEl = $('#dashModalPatientStats');
        if (!el) return;

        const { data: patients } = await patientService.getAll({ search: filter || undefined });
        const { data: stats } = await patientService.getStats();

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="dash-modal-stats-row">
                    <span class="dash-modal-stat"><strong>${stats.total}</strong> total</span>
                    <span class="dash-modal-stat"><strong>${stats.active}</strong> activos</span>
                    <span class="dash-modal-stat"><strong>${stats.new || 0}</strong> nuevos</span>
                    <span class="dash-modal-stat"><strong>${stats.upcomingAppointments}</strong> citas</span>
                </div>
            `;
        }

        if (!patients.length) {
            el.innerHTML = `<div class="empty-state">${filter ? 'No se encontraron pacientes.' : 'No hay pacientes registrados.'}</div>`;
            return;
        }
        el.innerHTML = patients.map(p => `
            <div class="data-row" data-patient-id="${p.id}">
                <div class="patient-avatar">${getInitials(p.name)}</div>
                <div class="data-main">
                    <div class="data-title">${escapeHtml(p.name)} <span class="tag" style="margin-left:6px;">${escapeHtml(p.therapyType)}</span></div>
                    <div class="data-sub">${escapeHtml(p.id)} · ${p.age != null ? p.age + ' años' : ''}</div>
                    <div class="data-sub2">${p.nextAppointment ? 'Próxima cita: ' + formatAppointmentDate(p.nextAppointment) : 'Sin cita programada'}</div>
                </div>
                <div class="action-row" style="margin-top:0;">
                    <button class="btn" data-view-patient="${p.id}">Ver</button>
                    <button class="btn" data-edit-patient="${p.id}">Editar</button>
                    <button class="btn btn-danger" data-delete-patient="${p.id}" style="color:var(--dash-pink);">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    async _appointmentsModalHTML() {
        const { data: appointments } = await appointmentService.getAll({ status: 'all' });
        const upcoming = (appointments || [])
            .filter(a => a.status !== 'CANCELADA')
            .slice(0, 10);
        return `
            <div class="action-row" style="justify-content:space-between; align-items:center;">
                <span class="data-sub" style="font-size:12.5px;">${formatDate(new Date())}</span>
                <button class="btn btn-primary" id="dashBtnNewAppointment">${icon('plus', 14)} Nueva cita</button>
            </div>
            <div class="data-rows">${upcoming.length ? upcoming.map(a => `
                <div class="data-row" data-appt-id="${a.id}" style="cursor:pointer;">
                    <div class="patient-avatar">${getInitials(a.patientName)}</div>
                    <div class="data-main">
                        <div class="data-title">${escapeHtml(a.title)}</div>
                        <div class="data-sub">${escapeHtml(a.patientName)} · ${formatAppointmentDate(a.appointmentDate)}</div>
                        <div class="data-sub2">${escapeHtml(a.type)}</div>
                    </div>
                    <span class="status-pill ${APPT_STATUS_COLORS[a.status] || 'pending'}">${APPT_STATUS_LABELS[a.status] || a.status}</span>
                </div>
            `).join('') : '<div class="empty-state">No hay citas programadas.</div>'}</div>
        `;
    }

    async _evaluationsModalHTML() {
        const tab = this.activeEvaluationTab;
        let counts = { pending: 0, inProgress: 0, completed: 0 };
        try {
            const [pending, inProgress, completed] = await Promise.all([
                evaluationService.getAll({ status: 'PENDIENTE' }),
                evaluationService.getAll({ status: 'EN_PROGRESO' }),
                evaluationService.getAll({ status: 'COMPLETADA' })
            ]);
            counts = { pending: pending.data.length, inProgress: inProgress.data.length, completed: completed.data.length };
        } catch { /* use zeros */ }
        return `
            <div class="action-row" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="dashBtnNewEval">${icon('plus', 14)} Nueva evaluación</button>
            </div>
            <div class="tabs">
                <button class="tab-btn ${tab === 'pending' ? 'active' : ''}" data-modal-tab="pending">Pendientes <span class="tab-count">${counts.pending}</span></button>
                <button class="tab-btn ${tab === 'inProgress' ? 'active' : ''}" data-modal-tab="inProgress">En progreso <span class="tab-count">${counts.inProgress}</span></button>
                <button class="tab-btn ${tab === 'completed' ? 'active' : ''}" data-modal-tab="completed">Completadas <span class="tab-count">${counts.completed}</span></button>
            </div>
            <div class="data-rows" id="dashModalEvalList"></div>
        `;
    }

    async _renderModalEvalList() {
        const el = $('#dashModalEvalList');
        if (!el) return;
        const statusMap = { pending: 'PENDIENTE', inProgress: 'EN_PROGRESO', completed: 'COMPLETADA' };
        try {
            const { data: items } = await evaluationService.getAll({ status: statusMap[this.activeEvaluationTab] || 'all' });
            if (!items.length) { el.innerHTML = `<div class="empty-state">No hay evaluaciones en esta categoría.</div>`; return; }
            el.innerHTML = items.map(ev => `
                <div class="data-row">
                    <div class="eval-icon">${icon('clipboard', 14)}</div>
                    <div class="data-main">
                        <div class="data-title">${ev.instrumentCode || ev.instrumentName}</div>
                        <div class="data-sub">${ev.patientName} · Asignada: ${new Date(ev.assessmentDate + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    ${this.activeEvaluationTab !== 'completed' ? `<button class="btn-start" data-eval-start="${ev.id}">Comenzar</button>` : `<span class="status-pill completed">Completada</span>`}
                </div>
            `).join('');
        } catch {
            el.innerHTML = `<div class="empty-state">Error al cargar evaluaciones.</div>`;
        }
    }

    async _tasksModalHTML() {
        const tab = this.activeTaskTab || 'PENDIENTE';
        let counts = { pending: 0, inProgress: 0, completed: 0 };
        try {
            const [pending, inProgress, completed] = await Promise.all([
                tasksService.list({ status: 'PENDIENTE' }),
                tasksService.list({ status: 'EN_PROGRESO' }),
                tasksService.list({ status: 'COMPLETADA' })
            ]);
            counts = { pending: pending.length, inProgress: inProgress.length, completed: completed.length };
        } catch { /* use zeros */ }
        return `
            <div class="action-row" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="dashBtnNewTask">${icon('plus', 14)} Nueva tarea</button>
            </div>
            <div class="tabs">
                <button class="tab-btn ${tab === 'PENDIENTE' ? 'active' : ''}" data-modal-tab="PENDIENTE">Pendientes <span class="tab-count">${counts.pending}</span></button>
                <button class="tab-btn ${tab === 'EN_PROGRESO' ? 'active' : ''}" data-modal-tab="EN_PROGRESO">En progreso <span class="tab-count">${counts.inProgress}</span></button>
                <button class="tab-btn ${tab === 'COMPLETADA' ? 'active' : ''}" data-modal-tab="COMPLETADA">Completadas <span class="tab-count">${counts.completed}</span></button>
            </div>
            <div class="data-rows" id="dashModalTaskList"></div>
        `;
    }

    async _renderModalTaskList() {
        const el = $('#dashModalTaskList');
        if (!el) return;
        const tab = this.activeTaskTab || 'PENDIENTE';
        const _dateDisp = (ds) => ds ? new Date(ds + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short' }) : '—';
        try {
            const items = await tasksService.list({ status: tab });
            if (!items.length) { el.innerHTML = `<div class="empty-state">No hay tareas en esta categoría.</div>`; return; }
            el.innerHTML = items.map(t => {
                const stClass = t.status === 'COMPLETADA' ? 'completed' : t.status === 'EN_PROGRESO' ? 'in-progress' : t.status === 'VENCIDA' ? 'danger' : 'pending';
                return `
                <div class="data-row" data-task-id="${t.id}" style="cursor:pointer;">
                    <div class="patient-avatar">${(t.patient || '?')[0]?.toUpperCase() || '?'}</div>
                    <div class="data-main" style="min-width:0;">
                        <div class="data-title">${escapeHtml(t.title)}</div>
                        <div class="data-sub">${escapeHtml(t.patient || 'Sin paciente')} · Vence: ${_dateDisp(t.dueDate)} · ${t.priority}</div>
                    </div>
                    <span class="status-pill ${stClass}">${t.progress}%</span>
                </div>
                <div class="progress-track"><div class="progress-fill" style="width:${t.progress}%;"></div></div>`;
            }).join('');
        } catch {
            el.innerHTML = `<div class="empty-state">Error al cargar tareas.</div>`;
        }
    }

    async _openTaskDetailModal(task) {
        this._showTaskDetail(task);
    }

    _showTaskDetail(task) {
        this.currentModal = 'taskDetail';
        const STATUS_MAP = {
            PENDIENTE:   { label: 'Pendiente',   color: 'pending' },
            EN_PROGRESO: { label: 'En progreso', color: 'in-progress' },
            COMPLETADA:  { label: 'Completada',  color: 'completed' },
            VENCIDA:     { label: 'Vencida',     color: 'danger' },
            CANCELADA:   { label: 'Cancelada',   color: 'cancelled' },
        };
        const PRIORITY_MAP = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta', URGENTE: 'Urgente' };
        const st = STATUS_MAP[task.status] || STATUS_MAP.PENDIENTE;
        const _dd = (ds) => ds ? new Date(ds + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' }) : '—';
        const isActive = task.status !== 'COMPLETADA' && task.status !== 'CANCELADA';
        let actions = '';
        if (isActive) {
            if (task.status === 'PENDIENTE') actions += `<button class="btn btn-primary" data-task-action="start" data-task-id="${task.id}">Iniciar</button>`;
            if (task.status === 'EN_PROGRESO') actions += `<button class="btn btn-primary" data-task-action="complete" data-task-id="${task.id}">Completar</button>`;
            actions += `<button class="btn btn-danger" data-task-action="cancel" data-task-id="${task.id}">Cancelar</button>`;
        }
        actions += `<button class="btn btn-danger" data-task-action="delete" data-task-id="${task.id}" style="margin-left:auto;">Eliminar</button>`;

        const box = $('#dashModalBox');
        if (!box) return;
        const titleEl = box.querySelector('.modal-title');
        if (titleEl) titleEl.textContent = task.title;
        const subtitleEl = box.querySelector('.modal-subtitle');
        if (subtitleEl) subtitleEl.textContent = task.patient || '';

        const body = $('#dashModalBody');
        if (!body) return;
        body.innerHTML = `
            <div class="data-row" style="background:transparent;">
                <div class="patient-avatar">${(task.patient || '?')[0]?.toUpperCase() || '?'}</div>
                <div class="data-main">
                    <div class="data-title" style="font-size:15px;">${escapeHtml(task.title)}</div>
                    <div class="data-sub">${escapeHtml(task.patient || 'Sin paciente')} · ${task.category}</div>
                </div>
                <span class="status-pill ${st.color}">${st.label}</span>
            </div>
            <div class="detail-section-title">Detalle</div>
            <div class="patient-detail-grid">
                <div class="detail-field"><span class="detail-label">Prioridad</span><span class="detail-value">${PRIORITY_MAP[task.priority] || task.priority}</span></div>
                <div class="detail-field"><span class="detail-label">Categoría</span><span class="detail-value">${task.category}</span></div>
                <div class="detail-field"><span class="detail-label">Asignada</span><span class="detail-value">${_dd(task.assignedDate)}</span></div>
                <div class="detail-field"><span class="detail-label">Vence</span><span class="detail-value">${task.dueDate ? _dd(task.dueDate) : 'Sin fecha límite'}</span></div>
            </div>
            <div class="detail-section-title">Progreso</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <div class="progress-track" style="flex:1;"><div class="progress-fill" style="width:${task.progress}%;"></div></div>
                <span style="font-size:13px;font-weight:600;color:var(--dash-text-primary);min-width:36px;">${task.progress}%</span>
            </div>
            ${task.description ? `<div class="detail-section-title">Descripción</div><p style="font-size:13px;color:var(--dash-text-secondary);margin:0 0 8px;">${escapeHtml(task.description)}</p>` : ''}
            ${task.notes ? `<div class="detail-section-title">Notas</div><p style="font-size:12px;color:var(--dash-text-tertiary);margin:0 0 8px;">${escapeHtml(task.notes)}</p>` : ''}
            <div class="action-row">${actions}</div>`;
    }

    _showNoteDetail(note) {
        const RISK_MAP = { BAJO: 'Bajo', MODERADO: 'Moderado', ALTO: 'Alto', CRISIS: 'Crisis' };
        const riskColor = note.riskLevel === 'ALTO' || note.riskLevel === 'CRISIS' ? 'danger' : note.riskLevel === 'MODERADO' ? 'info' : 'completed';
        const _dd = (ds) => ds ? new Date(ds + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' }) : '—';

        const box = $('#dashModalBox');
        if (!box) return;
        const titleEl = box.querySelector('.modal-title');
        if (titleEl) titleEl.textContent = note.title || 'Nota clínica';
        const subtitleEl = box.querySelector('.modal-subtitle');
        if (subtitleEl) subtitleEl.textContent = note.patient || '';

        const body = $('#dashModalBody');
        if (!body) return;
        body.innerHTML = `
            <div class="data-row" style="background:transparent;">
                <div class="patient-avatar">${(note.patient || '?')[0]?.toUpperCase() || '?'}</div>
                <div class="data-main">
                    <div class="data-title" style="font-size:15px;">${escapeHtml(note.title || note.patient || 'Nota clínica')}</div>
                    <div class="data-sub">${escapeHtml(note.patient || 'Sin paciente')} · ${escapeHtml(note.sessionType)}</div>
                </div>
                <span class="status-pill ${riskColor}">${RISK_MAP[note.riskLevel] || note.riskLevel}</span>
            </div>
            <div class="detail-section-title">Detalles</div>
            <div class="patient-detail-grid">
                <div class="detail-field"><span class="detail-label">Tipo de sesión</span><span class="detail-value">${escapeHtml(note.sessionType)}</span></div>
                <div class="detail-field"><span class="detail-label">Fecha</span><span class="detail-value">${_dd(note.sessionDate)}</span></div>
                <div class="detail-field"><span class="detail-label">Riesgo</span><span class="detail-value"><span class="status-pill ${riskColor}">${RISK_MAP[note.riskLevel] || note.riskLevel}</span></span></div>
            </div>
            <div class="detail-section-title">Resumen</div>
            <p style="font-size:13px;color:var(--dash-text-primary);margin:0 0 8px;white-space:pre-wrap;">${escapeHtml(note.summary)}</p>
            ${note.interventions ? `<div class="detail-section-title">Intervenciones</div><p style="font-size:13px;color:var(--dash-text-secondary);margin:0 0 8px;white-space:pre-wrap;">${escapeHtml(note.interventions)}</p>` : ''}
            ${note.observations ? `<div class="detail-section-title">Observaciones</div><p style="font-size:13px;color:var(--dash-text-secondary);margin:0 0 8px;white-space:pre-wrap;">${escapeHtml(note.observations)}</p>` : ''}
            ${note.nextSteps ? `<div class="detail-section-title">Próximos pasos</div><p style="font-size:13px;color:var(--dash-text-secondary);margin:0 0 8px;white-space:pre-wrap;">${escapeHtml(note.nextSteps)}</p>` : ''}
            <div class="action-row">
                <button class="btn btn-danger" data-note-action="delete" data-note-id="${note.id}" style="margin-left:auto;">Eliminar</button>
            </div>`;
    }

    async _notesModalHTML() {
        return `
            <div class="action-row" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="dashBtnNewNote">${icon('plus', 14)} Nueva nota clínica</button>
            </div>
            <div id="dashModalNotesList" class="data-rows">
                <div class="patients-empty"><p>Cargando notas…</p></div>
            </div>`;
    }

    async _renderModalNotesList() {
        const el = $('#dashModalNotesList');
        if (!el) return;
        try {
            const notes = await notesService.list({ limit: 20 });
            if (!notes.length) { el.innerHTML = '<div class="empty-state">No hay notas clínicas registradas.</div>'; return; }
            const _dd = (ds) => ds ? new Date(ds + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short' }) : '—';
            el.innerHTML = notes.map(n => {
                const riskColor = n.riskLevel === 'ALTO' || n.riskLevel === 'CRISIS' ? 'danger' : n.riskLevel === 'MODERADO' ? 'info' : 'completed';
                return `
                <div class="data-row" data-note-id="${n.id}" style="cursor:pointer;">
                    <div class="eval-icon">${icon('notes', 14)}</div>
                    <div class="data-main">
                        <div class="data-title">${escapeHtml(n.patient || 'Sin paciente')} <span class="tag" style="margin-left:6px;">${escapeHtml(n.sessionType)}</span></div>
                        <div class="data-sub">${_dd(n.sessionDate)}${n.title ? ' · ' + escapeHtml(n.title) : ''}</div>
                        <div class="data-sub2">${escapeHtml((n.summary || '').slice(0, 100))}${(n.summary || '').length > 100 ? '…' : ''}</div>
                    </div>
                    <span class="status-pill ${riskColor}">${(n.riskLevel || 'BAJO')}</span>
                </div>`;
            }).join('');
        } catch {
            el.innerHTML = '<div class="empty-state">Error al cargar notas.</div>';
        }
    }

    async _reportsModalHTML() {
        const body = $('#dashModalBody');
        if (!body) return;
        body.innerHTML = '<div style="text-align:center;padding:24px;"><span class="spinner spinner--sm"></span></div>';
        try {
            const { indicators } = await reportsService.getSummary();
            body.innerHTML = `
                <div class="indicator-grid">${indicators.map(i => `
                    <div class="indicator-box">
                        <div class="indicator-value">${i.value}</div>
                        <div class="indicator-label">${i.label}</div>
                        <div class="indicator-delta">${i.delta} vs. mes anterior</div>
                    </div>
                `).join('')}</div>
                <div class="data-title" style="margin-top:6px; font-size:12px; color:var(--dash-text-secondary); text-transform:uppercase; letter-spacing:.04em;">Sesiones por mes</div>
                <div class="mini-chart" id="dashReportsChart"></div>
            `;
        } catch (e) {
            body.innerHTML = '<div class="data-rows" style="text-align:center;padding:24px;">Error al cargar reportes.</div>';
        }
    }

    async _renderReportsChart() {
        const el = $('#dashReportsChart');
        if (!el) return;
        try {
            const monthly = await reportsService.getMonthlySessions();
            const values = monthly.map(m => m.value);
            const labels = monthly.map(m => m.month);
            const w = Math.max(200, el.offsetWidth || 680);
            const h = 90, gap = 6;
            const barW = (w - gap * (values.length - 1)) / values.length;
            const max = Math.max(...values, 1);
            const bars = values.map((v, i) => {
                const bh = (v / max) * (h - 10);
                const x = i * (barW + gap);
                const y = h - bh;
                return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="url(#barGrad)" />
                        <text x="${(x + barW / 2).toFixed(1)}" y="${(h - 2).toFixed(1)}" text-anchor="middle" fill="var(--dash-text-tertiary)" font-size="7">${labels[i]}</text>`;
            }).join('');
            el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%; height:100%;">
                <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#38bdf8"/></linearGradient></defs>
                ${bars}
            </svg>`;
        } catch (e) {
            el.innerHTML = '<div style="text-align:center;padding:12px;color:var(--dash-text-tertiary);font-size:12px;">Error al cargar gráfico.</div>';
        }
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
        const statusLabel = STATUS_LABELS[patient.status] || patient.status;
        return `
            <div class="data-row">
                <div class="patient-avatar" style="width:52px;height:52px;font-size:15px;">${getInitials(patient.name)}</div>
                <div class="data-main">
                    <div class="data-title" style="font-size:16px;">${escapeHtml(patient.name)}</div>
                    <div class="data-sub">${escapeHtml(patient.email || '')} · ${escapeHtml(patient.phone || '')}</div>
                    <div class="data-sub2">${patient.age != null ? patient.age + ' años' : ''}</div>
                </div>
                <span class="status-pill ${patient.status === 'active' ? 'confirmed' : patient.status === 'new' ? 'in-progress' : 'pending'}">${statusLabel}</span>
            </div>
            <div class="data-title" style="font-size:12px; color:var(--dash-text-secondary); text-transform:uppercase; letter-spacing:.04em; margin-top:4px;">Información terapéutica</div>
            <div class="data-row" style="background:rgba(255,255,255,0.02);">
                <div class="data-main">
                    <div class="data-sub">Tipo: <span class="tag">${escapeHtml(patient.therapyType)}</span></div>
                    <div class="data-sub2" style="margin-top:4px;">${patient.nextAppointment ? 'Próxima cita: ' + formatAppointmentDate(patient.nextAppointment) : 'Sin cita programada'}</div>
                </div>
            </div>
            ${patient.notes ? `<div class="data-title" style="font-size:12px; color:var(--dash-text-secondary); text-transform:uppercase; letter-spacing:.04em; margin-top:4px;">Notas</div>
            <div class="data-row" style="background:rgba(255,255,255,0.02);">
                <div class="data-main"><div class="data-sub2">${escapeHtml(patient.notes)}</div></div>
            </div>` : ''}
            <div class="action-row">
                <button class="btn btn-primary" data-edit-patient="${patient.id}">Editar</button>
                <button class="btn" data-history-patient="${patient.id}">Ver historial completo</button>
            </div>
        `;
    }

    async _appointmentDetailHTML(appointment) {
        if (!appointment) return `<div class="empty-state">Cita no encontrada.</div>`;
        const a = appointment.id ? appointment : (await appointmentService.getById(appointment.id)).data || appointment;
        const statusColor = APPT_STATUS_COLORS[a.status] || 'amber';
        const transitions = appointmentService.getValidTransitions(a.status);
        let actionsHTML = `<button class="btn" data-close-modal>Cerrar</button>`;
        if (transitions.length > 0) {
            const transitionBtns = transitions.map(t => {
                const label = APPT_STATUS_LABELS[t] || t;
                const cls = t === 'CANCELADA' ? 'btn btn-danger' : 'btn btn-primary';
                return `<button class="${cls}" data-transition="${t}" data-appt-id="${a.id}">${label}</button>`;
            }).join('');
            actionsHTML = `<div class="action-row" style="gap:8px; flex-wrap:wrap;">${transitionBtns}</div>` + actionsHTML;
        }
        actionsHTML += `<button class="btn" data-edit-appt="${a.id}">${icon('pencil', 13)} Editar</button>`;
        return `
            <div class="data-row">
                <div class="patient-avatar">${getInitials(a.patientName)}</div>
                <div class="data-main">
                    <div class="data-title">${escapeHtml(a.title)}</div>
                    <div class="data-sub">${escapeHtml(a.patientName)}</div>
                    <div class="data-sub2">${escapeHtml(a.type)}</div>
                </div>
                <span class="status-pill ${statusColor}">${APPT_STATUS_LABELS[a.status] || a.status}</span>
            </div>
            <div class="data-title" style="font-size:12px; color:var(--dash-text-secondary); text-transform:uppercase; letter-spacing:.04em; margin-top:4px;">Detalle</div>
            <div class="data-row" style="background:rgba(255,255,255,0.02);">
                <div class="data-main">
                    <div class="data-sub">Fecha: ${formatAppointmentDate(a.appointmentDate)}</div>
                    <div class="data-sub2" style="margin-top:4px;">Duración: ${a.durationMinutes} min · ${a.location ? 'Lugar: ' + escapeHtml(a.location) : ''}</div>
                    ${a.notes ? `<div class="data-sub2" style="margin-top:4px;">Notas: ${escapeHtml(a.notes)}</div>` : ''}
                </div>
            </div>
            <div class="action-row">${actionsHTML}</div>
        `;
    }

    async _newAppointmentFormHTML() {
        const { data: patients } = await patientService.getAll();
        const patientOptions = (patients || []).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
        return `
            <form class="form-grid" id="dashFormNewAppointment">
                <div class="form-field"><label for="fPatient">Paciente *</label><select id="fPatient" required>${patientOptions}</select></div>
                <div class="form-field"><label for="fTitle">Título *</label><input type="text" id="fTitle" placeholder="Ej: Sesión de seguimiento" required></div>
                <div class="form-field"><label for="fDate">Fecha *</label><input type="date" id="fDate" required></div>
                <div class="form-field"><label for="fTime">Hora *</label><input type="time" id="fTime" required></div>
                <div class="form-field"><label for="fType">Tipo de sesión</label>
                    <select id="fType"><option>Terapia Individual</option><option>Terapia de Pareja</option><option>Terapia Familiar</option><option>Evaluación</option><option>Otra</option></select>
                </div>
                <div class="form-field"><label for="fLocation">Ubicación</label><input type="text" id="fLocation" placeholder="Ej: Consultorio 1"></div>
                <div class="action-row"><button type="submit" class="btn btn-primary">Guardar cita</button><button type="button" class="btn" id="dashCancelNewAppointment">Cancelar</button></div>
            </form>
        `;
    }

    async _newEvaluationFormHTML() {
        const { data: patients } = await patientService.getAll();
        const patientOptions = (patients || []).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
        const instrumentOptions = INSTRUMENTS.map(i => `<option value="${i.name}" data-code="${i.code}" data-category="${i.category}">${i.code} — ${i.name}</option>`).join('');
        return `
            <form class="form-grid" id="dashFormNewEvaluation">
                <div class="form-field"><label for="efDashPatient">Paciente *</label><select id="efDashPatient" required><option value="">Seleccionar paciente…</option>${patientOptions}</select><span class="form-error" id="efDashPatientError"></span></div>
                <div class="form-field"><label for="efDashInstrument">Instrumento *</label><select id="efDashInstrument" required><option value="">Seleccionar instrumento…</option>${instrumentOptions}</select><span class="form-error" id="efDashInstrumentError"></span></div>
                <div class="form-field"><label for="efDashDate">Fecha *</label><input type="date" id="efDashDate" required></div>
                <div class="form-field"><label for="efDashStatus">Estado</label><select id="efDashStatus"><option value="PENDIENTE">Pendiente</option><option value="EN_PROGRESO">En progreso</option><option value="COMPLETADA">Completada</option></select></div>
                <div class="form-field" style="grid-column:1/-1;"><label for="efDashNotes">Notas</label><textarea id="efDashNotes" placeholder="Observaciones sobre la evaluación…"></textarea></div>
                <div class="action-row" style="grid-column:1/-1;"><button type="submit" class="btn btn-primary">Crear evaluación</button><button type="button" class="btn" id="dashCancelNewEvaluation">Cancelar</button></div>
            </form>
        `;
    }

    _patientFormHTML(opts = {}) {
        const p = opts.patient || null;
        const isEdit = opts.isEdit || false;
        const therapyOptions = THERAPY_TYPES.map(t => `<option value="${t}" ${p && p.therapyType === t ? 'selected' : ''}>${t}</option>`).join('');
        const statusOptions = Object.entries(STATUS_LABELS).map(([val, label]) => `<option value="${val}" ${p && p.status === val ? 'selected' : ''}>${label}</option>`).join('');

        const formatLocalDate = (d) => {
            if (!d) return '';
            const date = new Date(d);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        };

        return `
            <form class="form-grid" id="dashPatientForm" novalidate>
                <div class="form-field"><label for="pfFirstName">Nombre *</label><input type="text" id="pfFirstName" value="${p ? escapeHtml(p.firstName) : ''}" placeholder="Nombre" required><span class="form-error" id="pfFirstNameError"></span></div>
                <div class="form-field"><label for="pfLastName">Apellido *</label><input type="text" id="pfLastName" value="${p ? escapeHtml(p.lastName) : ''}" placeholder="Apellido" required><span class="form-error" id="pfLastNameError"></span></div>
                <div class="form-field"><label for="pfAge">Edad</label><input type="number" id="pfAge" min="0" max="120" value="${p && p.age != null ? p.age : ''}" placeholder="Edad"><span class="form-error" id="pfAgeError"></span></div>
                <div class="form-field"><label for="pfEmail">Email</label><input type="email" id="pfEmail" value="${p ? escapeHtml(p.email) : ''}" placeholder="correo@ejemplo.com"><span class="form-error" id="pfEmailError"></span></div>
                <div class="form-field"><label for="pfPhone">Teléfono</label><input type="tel" id="pfPhone" value="${p ? escapeHtml(p.phone) : ''}" placeholder="+52 55 0000 0000"><span class="form-error" id="pfPhoneError"></span></div>
                <div class="form-field"><label for="pfGender">Género</label><select id="pfGender"><option value="">Seleccionar…</option><option value="Femenino" ${p && p.gender === 'Femenino' ? 'selected' : ''}>Femenino</option><option value="Masculino" ${p && p.gender === 'Masculino' ? 'selected' : ''}>Masculino</option><option value="Otro" ${p && p.gender === 'Otro' ? 'selected' : ''}>Otro</option></select></div>
                <div class="form-field"><label for="pfTherapy">Tipo de terapia *</label><select id="pfTherapy">${therapyOptions}</select><span class="form-error" id="pfTherapyError"></span></div>
                <div class="form-field"><label for="pfStatus">Estado *</label><select id="pfStatus">${statusOptions}</select><span class="form-error" id="pfStatusError"></span></div>
                <div class="form-field"><label for="pfNextAppointment">Próxima cita</label><input type="datetime-local" id="pfNextAppointment" value="${p && p.nextAppointment ? formatLocalDate(p.nextAppointment) + 'T' + (p.nextAppointment.split('T')[1] || '10:00') : ''}"></div>
                <div class="form-field" style="grid-column:1/-1;"><label for="pfNotes">Notas</label><textarea id="pfNotes" placeholder="Observaciones relevantes…">${p ? escapeHtml(p.notes) : ''}</textarea></div>
                <div class="action-row" style="grid-column:1/-1;">
                    <button type="button" class="btn" id="dashPatientFormCancel">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="dashPatientFormSave">${isEdit ? 'Guardar cambios' : 'Crear paciente'}</button>
                </div>
            </form>
        `;
    }

    async _handlePatientFormSave(opts = {}) {
        const { isEdit, id } = opts;
        const firstName = $('#dashPatientForm #pfFirstName')?.value.trim() || '';
        const lastName = $('#dashPatientForm #pfLastName')?.value.trim() || '';
        const ageRaw = $('#dashPatientForm #pfAge')?.value;
        const age = ageRaw !== '' && ageRaw != null ? Number(ageRaw) : null;
        const email = $('#dashPatientForm #pfEmail')?.value.trim() || '';
        const phone = $('#dashPatientForm #pfPhone')?.value.trim() || '';
        const gender = $('#dashPatientForm #pfGender')?.value || '';
        const therapyType = $('#dashPatientForm #pfTherapy')?.value || 'Terapia Individual';
        const status = $('#dashPatientForm #pfStatus')?.value || 'active';
        const nextAppointment = $('#dashPatientForm #pfNextAppointment')?.value || '';
        const notes = $('#dashPatientForm #pfNotes')?.value.trim() || '';

        ['pfFirstNameError', 'pfLastNameError', 'pfAgeError', 'pfEmailError', 'pfPhoneError', 'pfTherapyError', 'pfStatusError'].forEach(eid => {
            const el = document.getElementById(eid);
            if (el) el.textContent = '';
        });

        let valid = true;
        if (!firstName) { document.getElementById('pfFirstNameError').textContent = 'El nombre es obligatorio'; valid = false; }
        if (!lastName) { document.getElementById('pfLastNameError').textContent = 'El apellido es obligatorio'; valid = false; }
        if (age !== null && (isNaN(age) || age < 0 || age > 120)) { document.getElementById('pfAgeError').textContent = 'Edad no válida'; valid = false; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { document.getElementById('pfEmailError').textContent = 'Email no válido'; valid = false; }
        if (phone && phone.length < 7) { document.getElementById('pfPhoneError').textContent = 'Teléfono no válido'; valid = false; }
        if (!valid) return;

        const saveBtn = document.getElementById('dashPatientFormSave');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...'; }

        const data = {
            firstName, lastName, age,
            email: email || null, phone: phone || null,
            gender: gender || null,
            therapyType, status,
            nextAppointment: nextAppointment ? new Date(nextAppointment).toISOString() : null,
            notes: notes || null
        };

        try {
            const result = isEdit ? await patientService.update(id, data) : await patientService.create(data);
            if (result.error) throw result.error;
            this._closeModal();
            this._showToast(isEdit ? 'Paciente actualizado correctamente.' : 'Paciente creado correctamente.');
            this._renderPatients();
        } catch (err) {
            this._showToast('Error: ' + (err.message || 'No se pudo guardar'));
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = isEdit ? 'Guardar cambios' : 'Crear paciente'; }
        }
    }

    async _handleNewEvaluationFormSave() {
        const patientId = $('#efDashPatient')?.value || '';
        const instrumentName = $('#efDashInstrument')?.value || '';
        const instrumentOption = $('#efDashInstrument')?.selectedOptions[0];
        const instrumentCode = instrumentOption?.dataset?.code || '';
        const instrumentCategory = instrumentOption?.dataset?.category || '';
        const assessmentDate = $('#efDashDate')?.value || '';
        const status = $('#efDashStatus')?.value || 'PENDIENTE';
        const notes = $('#efDashNotes')?.value.trim() || '';

        ['efDashPatientError', 'efDashInstrumentError'].forEach(eid => {
            const el = document.getElementById(eid);
            if (el) el.textContent = '';
        });

        let valid = true;
        if (!patientId) { document.getElementById('efDashPatientError').textContent = 'Selecciona un paciente'; valid = false; }
        if (!instrumentName) { document.getElementById('efDashInstrumentError').textContent = 'Selecciona un instrumento'; valid = false; }
        if (!assessmentDate) { this._showToast('La fecha es obligatoria'); valid = false; }
        if (!valid) return;

        const saveBtn = $('#dashFormNewEvaluation button[type="submit"]');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...'; }

        try {
            const { data, error } = await evaluationService.create({
                patientId, instrumentName, instrumentCode, instrumentCategory,
                assessmentDate, status, notes: notes || null
            });
            if (error) throw error;
            this._closeModal();
            this._showToast('Evaluación creada correctamente.');
            await this._renderEvaluationsPanel();
            if (this.currentModal === 'evaluations') await this._renderModalEvalList();
        } catch (err) {
            this._showToast('Error: ' + (err.message || 'No se pudo guardar'));
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Crear evaluación'; }
        }
    }

    async _newNoteFormHTML() {
        const patients = await notesService.getPatients();
        const patientOptions = patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
        return `
            <form class="form-grid" id="dashFormNewNote">
                <div class="form-field"><label for="nPatient">Paciente *</label><select id="nPatient" required><option value="">Seleccionar…</option>${patientOptions}</select><span class="form-error" id="nPatientError"></span></div>
                <div class="form-field"><label for="nType">Tipo de sesión</label>
                    <select id="nType"><option>Terapia Individual</option><option>Terapia de Pareja</option><option>Terapia Familiar</option><option>Evaluación Inicial</option><option>Seguimiento</option><option>Otra</option></select>
                </div>
                <div class="form-field"><label for="nDate">Fecha de sesión</label><input type="date" id="nDate" value="${new Date().toISOString().slice(0,10)}"></div>
                <div class="form-field"><label for="nRisk">Nivel de riesgo</label><select id="nRisk"><option value="BAJO">Bajo</option><option value="MODERADO">Moderado</option><option value="ALTO">Alto</option><option value="CRISIS">Crisis</option></select></div>
                <div class="form-field" style="grid-column:1/-1;"><label for="nSummary">Resumen de la sesión *</label><textarea id="nSummary" rows="4" placeholder="Describe el desarrollo de la sesión…" required></textarea><span class="form-error" id="nSummaryError"></span></div>
                <div class="form-field" style="grid-column:1/-1;"><label for="nObs">Observaciones</label><textarea id="nObs" rows="2" placeholder="Observaciones clínicas…"></textarea></div>
                <div class="action-row"><button type="submit" class="btn btn-primary">Guardar nota</button><button type="button" class="btn" id="dashCancelNewNote">Cancelar</button></div>
            </form>
        `;
    }

    async _newTaskFormHTML() {
        const patients = await tasksService.getPatients();
        const patientOptions = patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
        return `
            <form class="form-grid" id="dashFormNewTask">
                <div class="form-field"><label for="tPatient">Paciente *</label><select id="tPatient" required><option value="">Seleccionar…</option>${patientOptions}</select></div>
                <div class="form-field"><label for="tTitle">Título *</label><input type="text" id="tTitle" placeholder="Ej: Practicar respiración 4-7-8" required></div>
                <div class="form-field"><label for="tCategory">Categoría</label>
                    <select id="tCategory"><option>Seguimiento</option><option>Ejercicio</option><option>Diario</option><option>Cuestionario</option><option>Técnica</option><option>Lectura</option><option>Otra</option></select>
                </div>
                <div class="form-field"><label for="tPriority">Prioridad</label>
                    <select id="tPriority"><option value="BAJA">Baja</option><option value="MEDIA" selected>Media</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option></select>
                </div>
                <div class="form-field"><label for="tDue">Fecha límite</label><input type="date" id="tDue"></div>
                <div class="form-field" style="grid-column:1/-1;"><label for="tDesc">Descripción</label><textarea id="tDesc" placeholder="Describe la tarea, instrucciones específicas…"></textarea></div>
                <div class="action-row" style="grid-column:1/-1;"><button type="submit" class="btn btn-primary">Asignar tarea</button><button type="button" class="btn" id="dashCancelNewTask">Cancelar</button></div>
            </form>
        `;
    }

    // ========== MODAL EVENT BINDING ==========

    _bindModalBodyEvents(type, payload) {
        if (type === 'core') {
            $$('#dashModalBody [data-core-open]').forEach(btn => {
                btn.addEventListener('click', () => this._openModal(btn.dataset.coreOpen));
            });
        }

        if (type === 'patients') {
            const search = $('#dashModalPatientSearch');
            if (search) {
                let searchTimer;
                search.addEventListener('input', () => {
                    clearTimeout(searchTimer);
                    searchTimer = setTimeout(() => this._renderModalPatientList(search.value), 300);
                });
            }
            $('#dashBtnNewPatient')?.addEventListener('click', () => this._openModal('patientForm'));
            $('#dashViewAllPatients')?.addEventListener('click', () => {
                this._closeModal();
                window.router?.navigate('/patients');
            });
            this._bindPatientRowActions();
        }

        if (type === 'appointments') {
            $('#dashBtnNewAppointment')?.addEventListener('click', () => this._openModal('newAppointment'));
            $$('#dashModalBody [data-appt-id]').forEach(row => {
                row.addEventListener('click', async () => {
                    const apptId = row.dataset.apptId;
                    const { data: appt } = await appointmentService.getById(apptId);
                    if (appt) this._openModal('appointmentDetail', appt);
                });
            });
        }

        if (type === 'evaluations') {
            $$('#dashModalBody [data-modal-tab]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    this.activeEvaluationTab = btn.dataset.modalTab;
                    $$('#dashModalBody .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
                    await this._renderModalEvalList();
                });
            });
            $('#dashBtnNewEval')?.addEventListener('click', () => this._openModal('newEvaluation'));
            $$('[data-eval-start]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.evalStart;
                    try {
                        await evaluationService.update(id, { status: 'EN_PROGRESO', startedAt: new Date().toISOString() });
                        this._showToast('Evaluación iniciada');
                        await this._renderModalEvalList();
                    } catch { this._showToast('Error al iniciar evaluación'); }
                });
            });
        }

        if (type === 'tasks') {
            $$('#dashModalBody [data-modal-tab]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    this.activeTaskTab = btn.dataset.modalTab;
                    $$('#dashModalBody .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
                    await this._renderModalTaskList();
                });
            });
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
            $$('[data-close-modal]', $('#dashModalBody')).forEach(btn => {
                btn.addEventListener('click', () => this._closeModal());
            });
            $$('[data-transition]', $('#dashModalBody')).forEach(btn => {
                btn.addEventListener('click', async () => {
                    const newStatus = btn.dataset.transition;
                    const apptId = btn.dataset.apptId;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    const { error } = await appointmentService.update(apptId, { status: newStatus });
                    if (error) {
                        this._showToast('Error: ' + (error.message || 'No se pudo actualizar'));
                        btn.disabled = false;
                        btn.textContent = APPT_STATUS_LABELS[newStatus];
                    } else {
                        this._closeModal();
                        this._showToast(`Cita marcada como ${APPT_STATUS_LABELS[newStatus]}`);
                        await this._renderAppointments();
                    }
                });
            });
            $$('[data-edit-appt]', $('#dashModalBody')).forEach(btn => {
                btn.addEventListener('click', async () => {
                    this._closeModal();
                    const { data: appt } = await appointmentService.getById(btn.dataset.editAppt);
                    if (appt) {
                        this._showToast('Redirigiendo a la agenda de citas...');
                        window.router?.navigate('/appointments');
                    }
                });
            });
        }

        if (type === 'newAppointment') {
            $('#dashFormNewAppointment')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const patientId = $('#dashModalBody #fPatient')?.value;
                const title = $('#dashModalBody #fTitle')?.value.trim();
                const dateVal = $('#dashModalBody #fDate')?.value;
                const timeVal = $('#dashModalBody #fTime')?.value;
                const typeVal = $('#dashModalBody #fType')?.value;
                const location = $('#dashModalBody #fLocation')?.value.trim();
                if (!patientId || !title || !dateVal || !timeVal) {
                    this._showToast('Completa todos los campos obligatorios.');
                    return;
                }
                const appointmentDate = new Date(`${dateVal}T${timeVal}`).toISOString();
                const submitBtn = e.target.querySelector('[type="submit"]');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...'; }
                try {
                    const { error } = await appointmentService.create({
                        patientId, title, appointmentDate,
                        durationMinutes: 50, type: typeVal,
                        status: 'PENDIENTE', location: location || null
                    });
                    if (error) throw error;
                    this._closeModal();
                    this._showToast('Cita creada correctamente.');
                    await this._renderAppointments();
                } catch (err) {
                    this._showToast('Error: ' + (err.message || 'No se pudo crear la cita'));
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Guardar cita'; }
                }
            });
            $('#dashCancelNewAppointment')?.addEventListener('click', () => this._openModal('appointments'));
        }

        if (type === 'newEvaluation') {
            $('#dashFormNewEvaluation')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this._handleNewEvaluationFormSave();
            });
            $('#dashCancelNewEvaluation')?.addEventListener('click', () => this._openModal('evaluations'));
        }

        if (type === 'newNote') {
            $('#dashFormNewNote')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const patientId = $('#nPatient')?.value || '';
                const summary = $('#nSummary')?.value.trim() || '';
                if (!patientId || !summary) {
                    if (!patientId) { const el = document.getElementById('nPatientError'); if (el) el.textContent = 'Selecciona un paciente'; }
                    if (!summary) { const el = document.getElementById('nSummaryError'); if (el) el.textContent = 'El resumen es obligatorio'; }
                    return;
                }
                const submitBtn = e.target.querySelector('[type="submit"]');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...'; }
                try {
                    await notesService.create({
                        patientId,
                        sessionType: $('#nType')?.value || 'Terapia Individual',
                        sessionDate: $('#nDate')?.value || new Date().toISOString().slice(0,10),
                        summary,
                        observations: $('#nObs')?.value.trim() || null,
                        riskLevel: $('#nRisk')?.value || 'BAJO',
                    });
                    this._closeModal();
                    this._showToast('Nota clínica guardada correctamente.');
                    await this._renderNotesPanel();
                } catch (err) {
                    this._showToast('Error: ' + (err.message || 'No se pudo guardar'));
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Guardar nota'; }
                }
            });
            $('#dashCancelNewNote')?.addEventListener('click', () => this._openModal('notes'));
        }

        if (type === 'newTask') {
            $('#dashFormNewTask')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const patientId = $('#tPatient')?.value || '';
                const title = $('#tTitle')?.value.trim() || '';
                if (!patientId || !title) { this._showToast('Selecciona un paciente y escribe un título.'); return; }
                const submitBtn = e.target.querySelector('[type="submit"]');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...'; }
                try {
                    await tasksService.create({
                        patientId,
                        title,
                        category:    $('#tCategory')?.value || 'Seguimiento',
                        priority:    $('#tPriority')?.value || 'MEDIA',
                        dueDate:     $('#tDue')?.value || null,
                        description: $('#tDesc')?.value.trim() || '',
                    });
                    this._closeModal();
                    this._showToast('Tarea terapéutica creada correctamente.');
                    await this._renderTasksPanel();
                } catch (err) {
                    this._showToast('Error: ' + (err.message || 'No se pudo crear la tarea'));
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Asignar tarea'; }
                }
            });
            $('#dashCancelNewTask')?.addEventListener('click', () => this._openModal('tasks'));
        }

        if (type === 'patientForm') {
            const form = document.getElementById('dashPatientForm');
            const cancelBtn = document.getElementById('dashPatientFormCancel');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const urlHash = window.location.hash;
                    const isEdit = urlHash.includes('/edit') || (payload && payload.isEdit);
                    const id = payload && payload.patient ? payload.patient.id : null;
                    this._handlePatientFormSave({ isEdit, id });
                });
            }
            if (cancelBtn) cancelBtn.addEventListener('click', () => this._openModal('patients'));
        }
    }

    _bindPatientRowActions() {
        $$('#dashModalBody [data-view-patient]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { data: p } = await patientService.getById(btn.dataset.viewPatient);
                if (p) this._openModal('patientDetail', p);
            });
        });
        $$('#dashModalBody [data-edit-patient]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { data: p } = await patientService.getById(btn.dataset.editPatient);
                if (p) this._openModal('patientForm', { patient: p, isEdit: true });
            });
        });
        $$('#dashModalBody [data-delete-patient]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.deletePatient;
                const { data: p } = await patientService.getById(id);
                if (!p) return;
                const confirmed = await window.app?.confirm?.show({
                    title: '¿Eliminar paciente?',
                    message: `Se eliminará a ${p.name} del listado. Esta acción no se puede deshacer.`,
                    confirmLabel: 'Eliminar',
                    cancelLabel: 'Cancelar',
                    danger: true
                });
                if (!confirmed) return;
                const { error } = await patientService.delete(id);
                if (!error) {
                    window.app?.toast?.success('Eliminado', 'Paciente eliminado correctamente.');
                    this._renderModalPatientList();
                    this._renderPatients();
                }
            });
        });
        $$('#dashModalBody [data-history-patient]').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); this._showToast('Historial clínico (próximamente).'); });
        });
    }

    // ========== LOADING HELPERS ==========

    _modalSpinnerHTML(text = 'Cargando', name = '') {
        return `
            <div class="modal-loading">
                <div class="loading-orbit">
                    <div class="ring"></div>
                    <div class="ring ring-2"></div>
                    <div class="core"></div>
                </div>
                <div class="loading-text">${text}<span class="loading-dots"><span></span><span></span><span></span></span>${name ? `<br><strong>${name}</strong>` : ''}</div>
                <div class="loading-bar-track"><div class="loading-bar-fill"></div></div>
            </div>
        `;
    }

    _skeletonRows(count = 3, opts = {}) {
        const { withBtn = false, twoLines = true } = opts;
        return `
            <div class="skeleton-list">
                ${Array.from({ length: count }).map(() => `
                    <div class="skeleton-row">
                        <div class="skel-avatar"></div>
                        <div class="skel-lines">
                            <div class="skel-line w60"></div>
                            ${twoLines ? '<div class="skel-line w40"></div>' : ''}
                        </div>
                        ${withBtn ? '<div class="skel-btn"></div>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    _skeletonTabs(count = 3) {
        return `
            <div class="skeleton-tabs">
                ${Array.from({ length: count }).map(() => '<div class="skel-tab"></div>').join('')}
            </div>
        `;
    }

    _skeletonChart() {
        return '<div class="skeleton-chart"></div>';
    }

    _skeletonGrid(count = 6) {
        return `
            <div class="skeleton-grid">
                ${Array.from({ length: count }).map(() => '<div class="skel-box"></div>').join('')}
            </div>
        `;
    }

    _skeletonMessages(count = 4) {
        return `
            <div class="skeleton-list">
                ${Array.from({ length: count }).map(() => `
                    <div class="skeleton-msg">
                        <div class="skel-dot"></div>
                        <div class="skel-lines">
                            <div class="skel-line w40"></div>
                            <div class="skel-line w80"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
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
