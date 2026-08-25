// js/pages/patients.js
// Módulo de pacientes — Mente Serena.

import {
    getPatients, getPatientById, searchPatients, filterByStatus,
    getPatientStats, getTherapyTypes, getStatusLabel, getInitials,
    formatAppointmentDate, formatDateShort
} from '../services/patientService.js';

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
        shield: '<i class="fa-solid fa-shield-halved"></i>'
    };
    return map[name] || '';
}

export class PatientsPage {
    constructor() {
        this.container = null;
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.currentModal = null;
        this.editingPatient = null;
        this._onKeyDown = this._onKeyDown.bind(this);
    }

    render() {
        this.container = document.getElementById('pageBody');
        if (!this.container) return;

        const stats = getPatientStats();

        this.container.innerHTML = `
            <div class="patients-header">
                <div class="patients-header-left">
                    <h1 class="patients-title">Pacientes</h1>
                    <p class="patients-subtitle">Gestión integral de pacientes del consultorio</p>
                </div>
                <div class="patients-header-actions">
                    <button class="btn btn-primary" id="btnNewPatient">
                        ${icon('plus')} Nuevo paciente
                    </button>
                </div>
            </div>

            <div class="patients-stats">
                <div class="stat-card">
                    <span class="stat-label">Total</span>
                    <span class="stat-value accent">${stats.total}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Activos</span>
                    <span class="stat-value">${stats.active}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Nuevos</span>
                    <span class="stat-value">${stats.new}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Inactivos</span>
                    <span class="stat-value">${stats.inactive}</span>
                </div>
            </div>

            <div class="patients-toolbar">
                <div class="search-box">
                    <span class="search-icon">${icon('search')}</span>
                    <input type="text" id="patientSearch" placeholder="Buscar por nombre, ID, email o diagnóstico…" autocomplete="off">
                </div>
                <div class="filter-tabs" id="filterTabs">
                    <button class="filter-tab active" data-filter="all">Todos</button>
                    <button class="filter-tab" data-filter="active">Activos</button>
                    <button class="filter-tab" data-filter="new">Nuevos</button>
                    <button class="filter-tab" data-filter="inactive">Inactivos</button>
                </div>
            </div>

            <div class="patients-table-wrap">
                <table class="patients-table">
                    <thead>
                        <tr>
                            <th>Paciente</th>
                            <th>Estado</th>
                            <th>Tipo de terapia</th>
                            <th>Próxima cita</th>
                            <th style="width:100px">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="patientsTableBody"></tbody>
                </table>
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

        this._renderTable();
        this._bindEvents();
    }

    destroy() {
        document.removeEventListener('keydown', this._onKeyDown);
        this.container = null;
    }

    /* ===== TABLE RENDERING ===== */
    _renderTable() {
        const tbody = $('#patientsTableBody');
        if (!tbody) return;

        let patients = this.searchQuery
            ? searchPatients(this.searchQuery)
            : filterByStatus(this.currentFilter);

        if (patients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="patients-empty">
                            <i class="fa-solid fa-user-slash"></i>
                            <p>No se encontraron pacientes</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = patients.map((p, i) => `
            <tr data-id="${p.id}">
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar ${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${getInitials(p.name)}</div>
                        <div>
                            <div class="patient-name">${p.name}</div>
                            <div class="patient-id">${p.id}</div>
                        </div>
                    </div>
                </td>
                <td><span class="status-badge ${p.status}">${getStatusLabel(p.status)}</span></td>
                <td><span class="therapy-tag">${p.therapyType}</span></td>
                <td><span class="next-appt">${formatAppointmentDate(p.nextAppointment)}</span></td>
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

    /* ===== EVENT BINDING ===== */
    _bindEvents() {
        const search = $('#patientSearch');
        if (search) {
            let debounce;
            search.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    this.searchQuery = search.value;
                    this._renderTable();
                }, 250);
            });
        }

        const tabs = $('#filterTabs');
        if (tabs) {
            tabs.addEventListener('click', (e) => {
                const tab = e.target.closest('.filter-tab');
                if (!tab) return;
                $$('.filter-tab', tabs).forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentFilter = tab.dataset.filter;
                this.searchQuery = '';
                const searchInput = $('#patientSearch');
                if (searchInput) searchInput.value = '';
                this._renderTable();
            });
        }

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

        const newBtn = $('#btnNewPatient');
        if (newBtn) newBtn.addEventListener('click', () => this._openForm());

        const overlay = $('#patientModalOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this._closeModal();
            });
        }

        const closeBtn = $('#patientModalClose');
        if (closeBtn) closeBtn.addEventListener('click', () => this._closeModal());

        document.addEventListener('keydown', this._onKeyDown);
    }

    _onKeyDown(e) {
        if (e.key === 'Escape' && this.currentModal) this._closeModal();
    }

    /* ===== MODAL MANAGEMENT ===== */
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

    /* ===== DETAIL VIEW ===== */
    _openDetail(id) {
        const p = getPatientById(id);
        if (!p) return;

        const bodyHTML = `
            <div class="patient-detail-header">
                <div class="patient-detail-avatar">${getInitials(p.name)}</div>
                <div>
                    <h3 class="patient-detail-name">${p.name}</h3>
                    <span class="patient-detail-id">${p.id}</span>
                </div>
            </div>
            <div class="patient-detail-grid">
                <div class="detail-field">
                    <span class="detail-label">${icon('mail')} Email</span>
                    <span class="detail-value">${p.email}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">${icon('phone')} Teléfono</span>
                    <span class="detail-value">${p.phone}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Edad</span>
                    <span class="detail-value">${p.age} años</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Género</span>
                    <span class="detail-value">${p.gender}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">${icon('heartbeat')} Tipo de terapia</span>
                    <span class="detail-value"><span class="therapy-tag">${p.therapyType}</span></span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Estado</span>
                    <span class="detail-value"><span class="status-badge ${p.status}">${getStatusLabel(p.status)}</span></span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">${icon('calendar')} Próxima cita</span>
                    <span class="detail-value">${formatAppointmentDate(p.nextAppointment)}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Inicio de tratamiento</span>
                    <span class="detail-value">${formatDateShort(p.startDate)}</span>
                </div>
                <hr class="detail-divider">
                <div class="detail-field full">
                    <span class="detail-label">${icon('shield')} Diagnóstico</span>
                    <span class="detail-value">${p.diagnosis}</span>
                </div>
                <div class="detail-field full">
                    <span class="detail-label">${icon('note')} Notas clínicas</span>
                    <span class="detail-value">${p.notes}</span>
                </div>
                <div class="detail-field full">
                    <span class="detail-label">${icon('users')} Contacto de emergencia</span>
                    <span class="detail-value">${p.emergencyContact}</span>
                </div>
            </div>
        `;

        const actionsHTML = `
            <button class="btn" id="modalEditBtn">${icon('pencil')} Editar</button>
            <button class="btn btn-primary" id="modalCloseBtn">Cerrar</button>
        `;

        this._openModal(p.name, bodyHTML, actionsHTML);

        const editBtn = $('#modalEditBtn');
        if (editBtn) editBtn.addEventListener('click', () => { this._closeModal(); this._openForm(id); });

        const closeBtn = $('#modalCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this._closeModal());
    }

    /* ===== FORM (NEW / EDIT) ===== */
    _openForm(id) {
        const isEdit = !!id;
        const p = isEdit ? getPatientById(id) : null;
        this.editingPatient = p;

        const therapyOptions = getTherapyTypes()
            .map(t => `<option value="${t}" ${p && p.therapyType === t ? 'selected' : ''}>${t}</option>`)
            .join('');

        const bodyHTML = `
            <form class="form-grid" id="patientForm">
                <div class="form-field">
                    <label for="pfName">Nombre completo</label>
                    <input type="text" id="pfName" value="${p ? p.name : ''}" required placeholder="Nombre y apellidos">
                </div>
                <div class="form-field">
                    <label for="pfEmail">Email</label>
                    <input type="email" id="pfEmail" value="${p ? p.email : ''}" required placeholder="correo@ejemplo.com">
                </div>
                <div class="form-field">
                    <label for="pfPhone">Teléfono</label>
                    <input type="tel" id="pfPhone" value="${p ? p.phone : ''}" placeholder="+52 55 0000 0000">
                </div>
                <div class="form-field">
                    <label for="pfAge">Edad</label>
                    <input type="number" id="pfAge" value="${p ? p.age : ''}" min="1" max="120" placeholder="28">
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
                    <label for="pfTherapy">Tipo de terapia</label>
                    <select id="pfTherapy">${therapyOptions}</select>
                </div>
                <div class="form-field full">
                    <label for="pfDiagnosis">Diagnóstico</label>
                    <input type="text" id="pfDiagnosis" value="${p ? p.diagnosis : ''}" placeholder="Diagnóstico principal">
                </div>
                <div class="form-field full">
                    <label for="pfNotes">Notas clínicas</label>
                    <textarea id="pfNotes" placeholder="Observaciones relevantes…">${p ? p.notes : ''}</textarea>
                </div>
                <div class="form-field full">
                    <label for="pfEmergency">Contacto de emergencia</label>
                    <input type="text" id="pfEmergency" value="${p ? p.emergencyContact : ''}" placeholder="Nombre — Teléfono">
                </div>
            </form>
        `;

        const actionsHTML = `
            <button class="btn" id="formCancelBtn">Cancelar</button>
            <button class="btn btn-primary" id="formSaveBtn">${isEdit ? 'Guardar cambios' : 'Crear paciente'}</button>
        `;

        this._openModal(isEdit ? 'Editar paciente' : 'Nuevo paciente', bodyHTML, actionsHTML);

        const cancelBtn = $('#formCancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this._closeModal());

        const saveBtn = $('#formSaveBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => this._handleSave(isEdit, id));

        const form = $('#patientForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this._handleSave(isEdit, id);
            });
        }
    }

    _handleSave(isEdit, id) {
        const name = $('#pfName')?.value.trim();
        const email = $('#pfEmail')?.value.trim();
        if (!name || !email) {
            this._showToast('Completa nombre y email');
            return;
        }

        this._closeModal();
        this._showToast(isEdit ? 'Paciente actualizado correctamente' : 'Paciente creado correctamente');
        this._renderTable();
    }

    /* ===== DELETE ===== */
    _confirmDelete(id) {
        const p = getPatientById(id);
        if (!p) return;

        const bodyHTML = `
            <div style="text-align:center; padding: 12px 0;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; color:var(--dash-pink); margin-bottom:12px; display:block;"></i>
                <p style="margin:0 0 8px; font-size:0.95rem; color:var(--dash-text-primary);">
                    ¿Eliminar a <strong>${p.name}</strong>?
                </p>
                <p style="margin:0; font-size:0.82rem; color:var(--dash-text-secondary);">
                    Esta acción no se puede deshacer. Se eliminarán todos los datos asociados.
                </p>
            </div>
        `;

        const actionsHTML = `
            <button class="btn" id="deleteCancelBtn">Cancelar</button>
            <button class="btn btn-danger" id="deleteConfirmBtn">${icon('trash')} Eliminar</button>
        `;

        this._openModal('Confirmar eliminación', bodyHTML, actionsHTML);

        const cancelBtn = $('#deleteCancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this._closeModal());

        const confirmBtn = $('#deleteConfirmBtn');
        if (confirmBtn) confirmBtn.addEventListener('click', () => {
            this._closeModal();
            this._showToast('Paciente eliminado');
            this._renderTable();
        });
    }

    /* ===== TOAST ===== */
    _showToast(message) {
        const toast = $('#patientsToast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2800);
    }
}
