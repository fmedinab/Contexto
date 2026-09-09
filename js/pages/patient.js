// js/pages/patient.js
// Portal del paciente (/paciente).
// Vista autenticada para usuarios con rol 'patient': perfil, próximas citas,
// historial, tareas terapéuticas, evaluaciones y solicitudes propias.
// La visibilidad de datos la garantiza RLS; este módulo solo presenta.

import { patientPortalService } from '../services/patientPortalService.js';
import { authService } from '../services/authService.js';
import { getGreeting, getInitials, formatAppointmentDate } from '../services/mockData.js';
import { BOOKING_STATUS_LABELS } from '../services/bookingRequestsService.js';

const ASSESSMENT_STATUS_LABELS = {
    COMPLETADA: 'Completada',
    EN_PROGRESO: 'En progreso',
    PROGRAMADA: 'Programada',
    CANCELADA: 'Cancelada'
};

const TASK_STATUS_LABELS = {
    PENDIENTE: 'Por hacer',
    EN_PROGRESO: 'En progreso',
    COMPLETADA: 'Completada',
    VENCIDA: 'Vencida',
    CANCELADA: 'Cancelada'
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function textOrEmDash(value) {
    return value ? escapeHtml(value) : '<span class="pt-muted">—</span>';
}

function formatDateLong(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadge(status, labels) {
    const label = (labels && labels[status]) || status;
    return `<span class="pt-badge pt-badge--${String(status).toLowerCase()}">${escapeHtml(label)}</span>`;
}

export class PatientPortalPage {
    constructor() {
        this.container = null;
        this.clockInterval = null;
    }

    async render() {
        this.container = document.getElementById('pageBody');
        if (!this.container) return;

        const user = authService.getCurrentUser() || {};
        const greeting = getGreeting();
        const initials = getInitials(user.user_metadata?.full_name || user.email || 'Paciente');

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
                                <svg class="brand-logo-svg" viewBox="0 0 100 100" fill="none">
                                    <path d="M64 15C43 15 26 32 26 53c0 21 17 38 38 38" stroke="#c4b5fd" stroke-width="6" stroke-linecap="round"/>
                                    <circle cx="50" cy="35" r="8" fill="#86efac"/>
                                    <circle cx="35" cy="53" r="8" fill="#93c5fd"/>
                                    <circle cx="65" cy="53" r="8" fill="#67e8f9"/>
                                    <circle cx="50" cy="71" r="8" fill="#fcd34d"/>
                                    <path d="M50 43a11 11 0 0 0-11 10M39 55a11 11 0 0 0 11 8M50 63a11 11 0 0 0 11-8M61 53a11 11 0 0 0-11-10" stroke="#a5b4fc" stroke-width="1.5"/>
                                </svg>
                            </div>
                            <div class="brand-text">
                                <div class="brand-name">CONTEXTO</div>
                                <div class="brand-sub">Psicología</div>
                            </div>
                        </div>
                        <div class="header-center">
                            <span class="clock-date" id="ptDate">—</span>
                            <span class="dot-sep" aria-hidden="true"></span>
                            <span class="clock-time" id="ptTime">--:--</span>
                        </div>
                        <div class="header-right">
                            <button class="icon-btn" id="ptLogout" aria-label="Cerrar sesión" title="Cerrar sesión">
                                <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
                            </button>
                        </div>
                    </div>
                </header>

                <div class="main-grid">
                    <div class="greeting-card">
                        <h1 class="greeting-title">${greeting.text} <span class="heart" aria-hidden="true">♡</span></h1>
                        <p class="greeting-quote">"${greeting.phrase}"</p>
                    </div>

                    <section class="card pt-card pt-card--profile">
                        <h2 class="card-title">Mi expediente</h2>
                        <div id="ptProfile" class="pt-loading">Cargando tu información…</div>
                    </section>

                    <div class="pt-grid">
                        <section class="card pt-card">
                            <h2 class="card-title">Próximas citas</h2>
                            <div id="ptUpcoming" class="pt-loading">Cargando citas…</div>
                            <a class="btn pt-book-link" href="#/">
                                Reservar una cita <span aria-hidden="true">→</span>
                            </a>
                        </section>

                        <section class="card pt-card">
                            <h2 class="card-title">Historial de citas</h2>
                            <div id="ptHistory" class="pt-loading">Cargando…</div>
                        </section>
                    </div>

                    <section class="card pt-card">
                        <h2 class="card-title">Mis tareas terapéuticas</h2>
                        <div id="ptTasks" class="pt-loading">Cargando tareas…</div>
                    </section>

                    <div class="pt-grid">
                        <section class="card pt-card">
                            <h2 class="card-title">Mis evaluaciones</h2>
                            <div id="ptAssessments" class="pt-loading">Cargando…</div>
                        </section>

                        <section class="card pt-card">
                            <h2 class="card-title">Mis solicitudes</h2>
                            <div id="ptRequests" class="pt-loading">Cargando…</div>
                        </section>
                    </div>
                </div>
            </div>
        `;

        this.container.querySelector('#ptLogout').addEventListener('click', () => {
            authService.logout().catch(() => {});
        });

        this._startClock();
        await Promise.allSettled([
            this._loadProfile(),
            this._loadUpcoming(),
            this._loadHistory(),
            this._loadTasks(),
            this._loadAssessments(),
            this._loadRequests()
        ]);
    }

    _startClock() {
        const dateEl = this.container?.querySelector('#ptDate');
        const timeEl = this.container?.querySelector('#ptTime');
        const tick = () => {
            const now = new Date();
            if (dateEl) dateEl.textContent = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            if (timeEl) timeEl.textContent = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        };
        tick();
        this.clockInterval = setInterval(tick, 1000);
    }

    async _loadProfile() {
        const wrap = this.container?.querySelector('#ptProfile');
        if (!wrap) return;
        const { data, error } = await patientPortalService.getMyRecord();
        if (error || !data) {
            wrap.innerHTML = `<p class="pt-empty">No encontramos tu ficha clínica. Tu terapeuta la creará en su primera sesión contigo.</p>`;
            return;
        }
        const p = data;
        wrap.innerHTML = `
            <div class="pt-profile-row">
                <div class="pt-avatar">${escapeHtml(getInitials(p.full_name))}</div>
                <div>
                    <div class="pt-name">${escapeHtml(p.full_name)}</div>
                    <div class="pt-muted">Desde ${formatShortDate(p.created_at)}</div>
                </div>
            </div>
            <dl class="pt-dl">
                <div><dt>Terapia</dt><dd>${textOrEmDash(p.therapy_type)}</dd></div>
                <div><dt>Contacto</dt><dd>${escapeHtml(p.phone || '')}${p.phone && p.email ? ' · ' : ''}${escapeHtml(p.email || '')}</dd></div>
                <div><dt>Estado</dt><dd>${textOrEmDash(p.status)}</dd></div>
            </dl>
        `;
    }

    async _loadUpcoming() {
        const wrap = this.container?.querySelector('#ptUpcoming');
        if (!wrap) return;
        const { data, error } = await patientPortalService.getMyUpcomingAppointments();
        if (error || !data || !data.length) {
            wrap.innerHTML = `<p class="pt-empty">No tienes citas programadas. Reserva un horario desde la página de inicio.</p>`;
            return;
        }
        wrap.innerHTML = data.map(a => `
            <div class="pt-item">
                <div class="pt-item-date">
                    <span class="pt-item-day">${new Date(a.appointment_date).getDate()}</span>
                    <span class="pt-item-month">${new Date(a.appointment_date).toLocaleDateString('es-MX', { month: 'short' })}</span>
                </div>
                <div class="pt-item-body">
                    <div class="pt-item-title">${escapeHtml(a.title)}</div>
                    <div class="pt-item-sub">${escapeHtml(a.type)} · ${formatAppointmentDate(a.appointment_date)}</div>
                </div>
                ${statusBadge(a.status, { PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', EN_CURSO: 'En curso', COMPLETADA: 'Completada', CANCELADA: 'Cancelada' })}
            </div>
        `).join('');
    }

    async _loadHistory() {
        const wrap = this.container?.querySelector('#ptHistory');
        if (!wrap) return;
        const { data, error } = await patientPortalService.getMyPastAppointments();
        if (error || !data || !data.length) {
            wrap.innerHTML = `<p class="pt-empty">Aún no hay citas en tu historial.</p>`;
            return;
        }
        wrap.innerHTML = data.map(a => `
            <div class="pt-item">
                <div class="pt-item-body">
                    <div class="pt-item-title">${escapeHtml(a.title)}</div>
                    <div class="pt-item-sub">${formatDateLong(a.appointment_date)} · ${escapeHtml(a.type)}</div>
                </div>
                ${statusBadge(a.status, { COMPLETADA: 'Completada', CANCELADA: 'Cancelada' })}
            </div>
        `).join('');
    }

    async _loadTasks() {
        const wrap = this.container?.querySelector('#ptTasks');
        if (!wrap) return;
        const { data, error } = await patientPortalService.getMyTasks();
        if (error || !data || !data.length) {
            wrap.innerHTML = `<p class="pt-empty">Tu terapeuta aún no te asigna tareas. ¡Disfruta del descanso!</p>`;
            return;
        }
        wrap.innerHTML = data.map(t => {
            const done = t.status === 'COMPLETADA';
            const progress = done ? 100 : (t.status === 'EN_PROGRESO' ? 50 : (t.status === 'VENCIDA' ? 100 : 0));
            return `
                <div class="pt-item pt-task">
                    <div class="pt-item-body">
                        <div class="pt-item-title">${escapeHtml(t.title)}</div>
                        <div class="pt-item-sub">${escapeHtml(t.description || '')}${t.due_date ? ` · Para el ${formatShortDate(t.due_date)}` : ''}</div>
                        <div class="pt-progress"><span class="pt-progress-fill" style="width:${progress}%"></span></div>
                    </div>
                    ${statusBadge(t.status, TASK_STATUS_LABELS)}
                </div>
            `;
        }).join('');
    }

    async _loadAssessments() {
        const wrap = this.container?.querySelector('#ptAssessments');
        if (!wrap) return;
        const { data, error } = await patientPortalService.getMyAssessments();
        if (error || !data || !data.length) {
            wrap.innerHTML = `<p class="pt-empty">Aún no tienes evaluaciones registradas.</p>`;
            return;
        }
        wrap.innerHTML = data.map(a => `
            <div class="pt-item">
                <div class="pt-item-body">
                    <div class="pt-item-title">${escapeHtml(a.instrument_name || 'Evaluación')}</div>
                    <div class="pt-item-sub">${formatDateLong(a.assessment_date)}</div>
                </div>
                ${statusBadge(a.status, ASSESSMENT_STATUS_LABELS)}
            </div>
        `).join('');
    }

    async _loadRequests() {
        const wrap = this.container?.querySelector('#ptRequests');
        if (!wrap) return;
        const { data, error } = await patientPortalService.getMyBookingRequests();
        if (error || !data || !data.length) {
            wrap.innerHTML = `<p class="pt-empty">No tienes solicitudes de cita.</p>`;
            return;
        }
        wrap.innerHTML = data.map(r => `
            <div class="pt-item">
                <div class="pt-item-body">
                    <div class="pt-item-title">${escapeHtml(r.service_type)} · ${escapeHtml(r.modality)}</div>
                    <div class="pt-item-sub">${r.preferred_date ? `${formatShortDate(r.preferred_date)}${r.preferred_time ? ` a las ${escapeHtml(r.preferred_time)}` : ''}` : 'Sin fecha preferida'}</div>
                </div>
                ${statusBadge(r.status, BOOKING_STATUS_LABELS)}
            </div>
        `).join('');
    }

    destroy() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        this.container = null;
    }
}