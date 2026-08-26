// js/pages/appointments.js
// Módulo de citas/Agenda — Página completa con CRUD real.

import {
    appointmentService,
    APPOINTMENT_TYPES,
    STATUS_LABELS,
    STATUS_COLORS,
    VALID_TRANSITIONS
} from '../services/appointmentsService.js';
import { patientService } from '../services/patientsService.js';

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

function icon(name) {
    const map = {
        search: '<i class="fa-solid fa-magnifying-glass"></i>',
        plus: '<i class="fa-solid fa-plus"></i>',
        eye: '<i class="fa-solid fa-eye"></i>',
        pencil: '<i class="fa-solid fa-pen"></i>',
        trash: '<i class="fa-solid fa-trash-can"></i>',
        x: '<i class="fa-solid fa-xmark"></i>',
        calendar: '<i class="fa-solid fa-calendar-days"></i>',
        clock: '<i class="fa-solid fa-clock"></i>',
        user: '<i class="fa-solid fa-user"></i>',
        note: '<i class="fa-solid fa-note-sticky"></i>',
        mapPin: '<i class="fa-solid fa-location-dot"></i>',
        check: '<i class="fa-solid fa-check"></i>',
        arrowRight: '<i class="fa-solid fa-arrow-right"></i>',
        calendarDay: '<i class="fa-solid fa-calendar-day"></i>',
        calendarWeek: '<i class="fa-solid fa-calendar-week"></i>',
        list: '<i class="fa-solid fa-list"></i>',
        sort: '<i class="fa-solid fa-arrow-down-wide-short"></i>',
        sync: '<i class="fa-solid fa-rotate"></i>'
    };
    return map[name] || '';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return formatDate(dateStr) + ' ' + formatTime(dateStr);
}

function formatDateTimeInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function skeletonTable(rows = 5) {
    return `<tr><td colspan="7"><div class="appt-loading">
        ${Array.from({ length: rows }).map(() => `
            <div class="skeleton-row">
                <div class="skel-avatar"></div>
                <div class="skel-lines"><div class="skel-line w60"></div><div class="skel-line w40"></div></div>
                <div class="skel-btn"></div><div class="skel-btn"></div><div class="skel-btn"></div>
            </div>
        `).join('')}
    </div></td></tr>`;
}

