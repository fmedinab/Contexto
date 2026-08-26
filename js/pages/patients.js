// js/pages/patients.js
// Módulo de pacientes — Conexión real a Supabase.

import { patientsService } from '../services/patientsService.js';

const THERAPY_TYPES = ['Terapia Individual', 'Terapia de Pareja', 'Evaluación Inicial', 'Terapia Familiar', 'Terapia de Grupo'];
const STATUS_LABELS = { active: 'Activo', inactive: 'Inactivo', new: 'Nuevo' };
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
        wifi: '<i class="fa-solid fa-wifi"></i>'
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

function formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Mapea snake_case (BD) → camelCase (UI)
function mapPatient(p) {
    return {
        id: p.id,
        name: p.full_name,
        email: p.email || '',
        phone: p.phone || '',
        age: p.age || '',
        gender: p.gender || '',
        therapyType: p.therapy_type,
        status: p.status,
        diagnosis: p.diagnosis || '',
        notes: p.notes || '',
        emergencyContact: p.emergency_contact || '',
        startDate: p.start_date,
        nextAppointment: p.next_appointment,
        createdAt: p.created_at
    };
}

// Mapea camelCase (UI) → snake_case (BD)
function mapToDB(data) {
    return {
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        age: data.age ? parseInt(data.age, 10) : null,
        gender: data.gender || null,
        therapy_type: data.therapy_type,
        status: data.status,
        diagnosis: data.diagnosis || null,
        notes: data.notes || null,
        emergency_contact: data.emergency_contact || null,
        next_appointment: data.next_appointment || null
    };
}

function skeletonTable(rows = 5) {
    return `<tr>${'<td colspan="5">'.repeat(1)}<div class="patients-loading">
        ${Array.from({ length: rows }).map(() => `
            <div class="skeleton-row">
                <div class="skel-avatar"></div>
                <div class="skel-lines"><div class="skel-line w60"></div><div class="skel-line w40"></div></div>
                <div class="skel-btn"></div>
                <div class="skel-btn"></div>
                <div class="skel-btn"></div>
            </div>
        `).join('')}
    </div></td></tr>`;
}

export class PatientsPage {
    constructor() {
        this.container = null;
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.currentModal = null;
        this.editingPatient = null;
        this.patients = [];
        this.stats = { total: 0, active: 0, inactive: 0, new: 0 };
        this.loading = true;
        this.error = null;
        this._onKeyDown = this._onKeyDown.bind(this);
        this._debounceTimer = null;
    }

    async render() {
        this.container = document.getElementById('pageBody');
        if (!this.container) return;

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

            <div class="patients-stats" id="patientsStats">
                <div class="stat-card"><span class="stat-label">Total</span><span class="stat-value accent">—</span></div>
                <div class="stat-card"><span class="stat-label">Activos</span><span class="stat-value">—</span></div>
                <div class="stat-card"><span class="stat-label">Nuevos</span><span class="stat-value">—</span></div>
                <div class="stat-card"><span class="stat-label">Inactivos</span><span class="stat-value">—</span></div>
            </div>

            <div class="patients-toolbar">
                <div class="search-box">
                    <span class="search-icon">${icon('search')}</span>
                    <input type="text" id="patientSearch" placeholder="Buscar por nombre o email…" autocomplete="off">
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
                    <tbody id="patientsTableBody">${skeletonTable()}</tbody>
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

        this._bindEvents();
        await this._loadData();
    }

    destroy() {
        document.removeEventListener('keydown', this._onKeyDown);
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this.container = null;
    }

