// js/pages/patients.js
// Módulo de pacientes — Página completa con CRUD real.

import { patientService, THERAPY_TYPES, STATUS_LABELS } from '../services/patientsService.js';

const AVATAR_COLORS = ['bg-violet', 'bg-blue', 'bg-pink'];

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
        user: '<i class="fa-solid fa-user"></i>',
        phone: '<i class="fa-solid fa-phone"></i>',
        mail: '<i class="fa-solid fa-envelope"></i>',
        calendar: '<i class="fa-solid fa-calendar-days"></i>',
        heartbeat: '<i class="fa-solid fa-heart-pulse"></i>',
        note: '<i class="fa-solid fa-note-sticky"></i>',
        users: '<i class="fa-solid fa-users"></i>',
        shield: '<i class="fa-solid fa-shield-halved"></i>',
        triangle: '<i class="fa-solid fa-triangle-exclamation"></i>',
        sort: '<i class="fa-solid fa-arrow-down-wide-short"></i>'
    };
    return map[name] || '';
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatDate(dateStr) {
    if (!dateStr) return 'Sin programar';
    const d = new Date(dateStr);
    if (isNaN(d)) return 'Sin programar';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toISOString().split('T')[0];
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function skeletonTable(rows = 5) {
    return `<tr><td colspan="7"><div class="patients-loading">
        ${Array.from({ length: rows }).map(() => `
            <div class="skeleton-row">
                <div class="skel-avatar"></div>
                <div class="skel-lines"><div class="skel-line w60"></div><div class="skel-line w40"></div></div>
                <div class="skel-btn"></div><div class="skel-btn"></div><div class="skel-btn"></div>
            </div>
        `).join('')}
    </div></td></tr>`;
}

export class PatientsPage {
    constructor() {
        this.container = null;
        this.currentStatusFilter = 'all';
        this.currentTherapyFilter = 'all';
        this.searchQuery = '';
        this.currentModal = null;
        this.editingPatient = null;
        this.patients = [];
        this.stats = { total: 0, active: 0, new: 0, inactive: 0, upcomingAppointments: 0 };
        this.loading = true;
        this.error = null;
        this._onKeyDown = this._onKeyDown.bind(this);
        this._debounceTimer = null;
        this._unsubscribers = [];
    }

    async render() {
        this.container = document.getElementById('pageBody');
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="ambient-bg" aria-hidden="true"></div>
            <div class="patients-page">
                <div class="patients-header">
                    <div class="patients-header-left">
                        <h1 class="patients-title">Pacientes</h1>
                        <p class="patients-subtitle">Gestiona y realiza seguimiento de tus pacientes.</p>
                    </div>
                    <div class="patients-header-actions">
                        <button class="btn btn-primary" id="btnNewPatient">
                            ${icon('plus')} Nuevo paciente
                        </button>
                    </div>
                </div>

                <div class="patients-stats" id="patientsStats">
                    <div class="stat-card"><span class="stat-label">Total</span><span class="stat-value accent">—</span></div>
                    <div class="stat-card"><span class="stat-label">Activos</span><span class="stat-value">—</span></div>
                    <div class="stat-card"><span class="stat-label">Nuevos</span><span class="stat-value">—</span></div>
                    <div class="stat-card"><span class="stat-label">Próximas citas</span><span class="stat-value">—</span></div>
                </div>

                <div class="patients-toolbar">
                    <div class="search-box">
                        <span class="search-icon">${icon('search')}</span>
                        <input type="text" id="patientSearch" placeholder="Buscar por nombre, ID, email o teléfono…" autocomplete="off">
                    </div>
                    <div class="filter-group">
                        <div class="filter-tabs" id="statusFilterTabs">
                            <button class="filter-tab active" data-filter="all">Todos</button>
                            <button class="filter-tab" data-filter="active">Activos</button>
                            <button class="filter-tab" data-filter="new">Nuevos</button>
                            <button class="filter-tab" data-filter="inactive">Inactivos</button>
                        </div>
                        <select id="therapyFilter" class="therapy-filter-select">
                            <option value="all">Todas las terapias</option>
                            ${THERAPY_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="patients-table-wrap">
                    <table class="patients-table">
                        <thead>
                            <tr>
                                <th>Paciente</th>
                                <th>ID</th>
                                <th>Edad</th>
                                <th>Terapia</th>
                                <th>Estado</th>
                                <th>Próxima cita</th>
                                <th style="width:120px">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="patientsTableBody">${skeletonTable()}</tbody>
                    </table>
                </div>
            </div>

            <div class="patient-modal-overlay" id="patientModalOverlay">
                <div class="patient-modal" id="patientModal">
                    <div class="modal-header">
                        <h2 id="patientModalTitle"></h2>
                        <button class="modal-close" id="patientModalClose">${icon('x')}</button>
                    </div>
                    <div class="modal-body" id="patientModalBody"></div>
                    <div class="modal-actions" id="patientModalActions"></div>
                </div>
            </div>

            <div class="patients-toast" id="patientsToast"></div>
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
            const [patientsResult, statsResult] = await Promise.all([
                patientService.getAll({
                    status: this.currentStatusFilter,
                    therapyType: this.currentTherapyFilter,
                    search: this.searchQuery || undefined
                }),
                patientService.getStats()
            ]);

            if (patientsResult.error) throw patientsResult.error;
            if (statsResult.error) throw statsResult.error;

            this.patients = patientsResult.data || [];
            this.stats = statsResult.data;
            this._renderStats();
            this._renderTable();
        } catch (err) {
            console.error('Error al cargar pacientes:', err);
            this.error = err.message || 'Error al cargar datos';
            this._renderError();
        } finally {
            this.loading = false;
        }
    }

    _renderStats() {
        const el = $('#patientsStats');
        if (!el) return;
        el.innerHTML = `
            <div class="stat-card"><span class="stat-label">Total</span><span class="stat-value accent">${this.stats.total}</span></div>
            <div class="stat-card"><span class="stat-label">Activos</span><span class="stat-value">${this.stats.active}</span></div>
            <div class="stat-card"><span class="stat-label">Nuevos</span><span class="stat-value">${this.stats.new}</span></div>
            <div class="stat-card"><span class="stat-label">Próximas citas</span><span class="stat-value">${this.stats.upcomingAppointments}</span></div>
        `;
    }

    _renderTable() {
        const tbody = $('#patientsTableBody');
        if (!tbody) return;

        if (this.patients.length === 0) {
            const isSearch = this.searchQuery.length > 0;
            tbody.innerHTML = `
                <tr><td colspan="7">
                    <div class="patients-empty">
                        <i class="fa-solid fa-${isSearch ? 'magnifying-glass' : 'user-slash'}"></i>
                        <p>${isSearch ? 'No se encontraron pacientes con ese criterio' : 'No hay pacientes todavía.'}</p>
                        ${!isSearch ? '<p class="patients-empty-hint">Agrega tu primer paciente para comenzar.</p>' : ''}
                        ${!isSearch ? `<button class="btn btn-primary patients-empty-btn" id="emptyNewPatient">${icon('plus')} Nuevo paciente</button>` : ''}
                    </div>
                </td></tr>
            `;
            const emptyBtn = $('#emptyNewPatient');
            if (emptyBtn) emptyBtn.addEventListener('click', () => this._openForm());
            return;
        }

        tbody.innerHTML = this.patients.map((p, i) => `
            <tr data-id="${p.id}">
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar ${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${getInitials(p.name)}</div>
                        <div>
                            <div class="patient-name">${escapeHtml(p.name)}</div>
                        </div>
                    </div>
                </td>
                <td><span class="patient-id-text">${escapeHtml(p.id)}</span></td>
                <td><span class="patient-age-text">${p.age != null ? p.age + ' años' : '—'}</span></td>
                <td><span class="therapy-tag">${escapeHtml(p.therapyType)}</span></td>
                <td><span class="status-badge ${p.status}">${STATUS_LABELS[p.status] || p.status}</span></td>
                <td><span class="next-appt">${formatDate(p.nextAppointment)}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-action="view" data-id="${p.id}" title="Ver detalle">${icon('eye')}</button>
                        <button class="icon-btn" data-action="edit" data-id="${p.id}" title="Editar">${icon('pencil')}</button>
                        <button class="icon-btn danger" data-action="delete" data-id="${p.id}" title="Eliminar">${icon('trash')}</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    _renderError() {
        const tbody = $('#patientsTableBody');
        if (!tbody) return;
        tbody.innerHTML = `
            <tr><td colspan="7">
                <div class="patients-empty">
                    <i class="fa-solid fa-wifi" style="color:var(--dash-pink);"></i>
                    <p style="color:var(--dash-pink); margin-bottom:8px;">No pudimos completar la operación.</p>
                    <p style="font-size:0.82rem;">${escapeHtml(this.error)}</p>
                    <button class="btn btn-primary" style="margin-top:16px;" id="retryLoadBtn">Reintentar</button>
                </div>
            </td></tr>
        `;
        const retryBtn = $('#retryLoadBtn');
        if (retryBtn) retryBtn.addEventListener('click', () => this._loadData());
    }

    /* ===== EVENTS ===== */

    _bindEvents() {
        // Búsqueda
        const search = $('#patientSearch');
        if (search) {
            search.addEventListener('input', () => {
                clearTimeout(this._debounceTimer);
                this._debounceTimer = setTimeout(async () => {
                    this.searchQuery = search.value;
                    await this._loadData();
                }, 300);
            });
        }

        // Filtro de estado
        const statusTabs = $('#statusFilterTabs');
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

        // Filtro de terapia
        const therapySelect = $('#therapyFilter');
        if (therapySelect) {
            therapySelect.addEventListener('change', async () => {
                this.currentTherapyFilter = therapySelect.value;
                await this._loadData();
            });
        }

        // Acciones en tabla
        const tbody = $('#patientsTableBody');
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

        // Nuevo paciente
        const newBtn = $('#btnNewPatient');
        if (newBtn) newBtn.addEventListener('click', () => this._openForm());

        // Cerrar modal
        const overlay = $('#patientModalOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this._closeModal();
            });
        }

        const closeBtn = $('#patientModalClose');
        if (closeBtn) closeBtn.addEventListener('click', () => this._closeModal());

        document.addEventListener('keydown', this._onKeyDown);

        // Escuchar cambios del servicio (sincronización con dashboard)
        const unsub = patientService.onChange(() => {
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
        const overlay = $('#patientModalOverlay');
        const titleEl = $('#patientModalTitle');
        const body = $('#patientModalBody');
        const actions = $('#patientModalActions');

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
        this.editingPatient = null;
        const overlay = $('#patientModalOverlay');
        if (overlay) {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    /* ===== DETALLE ===== */

    async _openDetail(id) {
        this._openModal('Cargando...', '<div class="modal-loading"><div class="loading-orbit"><div class="ring"></div><div class="ring ring-2"></div><div class="core"></div></div></div>', '');

        const { data: p, error } = await patientService.getById(id);
        if (error || !p) {
            this._openModal('Error', '<div class="patients-empty"><p>No se pudo cargar el paciente</p></div>', '<button class="btn btn-primary" id="modalCloseBtn">Cerrar</button>');
            $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
            return;
        }

        const bodyHTML = `
            <div class="patient-detail-header">
                <div class="patient-detail-avatar">${getInitials(p.name)}</div>
                <div>
                    <h3 class="patient-detail-name">${escapeHtml(p.name)}</h3>
                    <span class="patient-detail-id">${escapeHtml(p.id)}</span>
                </div>
            </div>
            <div class="detail-section-title">Información personal</div>
            <div class="patient-detail-grid">
                <div class="detail-field">
                    <span class="detail-label">${icon('mail')} Email</span>
                    <span class="detail-value">${escapeHtml(p.email) || '—'}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">${icon('phone')} Teléfono</span>
                    <span class="detail-value">${escapeHtml(p.phone) || '—'}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Edad</span>
                    <span class="detail-value">${p.age != null ? p.age + ' años' : '—'}</span>
                </div>
            </div>
            <div class="detail-section-title">Información terapéutica</div>
            <div class="patient-detail-grid">
                <div class="detail-field">
                    <span class="detail-label">${icon('heartbeat')} Tipo de terapia</span>
                    <span class="detail-value"><span class="therapy-tag">${escapeHtml(p.therapyType)}</span></span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Estado</span>
                    <span class="detail-value"><span class="status-badge ${p.status}">${STATUS_LABELS[p.status] || p.status}</span></span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">${icon('calendar')} Próxima cita</span>
                    <span class="detail-value">${formatDate(p.nextAppointment)}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Registro</span>
                    <span class="detail-value">${formatDate(p.startDate)}</span>
                </div>
                <div class="detail-field full">
                    <span class="detail-label">${icon('note')} Notas</span>
                    <span class="detail-value">${escapeHtml(p.notes) || 'Sin notas'}</span>
                </div>
                <div class="detail-field full">
                    <span class="detail-label">${icon('users')} Contacto de emergencia</span>
                    <span class="detail-value">${escapeHtml(p.emergencyContact) || '—'}</span>
                </div>
            </div>
        `;

        const actionsHTML = `
            <button class="btn" id="modalEditBtn">${icon('pencil')} Editar</button>
            <button class="btn btn-primary" id="modalCloseBtn">Cerrar</button>
        `;

        this._openModal(p.name, bodyHTML, actionsHTML);

        $('#modalEditBtn')?.addEventListener('click', () => { this._closeModal(); this._openForm(id); });
        $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
    }

    /* ===== FORMULARIO (NUEVO / EDITAR) ===== */

    async _openForm(id) {
        const isEdit = !!id;
        let p = null;

        if (isEdit) {
            this._openModal('Cargando...', '<div class="modal-loading"><div class="loading-orbit"><div class="ring"></div><div class="ring ring-2"></div><div class="core"></div></div></div>', '');
            const { data, error } = await patientService.getById(id);
            if (error || !data) {
                this._showToast('Error al cargar paciente');
                this._closeModal();
                return;
            }
            p = data;
        }
        this.editingPatient = p;

        const therapyOptions = THERAPY_TYPES
            .map(t => `<option value="${t}" ${p && p.therapyType === t ? 'selected' : ''}>${t}</option>`)
            .join('');

        const statusOptions = Object.entries(STATUS_LABELS)
            .map(([val, label]) => `<option value="${val}" ${p && p.status === val ? 'selected' : ''}>${label}</option>`)
            .join('');

        const bodyHTML = `
            <form class="form-grid" id="patientForm" novalidate>
                <div class="form-field">
                    <label for="pfFirstName">Nombre *</label>
                    <input type="text" id="pfFirstName" value="${p ? escapeHtml(p.firstName) : ''}" required placeholder="Nombre">
                    <span class="form-error" id="pfFirstNameError"></span>
                </div>
                <div class="form-field">
                    <label for="pfLastName">Apellido *</label>
                    <input type="text" id="pfLastName" value="${p ? escapeHtml(p.lastName) : ''}" required placeholder="Apellido">
                    <span class="form-error" id="pfLastNameError"></span>
                </div>
                <div class="form-field">
                    <label for="pfAge">Edad</label>
                    <input type="number" id="pfAge" min="0" max="120" value="${p ? (p.age ?? '') : ''}" placeholder="Edad">
                    <span class="form-error" id="pfAgeError"></span>
                </div>
                <div class="form-field">
                    <label for="pfEmail">Email</label>
                    <input type="email" id="pfEmail" value="${p ? escapeHtml(p.email) : ''}" placeholder="correo@ejemplo.com">
                    <span class="form-error" id="pfEmailError"></span>
                </div>
                <div class="form-field">
                    <label for="pfPhone">Teléfono</label>
                    <input type="tel" id="pfPhone" value="${p ? escapeHtml(p.phone) : ''}" placeholder="+52 55 0000 0000">
                    <span class="form-error" id="pfPhoneError"></span>
                </div>
                <div class="form-field">
                    <label for="pfGender">Género</label>
                    <select id="pfGender">
                        <option value="">Seleccionar…</option>
                        <option value="Femenino" ${p && p.gender === 'Femenino' ? 'selected' : ''}>Femenino</option>
                        <option value="Masculino" ${p && p.gender === 'Masculino' ? 'selected' : ''}>Masculino</option>
                        <option value="Otro" ${p && p.gender === 'Otro' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-field">
                    <label for="pfTherapy">Tipo de terapia *</label>
                    <select id="pfTherapy">${therapyOptions}</select>
                    <span class="form-error" id="pfTherapyError"></span>
                </div>
                <div class="form-field">
                    <label for="pfStatus">Estado *</label>
                    <select id="pfStatus">${statusOptions}</select>
                    <span class="form-error" id="pfStatusError"></span>
                </div>
                <div class="form-field">
                    <label for="pfNextAppointment">Próxima cita</label>
                    <input type="datetime-local" id="pfNextAppointment" value="${p && p.nextAppointment ? formatDateInput(p.nextAppointment) + 'T' + (p.nextAppointment.split('T')[1] || '10:00') : ''}">
                </div>
                <div class="form-field full">
                    <label for="pfNotes">Notas</label>
                    <textarea id="pfNotes" placeholder="Observaciones relevantes…">${p ? escapeHtml(p.notes) : ''}</textarea>
                </div>
            </form>
        `;

        const actionsHTML = `
            <button class="btn" id="formCancelBtn">Cancelar</button>
            <button class="btn btn-primary" id="formSaveBtn">${isEdit ? 'Guardar cambios' : 'Crear paciente'}</button>
        `;

        this._openModal(isEdit ? 'Editar paciente' : 'Nuevo paciente', bodyHTML, actionsHTML);

        $('#formCancelBtn')?.addEventListener('click', () => this._closeModal());
        $('#formSaveBtn')?.addEventListener('click', () => this._handleSave(isEdit, id));

        const form = $('#patientForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this._handleSave(isEdit, id);
            });
        }
    }

    async _handleSave(isEdit, id) {
        const firstName = $('#pfFirstName')?.value.trim() || '';
        const lastName = $('#pfLastName')?.value.trim() || '';
        const ageRaw = $('#pfAge')?.value;
        const age = ageRaw !== '' && ageRaw != null ? Number(ageRaw) : null;
        const email = $('#pfEmail')?.value.trim() || '';
        const phone = $('#pfPhone')?.value.trim() || '';
        const gender = $('#pfGender')?.value || '';
        const therapyType = $('#pfTherapy')?.value || 'Terapia Individual';
        const status = $('#pfStatus')?.value || 'active';
        const nextAppointment = $('#pfNextAppointment')?.value || '';
        const notes = $('#pfNotes')?.value.trim() || '';

        const errorIds = ['pfFirstNameError', 'pfLastNameError', 'pfAgeError', 'pfEmailError', 'pfPhoneError', 'pfTherapyError', 'pfStatusError'];
        errorIds.forEach(eid => { const el = $(`#${eid}`); if (el) el.textContent = ''; });

        let valid = true;

        if (!firstName) {
            $('#pfFirstNameError').textContent = 'El nombre es obligatorio';
            valid = false;
        }
        if (!lastName) {
            $('#pfLastNameError').textContent = 'El apellido es obligatorio';
            valid = false;
        }
        if (age !== null && (isNaN(age) || age < 0 || age > 120)) {
            $('#pfAgeError').textContent = 'Edad no válida';
            valid = false;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            $('#pfEmailError').textContent = 'Email no válido';
            valid = false;
        }
        if (phone && phone.length < 7) {
            $('#pfPhoneError').textContent = 'Teléfono no válido';
            valid = false;
        }
        if (!therapyType) {
            $('#pfTherapyError').textContent = 'Selecciona un tipo de terapia';
            valid = false;
        }
        if (!status) {
            $('#pfStatusError').textContent = 'Selecciona un estado';
            valid = false;
        }

        if (!valid) return;

        const saveBtn = $('#formSaveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        }

        const patientData = {
            firstName,
            lastName,
            age,
            email: email || null,
            phone: phone || null,
            gender: gender || null,
            therapyType,
            status,
            diagnosis: null,
            nextAppointment: nextAppointment ? new Date(nextAppointment).toISOString() : null,
            notes: notes || null
        };

        try {
            let result;
            if (isEdit) {
                result = await patientService.update(id, patientData);
            } else {
                result = await patientService.create(patientData);
            }

            if (result.error) throw result.error;

            this._closeModal();
            window.app?.toast?.success(
                isEdit ? 'Paciente actualizado' : 'Paciente creado',
                isEdit ? 'Los datos se actualizaron correctamente.' : 'El paciente se registró correctamente.'
            );
            await this._loadData();
        } catch (err) {
            console.error('Error al guardar paciente:', err);
            window.app?.toast?.error('Error', 'No se pudo guardar: ' + (err.message || 'Intenta de nuevo'));
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = isEdit ? 'Guardar cambios' : 'Crear paciente';
            }
        }
    }

    /* ===== ELIMINAR ===== */

    async _confirmDelete(id) {
        const p = this.patients.find(pt => pt.id === id);
        if (!p) return;

        const confirmed = await window.app?.confirm?.show({
            title: '¿Eliminar paciente?',
            message: `Se eliminará a ${p.name} del listado. Esta acción no se puede deshacer.`,
            confirmLabel: 'Eliminar',
            cancelLabel: 'Cancelar',
            danger: true
        });

        if (!confirmed) return;

        try {
            const { error } = await patientService.delete(id);
            if (error) throw error;
            window.app?.toast?.success('Eliminado', 'Paciente eliminado correctamente.');
            await this._loadData();
        } catch (err) {
            console.error('Error al eliminar:', err);
            window.app?.toast?.error('Error', 'No se pudo eliminar: ' + (err.message || 'Intenta de nuevo'));
        }
    }

    /* ===== TOAST LOCAL ===== */

    _showToast(message) {
        const toast = $('#patientsToast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2800);
    }
}