/* ===== DAY NAMES ===== */
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatDayHeader(date) {
    const d = new Date(date);
    return `${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

export class AppointmentsPage {
    constructor() {
        this.container = null;
        this.currentStatusFilter = 'all';
        this.currentTypeFilter = 'all';
        this.searchQuery = '';
        this.currentModal = null;
        this.editingAppointment = null;
        this.appointments = [];
        this.patients = [];
        this.stats = { total: 0, pending: 0, confirmed: 0, inProgress: 0, completed: 0, cancelled: 0, today: 0, upcoming: 0 };
        this.loading = true;
        this.error = null;
        this.viewMode = 'table'; // 'table' | 'agenda'
        this.agendaDate = new Date(); // current day for agenda
        this._onKeyDown = this._onKeyDown.bind(this);
        this._debounceTimer = null;
        this._unsubscribers = [];
    }

    async render() {
        this.container = document.getElementById('pageBody');
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="ambient-bg" aria-hidden="true"></div>
            <div class="appts-page">
                <div class="appts-header">
                    <div class="appts-header-left">
                        <h1 class="appts-title">Agenda de Citas</h1>
                        <p class="appts-subtitle">Gestiona y da seguimiento a las citas del consultorio.</p>
                    </div>
                    <div class="appts-header-actions">
                        <div class="view-toggle" id="apptViewToggle">
                            <button class="view-btn active" data-view="table" title="Vista tabla">${icon('list')}</button>
                            <button class="view-btn" data-view="agenda" title="Vista agenda">${icon('calendarDay')}</button>
                        </div>
                        <button class="btn btn-primary" id="btnNewAppointment">
                            ${icon('plus')} Nueva cita
                        </button>
                    </div>
                </div>

                <div class="appts-stats" id="apptStats">
                    <div class="stat-card"><span class="stat-label">Total</span><span class="stat-value accent">—</span></div>
                    <div class="stat-card"><span class="stat-label">Hoy</span><span class="stat-value">—</span></div>
                    <div class="stat-card"><span class="stat-label">Pendientes</span><span class="stat-value">—</span></div>
                    <div class="stat-card"><span class="stat-label">Confirmadas</span><span class="stat-value">—</span></div>
                </div>

                <div class="appts-toolbar" id="apptsToolbar">
                    <div class="search-box">
                        <span class="search-icon">${icon('search')}</span>
                        <input type="text" id="apptSearch" placeholder="Buscar por título, notas…" autocomplete="off">
                    </div>
                    <div class="filter-group">
                        <div class="filter-tabs" id="apptStatusFilter">
                            <button class="filter-tab active" data-filter="all">Todas</button>
                            <button class="filter-tab" data-filter="PENDIENTE">Pendientes</button>
                            <button class="filter-tab" data-filter="CONFIRMADA">Confirmadas</button>
                            <button class="filter-tab" data-filter="EN_CURSO">En curso</button>
                            <button class="filter-tab" data-filter="COMPLETADA">Completadas</button>
                            <button class="filter-tab" data-filter="CANCELADA">Canceladas</button>
                        </div>
                        <select id="apptTypeFilter" class="type-filter-select">
                            <option value="all">Todos los tipos</option>
                            ${APPOINTMENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <!-- TABLE VIEW -->
                <div class="appts-table-wrap" id="apptTableView">
                    <table class="appts-table">
                        <thead>
                            <tr>
                                <th>Paciente</th>
                                <th>Título</th>
                                <th>Fecha y hora</th>
                                <th>Duración</th>
                                <th>Tipo</th>
                                <th>Estado</th>
                                <th style="width:120px">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="apptTableBody">${skeletonTable()}</tbody>
                    </table>
                </div>

                <!-- AGENDA VIEW -->
                <div class="appts-agenda-wrap hidden" id="apptAgendaView">
                    <div class="agenda-nav">
                        <button class="btn" id="agendaPrev">${icon('arrowRight')} <span style="transform:rotate(180deg);display:inline-flex">${icon('arrowRight')}</span></button>
                        <button class="btn" id="agendaToday">Hoy</button>
                        <span class="agenda-date-label" id="agendaDateLabel"></span>
                        <button class="btn" id="agendaNext">${icon('arrowRight')}</button>
                    </div>
                    <div class="agenda-grid" id="agendaGrid"></div>
                </div>
            </div>

            <div class="appt-modal-overlay" id="apptModalOverlay">
                <div class="appt-modal" id="apptModal">
                    <div class="modal-header">
                        <h2 id="apptModalTitle"></h2>
                        <button class="modal-close" id="apptModalClose">${icon('x')}</button>
                    </div>
                    <div class="modal-body" id="apptModalBody"></div>
                    <div class="modal-actions" id="apptModalActions"></div>
                </div>
            </div>

            <div class="appts-toast" id="apptsToast"></div>
        `;

        this._bindEvents();
        await this._loadData();
    }

    destroy() {
        document.removeEventListener('keydown', this._onKeyDown);
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._unsubscribers.forEach(fn => fn());
        this._unsubscribers = [];
        this.container = null;
    }

    /* ===== DATA ===== */

    async _loadData() {
        this.loading = true;
        this.error = null;

        try {
            const [appointmentsResult, statsResult, patientsResult] = await Promise.all([
                appointmentService.getAll({
                    status: this.currentStatusFilter,
                    type: this.currentTypeFilter,
                    search: this.searchQuery || undefined
                }),
                appointmentService.getStats(),
                patientService.getAll()
            ]);

            if (appointmentsResult.error) throw appointmentsResult.error;
            if (statsResult.error) throw statsResult.error;

            this.appointments = appointmentsResult.data || [];
            this.stats = statsResult.data;
            this.patients = patientsResult.data || [];
            this._renderStats();
            if (this.viewMode === 'table') this._renderTable();
            else this._renderAgenda();
        } catch (err) {
            console.error('Error al cargar citas:', err);
            this.error = err.message || 'Error al cargar datos';
            this._renderError();
        } finally {
            this.loading = false;
        }
    }

    _renderStats() {
        const el = $('#apptStats');
        if (!el) return;
        el.innerHTML = `
            <div class="stat-card"><span class="stat-label">Total</span><span class="stat-value accent">${this.stats.total}</span></div>
            <div class="stat-card"><span class="stat-label">Hoy</span><span class="stat-value">${this.stats.today}</span></div>
            <div class="stat-card"><span class="stat-label">Pendientes</span><span class="stat-value">${this.stats.pending}</span></div>
            <div class="stat-card"><span class="stat-label">Confirmadas</span><span class="stat-value">${this.stats.confirmed}</span></div>
        `;
    }

    _renderTable() {
        const tbody = $('#apptTableBody');
        if (!tbody) return;

        if (this.appointments.length === 0) {
            const isSearch = this.searchQuery.length > 0;
            tbody.innerHTML = `
                <tr><td colspan="7">
                    <div class="appts-empty">
                        <i class="fa-solid fa-${isSearch ? 'magnifying-glass' : 'calendar-xmark'}"></i>
                        <p>${isSearch ? 'No se encontraron citas con ese criterio' : 'No hay citas programadas todavía.'}</p>
                        ${!isSearch ? '<p class="appts-empty-hint">Programa tu primera cita para comenzar.</p>' : ''}
                        ${!isSearch ? `<button class="btn btn-primary appts-empty-btn" id="emptyNewAppt">${icon('plus')} Nueva cita</button>` : ''}
                    </div>
                </td></tr>
            `;
            const emptyBtn = $('#emptyNewAppt');
            if (emptyBtn) emptyBtn.addEventListener('click', () => this._openForm());
            return;
        }

        tbody.innerHTML = this.appointments.map(a => `
            <tr data-id="${a.id}">
                <td>
                    <div class="appt-cell">
                        <div class="appt-avatar">${getInitials(a.patientName)}</div>
                        <div>
                            <div class="appt-patient-name">${escapeHtml(a.patientName)}</div>
                        </div>
                    </div>
                </td>
                <td><span class="appt-title-text">${escapeHtml(a.title)}</span></td>
                <td><span class="appt-datetime">${formatDateTime(a.appointmentDate)}</span></td>
                <td><span class="appt-duration">${a.durationMinutes} min</span></td>
                <td><span class="therapy-tag">${escapeHtml(a.type)}</span></td>
                <td><span class="status-badge appt-status-${STATUS_COLORS[a.status] || 'amber'}">${STATUS_LABELS[a.status] || a.status}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-action="view" data-id="${a.id}" title="Ver detalle">${icon('eye')}</button>
                        <button class="icon-btn" data-action="edit" data-id="${a.id}" title="Editar">${icon('pencil')}</button>
                        <button class="icon-btn danger" data-action="delete" data-id="${a.id}" title="Eliminar">${icon('trash')}</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    _renderAgenda() {
        const grid = $('#agendaGrid');
        const label = $('#agendaDateLabel');
        if (!grid || !label) return;

        const targetDate = new Date(this.agendaDate);
        targetDate.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        label.textContent = formatDayHeader(targetDate);

        const dayAppts = this.appointments.filter(a => {
            const d = new Date(a.appointmentDate);
            return d >= targetDate && d <= dayEnd;
        }).sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));

        if (dayAppts.length === 0) {
            grid.innerHTML = `
                <div class="agenda-empty">
                    <i class="fa-solid fa-calendar-xmark"></i>
                    <p>No hay citas para este día.</p>
                    <button class="btn btn-primary" id="agendaNewAppt">${icon('plus')} Agendar cita</button>
                </div>
            `;
            const btn = $('#agendaNewAppt');
            if (btn) btn.addEventListener('click', () => this._openForm());
            return;
        }

        grid.innerHTML = dayAppts.map(a => `
            <div class="agenda-card" data-id="${a.id}">
                <div class="agenda-card-time">${formatTime(a.appointmentDate)}</div>
                <div class="agenda-card-body">
                    <div class="agenda-card-header">
                        <span class="agenda-card-patient">${escapeHtml(a.patientName)}</span>
                        <span class="status-badge appt-status-${STATUS_COLORS[a.status] || 'amber'}">${STATUS_LABELS[a.status] || a.status}</span>
                    </div>
                    <div class="agenda-card-title">${escapeHtml(a.title)}</div>
                    <div class="agenda-card-meta">
                        <span>${icon('clock')} ${a.durationMinutes} min</span>
                        <span>${escapeHtml(a.type)}</span>
                        ${a.location ? `<span>${icon('mapPin')} ${escapeHtml(a.location)}</span>` : ''}
                    </div>
                </div>
                <div class="agenda-card-actions">
                    <button class="icon-btn" data-action="view" data-id="${a.id}" title="Ver">${icon('eye')}</button>
                    <button class="icon-btn" data-action="edit" data-id="${a.id}" title="Editar">${icon('pencil')}</button>
                </div>
            </div>
        `).join('');
    }

    _renderError() {
        const tbody = $('#apptTableBody');
        const grid = $('#agendaGrid');
        const errorHTML = `
            <div class="appts-empty">
                <i class="fa-solid fa-wifi" style="color:var(--dash-pink);"></i>
                <p style="color:var(--dash-pink); margin-bottom:8px;">No pudimos completar la operación.</p>
                <p style="font-size:0.82rem;">${escapeHtml(this.error)}</p>
                <button class="btn btn-primary" style="margin-top:16px;" id="retryLoadBtn">Reintentar</button>
            </div>
        `;
        if (tbody) tbody.innerHTML = `<tr><td colspan="7">${errorHTML}</td></tr>`;
        if (grid) grid.innerHTML = errorHTML;
        const retryBtn = $('#retryLoadBtn');
        if (retryBtn) retryBtn.addEventListener('click', () => this._loadData());
    }

    /* ===== EVENTS ===== */

    _bindEvents() {
        // Search
        const search = $('#apptSearch');
        if (search) {
            search.addEventListener('input', () => {
                clearTimeout(this._debounceTimer);
                this._debounceTimer = setTimeout(async () => {
                    this.searchQuery = search.value;
                    await this._loadData();
                }, 300);
            });
        }

        // Status filter
        const statusTabs = $('#apptStatusFilter');
        if (statusTabs) {
            statusTabs.addEventListener('click', async (e) => {
                const tab = e.target.closest('.filter-tab');
                if (!tab) return;
                $$('.filter-tab', statusTabs).forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentStatusFilter = tab.dataset.filter;
                await this._loadData();
            });
        }

        // Type filter
        const typeSelect = $('#apptTypeFilter');
        if (typeSelect) {
            typeSelect.addEventListener('change', async () => {
                this.currentTypeFilter = typeSelect.value;
                await this._loadData();
            });
        }

        // View toggle
        const viewToggle = $('#apptViewToggle');
        if (viewToggle) {
            viewToggle.addEventListener('click', async (e) => {
                const btn = e.target.closest('.view-btn');
                if (!btn) return;
                $$('.view-btn', viewToggle).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.viewMode = btn.dataset.view;

                const tableView = $('#apptTableView');
                const agendaView = $('#apptAgendaView');
                const toolbar = $('#apptsToolbar');

                if (this.viewMode === 'table') {
                    tableView?.classList.remove('hidden');
                    agendaView?.classList.add('hidden');
                    if (toolbar) toolbar.style.display = '';
                    this._renderTable();
                } else {
                    tableView?.classList.add('hidden');
                    agendaView?.classList.remove('hidden');
                    if (toolbar) toolbar.style.display = 'none';
                    this._renderAgenda();
                }
            });
        }

        // Agenda navigation
        $('#agendaPrev')?.addEventListener('click', () => {
            this.agendaDate.setDate(this.agendaDate.getDate() - 1);
            this._renderAgenda();
        });
        $('#agendaNext')?.addEventListener('click', () => {
            this.agendaDate.setDate(this.agendaDate.getDate() + 1);
            this._renderAgenda();
        });
        $('#agendaToday')?.addEventListener('click', () => {
            this.agendaDate = new Date();
            this._renderAgenda();
        });

        // Table row actions
        const tbody = $('#apptTableBody');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (btn) {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const action = btn.dataset.action;
                    if (action === 'view') this._openDetail(id);
                    else if (action === 'edit') this._openForm(id);
                    else if (action === 'delete') this._confirmDelete(id);
                    return;
                }
                const row = e.target.closest('tr[data-id]');
                if (row) this._openDetail(row.dataset.id);
            });
        }

        // Agenda card actions
        const agendaGrid = $('#agendaGrid');
        if (agendaGrid) {
            agendaGrid.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (btn) {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const action = btn.dataset.action;
                    if (action === 'view') this._openDetail(id);
                    else if (action === 'edit') this._openForm(id);
                    return;
                }
                const card = e.target.closest('.agenda-card[data-id]');
                if (card) this._openDetail(card.dataset.id);
            });
        }

        // New appointment button
        const newBtn = $('#btnNewAppointment');
        if (newBtn) newBtn.addEventListener('click', () => this._openForm());

        // Modal close
        const overlay = $('#apptModalOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this._closeModal();
            });
        }
        $('#apptModalClose')?.addEventListener('click', () => this._closeModal());

        document.addEventListener('keydown', this._onKeyDown);

        // Live sync
        const unsub = appointmentService.onChange(() => {
            if (!this.loading) this._loadData();
        });
        this._unsubscribers.push(unsub);
    }

    _onKeyDown(e) {
        if (e.key === 'Escape' && this.currentModal) this._closeModal();
    }

    /* ===== MODAL ===== */

    _openModal(title, bodyHTML, actionsHTML) {
        this.currentModal = true;
        const overlay = $('#apptModalOverlay');
        const titleEl = $('#apptModalTitle');
        const body = $('#apptModalBody');
        const actions = $('#apptModalActions');

        if (titleEl) titleEl.textContent = title;
        if (body) body.innerHTML = bodyHTML;
        if (actions) actions.innerHTML = actionsHTML;
        if (overlay) {
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    _closeModal() {
        this.currentModal = null;
        this.editingAppointment = null;
        const overlay = $('#apptModalOverlay');
        if (overlay) {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    /* ===== DETAIL ===== */

    async _openDetail(id) {
        this._openModal('Cargando...', '<div class="modal-loading"><div class="loading-orbit"><div class="ring"></div><div class="ring ring-2"></div><div class="core"></div></div></div>', '');

        const { data: a, error } = await appointmentService.getById(id);
        if (error || !a) {
            this._openModal('Error', '<div class="appts-empty"><p>No se pudo cargar la cita</p></div>', '<button class="btn btn-primary" id="modalCloseBtn">Cerrar</button>');
            $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
            return;
        }

        const bodyHTML = `
            <div class="appt-detail-header">
                <div class="appt-detail-avatar">${getInitials(a.patientName)}</div>
                <div>
                    <h3 class="appt-detail-name">${escapeHtml(a.patientName)}</h3>
                    <span class="appt-detail-id">${escapeHtml(a.id)}</span>
                </div>
            </div>
            <div class="detail-section-title">Información de la cita</div>
            <div class="appt-detail-grid">
                <div class="detail-field">
                    <span class="detail-label">${icon('calendar')} Fecha</span>
                    <span class="detail-value">${formatDate(a.appointmentDate)}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">${icon('clock')} Hora</span>
                    <span class="detail-value">${formatTime(a.appointmentDate)}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Duración</span>
                    <span class="detail-value">${a.durationMinutes} minutos</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Tipo</span>
                    <span class="detail-value"><span class="therapy-tag">${escapeHtml(a.type)}</span></span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Estado</span>
                    <span class="detail-value"><span class="status-badge appt-status-${STATUS_COLORS[a.status] || 'amber'}">${STATUS_LABELS[a.status] || a.status}</span></span>
                </div>
                ${a.location ? `
                <div class="detail-field">
                    <span class="detail-label">${icon('mapPin')} Ubicación</span>
                    <span class="detail-value">${escapeHtml(a.location)}</span>
                </div>` : ''}
                ${a.notes ? `
                <div class="detail-field full">
                    <span class="detail-label">${icon('note')} Notas</span>
                    <span class="detail-value">${escapeHtml(a.notes)}</span>
                </div>` : ''}
            </div>
            ${a.patientEmail || a.patientPhone ? `
            <div class="detail-section-title">Datos del paciente</div>
            <div class="appt-detail-grid">
                ${a.patientEmail ? `<div class="detail-field"><span class="detail-label">Email</span><span class="detail-value">${escapeHtml(a.patientEmail)}</span></div>` : ''}
                ${a.patientPhone ? `<div class="detail-field"><span class="detail-label">Teléfono</span><span class="detail-value">${escapeHtml(a.patientPhone)}</span></div>` : ''}
            </div>` : ''}
        `;

        const transitions = appointmentService.getValidTransitions(a.status);
        let actionsHTML = `<button class="btn" id="modalCloseBtn">Cerrar</button>`;
        if (transitions.length > 0) {
            const transitionBtns = transitions.map(t => {
                const label = STATUS_LABELS[t] || t;
                const cls = t === 'CANCELADA' ? 'btn btn-danger' : 'btn btn-primary';
                return `<button class="${cls}" data-transition="${t}" data-appt-id="${a.id}">${label}</button>`;
            }).join('');
            actionsHTML = `<div class="modal-actions-group">${transitionBtns}</div>` + actionsHTML;
        }
        actionsHTML += `<button class="btn" id="modalEditBtn">${icon('pencil')} Editar</button>`;

        this._openModal(escapeHtml(a.title), bodyHTML, actionsHTML);

        $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
        $('#modalEditBtn')?.addEventListener('click', () => { this._closeModal(); this._openForm(id); });

        // Status transitions
        $$('[data-transition]', $('#apptModalActions')).forEach(btn => {
            btn.addEventListener('click', async () => {
                const newStatus = btn.dataset.transition;
                const apptId = btn.dataset.apptId;
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                const { error } = await appointmentService.update(apptId, { status: newStatus });
                if (error) {
                    this._showToast('Error: ' + (error.message || 'No se pudo actualizar'));
                    btn.disabled = false;
                    btn.textContent = STATUS_LABELS[newStatus];
                } else {
                    this._closeModal();
                    this._showToast(`Cita marcada como ${STATUS_LABELS[newStatus]}`);
                    await this._loadData();
                }
            });
        });
    }

    /* ===== FORM (NEW / EDIT) ===== */

    async _openForm(id) {
        const isEdit = !!id;
        let a = null;

        if (isEdit) {
            this._openModal('Cargando...', '<div class="modal-loading"><div class="loading-orbit"><div class="ring"></div><div class="ring ring-2"></div><div class="core"></div></div></div>', '');
            const { data, error } = await appointmentService.getById(id);
            if (error || !data) {
                this._showToast('Error al cargar cita');
                this._closeModal();
                return;
            }
            a = data;
        }
        this.editingAppointment = a;

        const patientOptions = this.patients
            .map(p => `<option value="${p.id}" ${a && a.patientId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
            .join('');

        const typeOptions = APPOINTMENT_TYPES
            .map(t => `<option value="${t}" ${a && a.type === t ? 'selected' : ''}>${t}</option>`)
            .join('');

        const statusOptions = Object.entries(STATUS_LABELS)
            .map(([val, label]) => `<option value="${val}" ${a && a.status === val ? 'selected' : ''}>${label}</option>`)
            .join('');

        const bodyHTML = `
            <form class="form-grid" id="apptForm" novalidate>
                <div class="form-field">
                    <label for="afPatient">Paciente *</label>
                    <select id="afPatient" required>${patientOptions}</select>
                    <span class="form-error" id="afPatientError"></span>
                </div>
                <div class="form-field">
                    <label for="afTitle">Título *</label>
                    <input type="text" id="afTitle" value="${a ? escapeHtml(a.title) : ''}" required placeholder="Ej: Sesión de seguimiento">
                    <span class="form-error" id="afTitleError"></span>
                </div>
                <div class="form-field">
                    <label for="afDate">Fecha y hora *</label>
                    <input type="datetime-local" id="afDate" value="${a ? formatDateTimeInput(a.appointmentDate) : ''}" required>
                    <span class="form-error" id="afDateError"></span>
                </div>
                <div class="form-field">
                    <label for="afDuration">Duración (min)</label>
                    <input type="number" id="afDuration" min="15" max="240" step="5" value="${a ? a.durationMinutes : 50}">
                    <span class="form-error" id="afDurationError"></span>
                </div>
                <div class="form-field">
                    <label for="afType">Tipo de sesión *</label>
                    <select id="afType">${typeOptions}</select>
                </div>
                <div class="form-field">
                    <label for="afStatus">Estado</label>
                    <select id="afStatus">${statusOptions}</select>
                </div>
                <div class="form-field">
                    <label for="afLocation">Ubicación</label>
                    <input type="text" id="afLocation" value="${a ? escapeHtml(a.location) : ''}" placeholder="Ej: Consultorio 1">
                </div>
                <div class="form-field full">
                    <label for="afNotes">Notas</label>
                    <textarea id="afNotes" placeholder="Observaciones relevantes…">${a ? escapeHtml(a.notes) : ''}</textarea>
                </div>
            </form>
        `;

        const actionsHTML = `
            <button class="btn" id="formCancelBtn">Cancelar</button>
            <button class="btn btn-primary" id="formSaveBtn">${isEdit ? 'Guardar cambios' : 'Crear cita'}</button>
        `;

        this._openModal(isEdit ? 'Editar cita' : 'Nueva cita', bodyHTML, actionsHTML);

        $('#formCancelBtn')?.addEventListener('click', () => this._closeModal());
        $('#formSaveBtn')?.addEventListener('click', () => this._handleSave(isEdit, id));

        const form = $('#apptForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this._handleSave(isEdit, id);
            });
        }
    }

    async _handleSave(isEdit, id) {
        const patientId = $('#afPatient')?.value || '';
        const title = $('#afTitle')?.value.trim() || '';
        const dateRaw = $('#afDate')?.value || '';
        const durationRaw = $('#afDuration')?.value;
        const durationMinutes = durationRaw !== '' ? Number(durationRaw) : 50;
        const type = $('#afType')?.value || 'Terapia Individual';
        const status = $('#afStatus')?.value || 'PENDIENTE';
        const location = $('#afLocation')?.value.trim() || '';
        const notes = $('#afNotes')?.value.trim() || '';

        // Clear errors
        ['afPatientError', 'afTitleError', 'afDateError', 'afDurationError'].forEach(eid => {
            const el = $(`#${eid}`);
            if (el) el.textContent = '';
        });

        let valid = true;
        if (!patientId) { $('#afPatientError').textContent = 'Selecciona un paciente'; valid = false; }
        if (!title) { $('#afTitleError').textContent = 'El título es obligatorio'; valid = false; }
        if (!dateRaw) { $('#afDateError').textContent = 'La fecha es obligatoria'; valid = false; }
        if (isNaN(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
            $('#afDurationError').textContent = 'Duración no válida (15-240 min)';
            valid = false;
        }
        if (!valid) return;

        const saveBtn = $('#formSaveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        }

        const appointmentDate = new Date(dateRaw).toISOString();

        const apptData = {
            patientId,
            title,
            appointmentDate,
            durationMinutes,
            type,
            status,
            location: location || null,
            notes: notes || null
        };

        try {
            let result;
            if (isEdit) {
                result = await appointmentService.update(id, apptData);
            } else {
                result = await appointmentService.create(apptData);
            }

            if (result.error) throw result.error;

            this._closeModal();
            window.app?.toast?.success(
                isEdit ? 'Cita actualizada' : 'Cita creada',
                isEdit ? 'Los datos se actualizaron correctamente.' : 'La cita se programó correctamente.'
            );
            await this._loadData();
        } catch (err) {
            console.error('Error al guardar cita:', err);
            window.app?.toast?.error('Error', 'No se pudo guardar: ' + (err.message || 'Intenta de nuevo'));
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = isEdit ? 'Guardar cambios' : 'Crear cita';
            }
        }
    }

    /* ===== DELETE ===== */

    async _confirmDelete(id) {
        const a = this.appointments.find(ap => ap.id === id);
        if (!a) return;

        const confirmed = await window.app?.confirm?.show({
            title: '¿Eliminar cita?',
            message: `Se eliminará la cita "${a.title}" de ${a.patientName}. Esta acción no se puede deshacer.`,
            confirmLabel: 'Eliminar',
            cancelLabel: 'Cancelar',
            danger: true
        });

        if (!confirmed) return;

        try {
            const { error } = await appointmentService.delete(id);
            if (error) throw error;
            window.app?.toast?.success('Eliminada', 'Cita eliminada correctamente.');
            await this._loadData();
        } catch (err) {
            console.error('Error al eliminar:', err);
            window.app?.toast?.error('Error', 'No se pudo eliminar: ' + (err.message || 'Intenta de nuevo'));
        }
    }

    /* ===== TOAST ===== */

    _showToast(message) {
        const toast = $('#apptsToast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2800);
    }
}
