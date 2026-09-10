// js/pages/patient.js
// Portal del paciente dentro del dashboard unificado (/dashboard).
// Vista autenticada para usuarios sin rol de staff: perfil, próximas citas,
// historial, tareas terapéuticas, evaluaciones y solicitudes propias.
// Es SOLO LECTURA: el paciente no hace CRUD. La visibilidad de datos la
// garantiza RLS; este módulo solo presenta.
//
// Diseño: dashboard clásico y sobrio, independiente del shell orbital del
// staff (no hereda .app--dashboard). Todo el estilo vive aquí con prefijo pt-.

import { patientPortalService } from '../services/patientPortalService.js';
import { authService } from '../services/authService.js';
import { getGreeting, getInitials, formatAppointmentDate } from '../services/mockData.js';
import { BOOKING_STATUS_LABELS, bookingRequestsService } from '../services/bookingRequestsService.js';
import { cmsService } from '../services/cmsService.js';
import { siteSettingsService } from '../services/siteSettingsService.js';

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
        const patientName = user.user_metadata?.full_name || user.email || 'Paciente';
        const firstName = String(patientName).trim().split(/\s+/)[0];

        const [cms, settings] = await Promise.allSettled([
            cmsService.getLandingContent().catch(() => null),
            siteSettingsService.getAll().catch(() => null)
        ]);
        this._cms = cms?.value || null;
        this._settings = settings?.value || null;

        this.container.innerHTML = `
            <div class="pt-shell" id="ptShell">

                <header class="pt-header">
                    <div class="pt-header-inner">
                        <a class="pt-brand" href="#/" aria-label="CONTEXTO Psicología — Inicio">
                            <span class="pt-brand-logo" aria-hidden="true">
                                <svg viewBox="0 0 100 100" fill="none">
                                    <path d="M64 15C43 15 26 32 26 53c0 21 17 38 38 38" stroke="#8b5cf6" stroke-width="6" stroke-linecap="round"/>
                                    <circle cx="50" cy="35" r="8" fill="#86efac"/>
                                    <circle cx="35" cy="53" r="8" fill="#93c5fd"/>
                                    <circle cx="65" cy="53" r="8" fill="#67e8f9"/>
                                    <circle cx="50" cy="71" r="8" fill="#fcd34d"/>
                                </svg>
                            </span>
                            <span class="pt-brand-text">
                                <span class="pt-brand-name">CONTEXTO</span>
                                <span class="pt-brand-sub">Psicología</span>
                            </span>
                        </a>

                        <div class="pt-clock" aria-hidden="true">
                            <span class="pt-clock-date" id="ptDate">—</span>
                            <span class="pt-clock-dot">·</span>
                            <span class="pt-clock-time" id="ptTime">--:--</span>
                        </div>

                        <div class="pt-user" id="ptUser">
                            <button class="pt-user-trigger" id="ptUserTrigger" aria-haspopup="true" aria-expanded="false">
                                <span class="pt-avatar">${escapeHtml(initials)}</span>
                                <span class="pt-user-meta">
                                    <span class="pt-user-name">${escapeHtml(firstName)}</span>
                                    <span class="pt-user-role">Paciente</span>
                                </span>
                                <svg class="pt-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                            </button>
                            <div class="pt-dropdown" role="menu">
                                <button role="menuitem" data-action="home">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7"/><path d="M5 9v11h14V9"/></svg>
                                    Volver al inicio
                                </button>
                                <button role="menuitem" data-action="logout">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
                                    Cerrar sesión
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="pt-main">
                    <div class="pt-hello">
                        <h1 class="pt-hello-title">${greeting.text} <span class="pt-heart" aria-hidden="true">♡</span></h1>
                        <p class="pt-hello-quote">"${greeting.phrase}"</p>
                    </div>

                    <div class="pt-grid">
                        <section class="pt-card pt-card--profile">
                            <h2 class="pt-card-title">Mi expediente</h2>
                            <div id="ptProfile" class="pt-loading">Cargando tu información…</div>
                        </section>

                        <section class="pt-card">
                            <h2 class="pt-card-title">Próximas citas</h2>
                            <div id="ptUpcoming" class="pt-loading">Cargando citas…</div>
                            <button class="pt-link pt-link--btn" type="button" data-booking-open aria-haspopup="dialog">
                                Solicitar una cita <span aria-hidden="true">→</span>
                            </button>
                        </section>
                    </div>

                    <div class="pt-grid">
                        <section class="pt-card">
                            <h2 class="pt-card-title">Historial de citas</h2>
                            <div id="ptHistory" class="pt-loading">Cargando…</div>
                        </section>

                        <section class="pt-card">
                            <h2 class="pt-card-title">Mis tareas terapéuticas</h2>
                            <div id="ptTasks" class="pt-loading">Cargando tareas…</div>
                        </section>
                    </div>

                    <div class="pt-grid">
                        <section class="pt-card">
                            <h2 class="pt-card-title">Mis evaluaciones</h2>
                            <div id="ptAssessments" class="pt-loading">Cargando…</div>
                        </section>

                        <section class="pt-card">
                            <h2 class="pt-card-title">Mis solicitudes</h2>
                            <div id="ptRequests" class="pt-loading">Cargando…</div>
                        </section>
                    </div>
                </main>

                <div class="pt-modal" id="ptBookingModal" role="dialog" aria-modal="true" aria-labelledby="ptBookingTitle" hidden>
                    <div class="pt-modal-backdrop" data-booking-close></div>
                    <div class="pt-modal-panel">
                        <div class="pt-modal-head">
                            <h2 class="pt-modal-title" id="ptBookingTitle">Solicitar una cita</h2>
                            <button class="pt-modal-close" type="button" data-booking-close aria-label="Cerrar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <form class="pt-booking-form" id="ptBookingForm" novalidate>
                            <div class="pt-form-grid">
                                <div class="pt-form-group">
                                    <label class="pt-form-label" for="ptBkName">Nombre completo <span class="pt-req">*</span></label>
                                    <input class="pt-input" type="text" id="ptBkName" name="fullName" required autocomplete="name">
                                </div>
                                <div class="pt-form-group">
                                    <label class="pt-form-label" for="ptBkPhone">WhatsApp / teléfono <span class="pt-req">*</span></label>
                                    <input class="pt-input" type="tel" id="ptBkPhone" name="phone" required autocomplete="tel">
                                </div>
                                <div class="pt-form-group pt-form-group--full">
                                    <label class="pt-form-label" for="ptBkEmail">Correo electrónico</label>
                                    <input class="pt-input" type="email" id="ptBkEmail" name="email" autocomplete="email">
                                </div>
                                <div class="pt-form-group">
                                    <label class="pt-form-label" for="ptBkService">Servicio <span class="pt-req">*</span></label>
                                    <select class="pt-input pt-input--select" id="ptBkService" name="serviceType" required>
                                        ${this._serviceOptionsHtml()}
                                    </select>
                                </div>
                                <div class="pt-form-group">
                                    <label class="pt-form-label" for="ptBkModality">Modalidad <span class="pt-req">*</span></label>
                                    <select class="pt-input pt-input--select" id="ptBkModality" name="modality" required>
                                        <option value="Presencial">Presencial</option>
                                        <option value="Online">Online</option>
                                    </select>
                                </div>
                                <div class="pt-form-group">
                                    <label class="pt-form-label" for="ptBkDate">Fecha preferida <span class="pt-req">*</span></label>
                                    <input class="pt-input" type="date" id="ptBkDate" name="preferredDate" required>
                                </div>
                                <div class="pt-form-group">
                                    <label class="pt-form-label" for="ptBkTime">Horario preferido <span class="pt-req">*</span></label>
                                    <select class="pt-input pt-input--select" id="ptBkTime" name="preferredTime" required disabled>
                                        <option value="">Elige primero una fecha</option>
                                    </select>
                                    <span class="pt-form-hint" id="ptBkTimeHint"></span>
                                </div>
                                <div class="pt-form-group pt-form-group--full">
                                    <label class="pt-form-label" for="ptBkMsg">¿En qué podemos acompañarte? <span class="pt-opt">(opcional)</span></label>
                                    <textarea class="pt-textarea" id="ptBkMsg" name="message" placeholder="Cuéntanos brevemente tu motivo de consulta."></textarea>
                                </div>
                            </div>
                            <button type="submit" class="pt-btn pt-btn--primary">Enviar solicitud</button>
                            <p class="pt-booking-status" id="ptBookingStatus" role="status"></p>
                            <p class="pt-form-note">El equipo te contactará para confirmar el horario disponible.</p>
                        </form>
                    </div>
                </div>
            </div>
        `;

        const userMenu = this.container.querySelector('#ptUser');
        if (userMenu) {
            const trigger = userMenu.querySelector('#ptUserTrigger');
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = userMenu.classList.toggle('open');
                trigger.setAttribute('aria-expanded', String(isOpen));
            });
            userMenu.addEventListener('click', (e) => {
                const action = e.target.closest('[data-action]')?.dataset.action;
                if (action === 'logout') {
                    authService.logout().catch(() => {});
                } else if (action === 'home') {
                    window.router?.navigate?.('/');
                }
                userMenu.classList.remove('open');
            });
        }

        this._ptDocClick = (e) => {
            const menu = this.container?.querySelector('#ptUser');
            if (menu && !menu.contains(e.target)) menu.classList.remove('open');
        };
        document.addEventListener('click', this._ptDocClick);

        this._bindBookingModal();

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

    // Servicios del formulario: desde el CMS (landing pública), con fallback.
    _serviceOptionsHtml() {
        const services = (this._cms && this._cms.servicios && this._cms.servicios.items) || [];
        const titles = services.map(s => s && s.title).filter(Boolean);
        if (!titles.length) {
            titles.push('Terapia Individual', 'Terapia de Pareja', 'Terapia Familiar', 'Evaluación Psicológica', 'Terapia Online');
        }
        return titles.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    }

    _confirmHoursHtml() {
        const h = this._settings && this._settings.booking_confirm_hours;
        return h ? String(h) : '24';
    }

    async _loadTimeOptions(dateISO) {
        const select = this.container?.querySelector('#ptBkTime');
        const hint = this.container?.querySelector('#ptBkTimeHint');
        if (!select) return;

        if (!dateISO) {
            select.disabled = true;
            select.innerHTML = '<option value="">Elige primero una fecha</option>';
            if (hint) hint.textContent = '';
            return;
        }

        select.disabled = true;
        select.innerHTML = '<option value="">Buscando horarios…</option>';
        if (hint) hint.textContent = '';
        if (this._slotsToken) this._slotsToken.cancelled = true;
        const token = { cancelled: false };
        this._slotsToken = token;

        const { data: slots, error } = await bookingRequestsService.getAvailableTimes(dateISO);
        if (token.cancelled) return;
        this._slotsToken = null;

        if (error || !slots || !slots.length) {
            select.disabled = true;
            select.innerHTML = '<option value="">Sin horarios disponibles</option>';
            if (hint) {
                hint.textContent = 'No hay horarios libres para esta fecha. Prueba con otro día.';
                hint.className = 'pt-form-hint is-error';
            }
            return;
        }

        select.disabled = false;
        select.innerHTML = '<option value="">Elige un horario</option>' +
            slots.map(s => `<option value="${s}">${s}</option>`).join('');
        if (hint) {
            hint.textContent = `${slots.length} horario(s) libre(s) para esta fecha.`;
            hint.className = 'pt-form-hint is-ok';
        }
    }

    _bindBookingModal() {
        const modal = this.container?.querySelector('#ptBookingModal');
        const openBtn = this.container?.querySelector('[data-booking-open]');
        if (!modal || !openBtn) return;

        const form = modal.querySelector('#ptBookingForm');
        const statusEl = modal.querySelector('#ptBookingStatus');

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        modal.querySelector('#ptBkDate').min = today;

        const setStatus = (type, text) => {
            statusEl.textContent = text;
            statusEl.className = `pt-booking-status is-${type}`;
        };
        const setBusy = (busy) => {
            const submit = form.querySelector('[type="submit"]');
            submit.disabled = busy;
            submit.textContent = busy ? 'Enviando solicitud…' : 'Enviar solicitud';
        };

        const prefill = () => {
            const user = authService.getCurrentUser() || {};
            const fullName = user.user_metadata?.full_name || user.email || '';
            form.querySelector('#ptBkName').value = fullName;
            form.querySelector('#ptBkEmail').value = user.email || '';
        };

        openBtn.addEventListener('click', () => {
            prefill();
            setStatus('', '');
            modal.hidden = false;
            document.body.style.overflow = 'hidden';
            modal.querySelector('#ptBkName').focus();
        });

        const close = () => {
            modal.hidden = true;
            document.body.style.overflow = '';
        };

        modal.querySelectorAll('[data-booking-close]').forEach(el => {
            el.addEventListener('click', close);
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            setStatus('', '');

            const fullName = form.querySelector('#ptBkName').value.trim();
            const phone = form.querySelector('#ptBkPhone').value.trim();
            const email = form.querySelector('#ptBkEmail').value.trim();
            const serviceType = form.querySelector('#ptBkService').value;
            const modality = form.querySelector('#ptBkModality').value;
            const preferredDate = form.querySelector('#ptBkDate').value;
            const preferredTime = form.querySelector('#ptBkTime').value;
            const message = form.querySelector('#ptBkMsg').value.trim();

            if (!fullName || !phone || !preferredDate || !preferredTime) {
                setStatus('error', 'Completa nombre, teléfono, fecha y horario.');
                return;
            }
            if (!/^\+?[\d\s()-]{7,}$/.test(phone)) {
                setStatus('error', 'Revisa el formato de tu teléfono.');
                return;
            }
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setStatus('error', 'Revisa el formato de tu correo electrónico.');
                return;
            }

            setBusy(true);
            const { data, error } = await bookingRequestsService.create({
                fullName,
                phone,
                email,
                serviceType,
                modality,
                preferredDate,
                preferredTime,
                message
            });
            setBusy(false);

            if (!error && data) {
                setStatus('success', `¡Solicitud enviada! Te confirmaremos tu cita en menos de ${this._confirmHoursHtml()} horas.`);
                form.reset();
                prefill();
                this._loadTimeOptions('');
                this._loadRequests();
            } else {
                console.error('booking create error:', error);
                setStatus('error', 'No pudimos registrar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.');
            }
        });

        this._bookingClose = close;
        this._bookingModal = modal;

        document.addEventListener('keydown', this._bookingEsc = (ev) => {
            if (ev.key === 'Escape' && !modal.hidden) close();
        });

        const dateInput = form.querySelector('#ptBkDate');
        const todayMsStart = new Date().setHours(0, 0, 0, 0);
        dateInput.addEventListener('input', () => {
            if (dateInput.value && new Date(dateInput.value).getTime() < todayMsStart) {
                setStatus('error', 'Elige una fecha futura, no en el pasado.');
                dateInput.value = '';
                this._loadTimeOptions('');
            }
        });
        dateInput.addEventListener('change', () => {
            if (dateInput.value) this._loadTimeOptions(dateInput.value);
        });
        openBtn.addEventListener('click', () => {
            this._loadTimeOptions(form.querySelector('#ptBkDate').value || '');
        });
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
        if (this._slotsToken) {
            this._slotsToken.cancelled = true;
            this._slotsToken = null;
        }
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        if (this._ptDocClick) {
            document.removeEventListener('click', this._ptDocClick);
            this._ptDocClick = null;
        }
        if (this._bookingEsc) {
            document.removeEventListener('keydown', this._bookingEsc);
            this._bookingEsc = null;
        }
        if (this._bookingModal && this._bookingClose) {
            this._bookingModal.hidden = true;
            document.body.style.overflow = '';
        }
        this.container = null;
    }
}