    /* ===== DATA LOADING ===== */
    async _loadData() {
        this.loading = true;
        this.error = null;

        try {
            const [patientsResult, statsResult] = await Promise.all([
                patientsService.getAll({
                    status: this.currentFilter,
                    search: this.searchQuery || undefined
                }),
                patientsService.getStats()
            ]);

            if (patientsResult.error) throw patientsResult.error;
            if (statsResult.error) throw statsResult.error;

            this.patients = (patientsResult.data || []).map(mapPatient);
            this.stats = statsResult.data;
            this._renderStats();
            this._renderTable();
        } catch (err) {
            console.error('Error al cargar pacientes:', err);
            this.error = err.message || 'Error al conectar con el servidor';
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
            <div class="stat-card"><span class="stat-label">Inactivos</span><span class="stat-value">${this.stats.inactive}</span></div>
        `;
    }

    _renderTable() {
        const tbody = $('#patientsTableBody');
        if (!tbody) return;

        if (this.patients.length === 0) {
            const isSearch = this.searchQuery.length > 0;
            tbody.innerHTML = `
                <tr><td colspan="5">
                    <div class="patients-empty">
                        <i class="fa-solid fa-${isSearch ? 'magnifying-glass' : 'user-slash'}"></i>
                        <p>${isSearch ? 'No se encontraron pacientes con ese criterio' : 'No hay pacientes registrados'}</p>
                        ${!isSearch ? '<p style="font-size:0.8rem; margin-top:8px; opacity:0.6;">Comienza agregando tu primer paciente</p>' : ''}
                    </div>
                </td></tr>
            `;
            return;
        }

        tbody.innerHTML = this.patients.map((p, i) => `
            <tr data-id="${p.id}">
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar ${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${getInitials(p.name)}</div>
                        <div>
                            <div class="patient-name">${p.name}</div>
                            <div class="patient-id">${p.id.slice(0, 8)}</div>
                        </div>
                    </div>
                </td>
                <td><span class="status-badge ${p.status}">${STATUS_LABELS[p.status] || p.status}</span></td>
                <td><span class="therapy-tag">${p.therapyType}</span></td>
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
            <tr><td colspan="5">
                <div class="patients-empty">
                    <i class="fa-solid fa-wifi" style="color:var(--dash-pink);"></i>
                    <p style="color:var(--dash-pink); margin-bottom:8px;">Error de conexión</p>
                    <p style="font-size:0.82rem;">${this.error}</p>
                    <button class="btn btn-primary" style="margin-top:16px;" onclick="window.location.reload()">Reintentar</button>
                </div>
            </td></tr>
        `;
    }

    /* ===== EVENT BINDING ===== */
    _bindEvents() {
        const search = $('#patientSearch');
        if (search) {
            search.addEventListener('input', () => {
                clearTimeout(this._debounceTimer);
                this._debounceTimer = setTimeout(async () => {
                    this.searchQuery = search.value;
                    await this._loadData();
                }, 350);
            });
        }

        const tabs = $('#filterTabs');
        if (tabs) {
            tabs.addEventListener('click', async (e) => {
                const tab = e.target.closest('.filter-tab');
                if (!tab) return;
                $$('.filter-tab', tabs).forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentFilter = tab.dataset.filter;
                this.searchQuery = '';
                const searchInput = $('#patientSearch');
                if (searchInput) searchInput.value = '';
                await this._loadData();
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
    async _openDetail(id) {
        this._openModal('Cargando...', '<div class="modal-loading"><div class="loading-orbit"><div class="ring"></div><div class="ring ring-2"></div><div class="core"></div></div></div>', '');

        const { data: p, error } = await patientsService.getById(id);
        if (error || !p) {
            this._openModal('Error', '<div class="patients-empty"><p>No se pudo cargar el paciente</p></div>', '<button class="btn btn-primary" id="modalCloseBtn">Cerrar</button>');
            $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
            return;
        }

        const patient = mapPatient(p);

        const bodyHTML = `
            <div class="patient-detail-header">
                <div class="patient-detail-avatar">${getInitials(patient.name)}</div>
                <div>
                    <h3 class="patient-detail-name">${patient.name}</h3>
                    <span class="patient-detail-id">${patient.id.slice(0, 8)}</span>
                </div>
            </div>
            <div class="patient-detail-grid">
                <div class="detail-field">
                    <span class="detail-label">${icon('mail')} Email</span>
                    <span class="detail-value">${patient.email || '—'}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">${icon('phone')} Teléfono</span>
                    <span class="detail-value">${patient.phone || '—'}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Edad</span>
                    <span class="detail-value">${patient.age ? patient.age + ' años' : '—'}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Género</span>
                    <span class="detail-value">${patient.gender || '—'}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">${icon('heartbeat')} Tipo de terapia</span>
                    <span class="detail-value"><span class="therapy-tag">${patient.therapyType}</span></span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Estado</span>
                    <span class="detail-value"><span class="status-badge ${patient.status}">${STATUS_LABELS[patient.status] || patient.status}</span></span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">${icon('calendar')} Próxima cita</span>
                    <span class="detail-value">${formatDate(patient.nextAppointment)}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Inicio de tratamiento</span>
                    <span class="detail-value">${formatDateShort(patient.startDate)}</span>
                </div>
                <hr class="detail-divider">
                <div class="detail-field full">
                    <span class="detail-label">${icon('shield')} Diagnóstico</span>
                    <span class="detail-value">${patient.diagnosis || 'Sin diagnóstico registrado'}</span>
                </div>
                <div class="detail-field full">
                    <span class="detail-label">${icon('note')} Notas clínicas</span>
                    <span class="detail-value">${patient.notes || 'Sin notas'}</span>
                </div>
                <div class="detail-field full">
                    <span class="detail-label">${icon('users')} Contacto de emergencia</span>
                    <span class="detail-value">${patient.emergencyContact || '—'}</span>
                </div>
            </div>
        `;

        const actionsHTML = `
            <button class="btn" id="modalEditBtn">${icon('pencil')} Editar</button>
            <button class="btn btn-primary" id="modalCloseBtn">Cerrar</button>
        `;

        this._openModal(patient.name, bodyHTML, actionsHTML);

        $('#modalEditBtn')?.addEventListener('click', () => { this._closeModal(); this._openForm(id); });
        $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
    }

    /* ===== FORM (NEW / EDIT) ===== */
    async _openForm(id) {
        const isEdit = !!id;
        let p = null;

        if (isEdit) {
            this._openModal('Cargando...', '<div class="modal-loading"><div class="loading-orbit"><div class="ring"></div><div class="ring ring-2"></div><div class="core"></div></div></div>', '');
            const { data, error } = await patientsService.getById(id);
            if (error || !data) {
                this._showToast('Error al cargar paciente');
                this._closeModal();
                return;
            }
            p = mapPatient(data);
        }
        this.editingPatient = p;

        const therapyOptions = THERAPY_TYPES
            .map(t => `<option value="${t}" ${p && p.therapyType === t ? 'selected' : ''}>${t}</option>`)
            .join('');

        const bodyHTML = `
            <form class="form-grid" id="patientForm" novalidate>
                <div class="form-field">
                    <label for="pfName">Nombre completo *</label>
                    <input type="text" id="pfName" value="${p ? p.name : ''}" required placeholder="Nombre y apellidos">
                    <span class="form-error" id="pfNameError"></span>
                </div>
                <div class="form-field">
                    <label for="pfEmail">Email</label>
                    <input type="email" id="pfEmail" value="${p ? p.email : ''}" placeholder="correo@ejemplo.com">
                    <span class="form-error" id="pfEmailError"></span>
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
        const name = $('#pfName')?.value.trim();
        const email = $('#pfEmail')?.value.trim();
        const phone = $('#pfPhone')?.value.trim();
        const age = $('#pfAge')?.value;
        const gender = $('#pfGender')?.value;
        const therapyType = $('#pfTherapy')?.value;
        const diagnosis = $('#pfDiagnosis')?.value.trim();
        const notes = $('#pfNotes')?.value.trim();
        const emergency = $('#pfEmergency')?.value.trim();

        // Validación
        let valid = true;
        const nameError = $('#pfNameError');
        const emailError = $('#pfEmailError');
        if (nameError) nameError.textContent = '';
        if (emailError) emailError.textContent = '';

        if (!name) {
            if (nameError) nameError.textContent = 'El nombre es obligatorio';
            valid = false;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (emailError) emailError.textContent = 'Email no válido';
            valid = false;
        }
        if (!valid) return;

        const saveBtn = $('#formSaveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        }

        const patientData = {
            full_name: name,
            email: email || null,
            phone: phone || null,
            age: age ? parseInt(age, 10) : null,
            gender: gender || null,
            therapy_type: therapyType,
            status: this.editingPatient?.status || 'active',
            diagnosis: diagnosis || null,
            notes: notes || null,
            emergency_contact: emergency || null
        };

        try {
            let result;
            if (isEdit) {
                result = await patientsService.update(id, patientData);
            } else {
                result = await patientsService.create(patientData);
            }

            if (result.error) throw result.error;

            this._closeModal();
            this._showToast(isEdit ? 'Paciente actualizado correctamente' : 'Paciente creado correctamente');
            await this._loadData();
        } catch (err) {
            console.error('Error al guardar paciente:', err);
            this._showToast('Error al guardar: ' + (err.message || 'Intenta de nuevo'));
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = isEdit ? 'Guardar cambios' : 'Crear paciente';
            }
        }
    }

    /* ===== DELETE ===== */
    _confirmDelete(id) {
        const p = this.patients.find(pt => pt.id === id);
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

        $('#deleteCancelBtn')?.addEventListener('click', () => this._closeModal());
        $('#deleteConfirmBtn')?.addEventListener('click', async () => {
            const confirmBtn = $('#deleteConfirmBtn');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Eliminando...';
            }

            try {
                const { error } = await patientsService.delete(id);
                if (error) throw error;
                this._closeModal();
                this._showToast('Paciente eliminado correctamente');
                await this._loadData();
            } catch (err) {
                console.error('Error al eliminar:', err);
                this._showToast('Error al eliminar: ' + (err.message || 'Intenta de nuevo'));
                this._closeModal();
            }
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
