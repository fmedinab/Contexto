// js/pages/evaluations.js
// Módulo de evaluaciones — Página completa con CRUD real.

import {
    evaluationService,
    INSTRUMENTS,
    STATUS_LABELS,
    STATUS_COLORS,
    VALID_TRANSITIONS
} from '../services/evaluationsService.js';
import { patientService } from '../services/patientsService.js';

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

function icon(name) {
    const map = {
        search: '<i class="fa-solid fa-magnifying-glass"></i>',
        plus: '<i class="fa-solid fa-plus"></i>',
        eye: '<i class="fa-solid fa-eye"></i>',
        pencil: '<i class="fa-solid fa-pen"></i>',
        trash: '<i class="fa-solid fa-trash-can"></i>',
        x: '<i class="fa-solid fa-xmark"></i>',
        clipboard: '<i class="fa-solid fa-clipboard-list"></i>',
        play: '<i class="fa-solid fa-play"></i>',
        stop: '<i class="fa-solid fa-stop"></i>',
        check: '<i class="fa-solid fa-check"></i>',
        arrowRight: '<i class="fa-solid fa-arrow-right"></i>',
        sort: '<i class="fa-solid fa-arrow-down-wide-short"></i>'
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

function formatDateInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toISOString().split('T')[0];
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
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

const AVATAR_COLORS = ['bg-violet', 'bg-blue', 'bg-pink'];

export class EvaluationsPage {
    constructor() {
        this.container = null;
        this.currentStatusFilter = 'all';
        this.currentInstrumentFilter = 'all';
        this.searchQuery = '';
        this.currentModal = null;
        this.editingEvaluation = null;
        this.evaluations = [];
        this.patients = [];
        this.stats = { total: 0, pending: 0, inProgress: 0, completed: 0 };
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
                        <h1 class="patients-title">Evaluaciones</h1>
                        <p class="patients-subtitle">Administra los instrumentos psicológicos aplicados.</p>
                    </div>
                    <div class="patients-header-actions">
                        <button class="btn btn-primary" id="btnNewEvaluation">
                            ${icon('plus')} Nueva evaluación
                        </button>
                    </div>
                </div>

                <div class="patients-stats" id="evalStats">
                    <div class="stat-card"><span class="stat-label">Total</span><span class="stat-value accent">—</span></div>
                    <div class="stat-card"><span class="stat-label">Pendientes</span><span class="stat-value">—</span></div>
                    <div class="stat-card"><span class="stat-label">En progreso</span><span class="stat-value">—</span></div>
                    <div class="stat-card"><span class="stat-label">Completadas</span><span class="stat-value">—</span></div>
                </div>

                <div class="patients-toolbar">
                    <div class="search-box">
                        <span class="search-icon">${icon('search')}</span>
                        <input type="text" id="evalSearch" placeholder="Buscar por instrumento, notas…" autocomplete="off">
                    </div>
                    <div class="filter-group">
                        <div class="filter-tabs" id="evalStatusFilter">
                            <button class="filter-tab active" data-filter="all">Todas</button>
                            <button class="filter-tab" data-filter="PENDIENTE">Pendientes</button>
                            <button class="filter-tab" data-filter="EN_PROGRESO">En progreso</button>
                            <button class="filter-tab" data-filter="COMPLETADA">Completadas</button>
                            <button class="filter-tab" data-filter="CANCELADA">Canceladas</button>
                        </div>
                        <select id="evalInstrumentFilter" class="therapy-filter-select">
                            <option value="all">Todos los instrumentos</option>
                            ${INSTRUMENTS.map(i => `<option value="${i.name}">${i.code} — ${i.name}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="patients-table-wrap">
                    <table class="patients-table">
                        <thead>
                            <tr>
                                <th>Paciente</th>
                                <th>Instrumento</th>
                                <th>Fecha</th>
                                <th>Categoría</th>
                                <th>Estado</th>
                                <th>Resultado</th>
                                <th style="width:120px">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="evalTableBody">${skeletonTable()}</tbody>
                    </table>
                </div>
            </div>

            <div class="patient-modal-overlay" id="evalModalOverlay">
                <div class="patient-modal" id="evalModal">
                    <div class="modal-header">
                        <h2 id="evalModalTitle"></h2>
                        <button class="modal-close" id="evalModalClose">${icon('x')}</button>
                    </div>
                    <div class="modal-body" id="evalModalBody"></div>
                    <div class="modal-actions" id="evalModalActions"></div>
                </div>
            </div>

            <div class="patients-toast" id="evalToast"></div>
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
            const [evalsResult, statsResult, patientsResult] = await Promise.all([
                evaluationService.getAll({
                    status: this.currentStatusFilter,
                    instrument: this.currentInstrumentFilter,
                    search: this.searchQuery || undefined
                }),
                evaluationService.getStats(),
                patientService.getAll()
            ]);

            if (evalsResult.error) throw evalsResult.error;
            if (statsResult.error) throw statsResult.error;

            this.evaluations = evalsResult.data || [];
            this.stats = statsResult.data;
            this.patients = patientsResult.data || [];
            this._renderStats();
            this._renderTable();
        } catch (err) {
            console.error('Error al cargar evaluaciones:', err);
            this.error = err.message || 'Error al cargar datos';
            this._renderError();
        } finally {
            this.loading = false;
        }
    }

    _renderStats() {
        const el = $('#evalStats');
        if (!el) return;
        el.innerHTML = `
            <div class="stat-card"><span class="stat-label">Total</span><span class="stat-value accent">${this.stats.total}</span></div>
            <div class="stat-card"><span class="stat-label">Pendientes</span><span class="stat-value">${this.stats.pending}</span></div>
            <div class="stat-card"><span class="stat-label">En progreso</span><span class="stat-value">${this.stats.inProgress}</span></div>
            <div class="stat-card"><span class="stat-label">Completadas</span><span class="stat-value">${this.stats.completed}</span></div>
        `;
    }

    _renderTable() {
        const tbody = $('#evalTableBody');
        if (!tbody) return;

        if (this.evaluations.length === 0) {
            const isSearch = this.searchQuery.length > 0;
            tbody.innerHTML = `
                <tr><td colspan="7">
                    <div class="patients-empty">
                        <i class="fa-solid fa-${isSearch ? 'magnifying-glass' : 'clipboard'}"></i>
                        <p>${isSearch ? 'No se encontraron evaluaciones con ese criterio' : 'No hay evaluaciones todavía.'}</p>
                        ${!isSearch ? '<p class="patients-empty-hint">Registra tu primera evaluación para comenzar.</p>' : ''}
                        ${!isSearch ? `<button class="btn btn-primary patients-empty-btn" id="emptyNewEval">${icon('plus')} Nueva evaluación</button>` : ''}
                    </div>
                </td></tr>
            `;
            const emptyBtn = $('#emptyNewEval');
            if (emptyBtn) emptyBtn.addEventListener('click', () => this._openForm());
            return;
        }

        tbody.innerHTML = this.evaluations.map((e, i) => `
            <tr data-id="${e.id}">
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar ${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${getInitials(e.patientName)}</div>
                        <div>
                            <div class="patient-name">${escapeHtml(e.patientName)}</div>
                        </div>
                    </div>
                </td>
                <td><span class="therapy-tag">${escapeHtml(e.instrumentCode || e.instrumentName)}</span></td>
                <td><span class="next-appt">${formatDate(e.assessmentDate)}</span></td>
                <td><span class="therapy-tag">${escapeHtml(e.instrumentCategory)}</span></td>
                <td><span class="status-badge ${STATUS_COLORS[e.status] || 'amber'}">${STATUS_LABELS[e.status] || e.status}</span></td>
                <td><span class="patient-age-text">${e.resultScore != null ? e.resultScore : '—'}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-action="view" data-id="${e.id}" title="Ver detalle">${icon('eye')}</button>
                        <button class="icon-btn" data-action="edit" data-id="${e.id}" title="Editar">${icon('pencil')}</button>
                        ${evaluationService.canTransition(e.status, 'EN_PROGRESO') ? `<button class="icon-btn" data-action="start" data-id="${e.id}" title="Comenzar">${icon('play')}</button>` : ''}
                        ${evaluationService.canTransition(e.status, 'COMPLETADA') ? `<button class="icon-btn" data-action="complete" data-id="${e.id}" title="Completar">${icon('check')}</button>` : ''}
                        <button class="icon-btn danger" data-action="delete" data-id="${e.id}" title="Eliminar">${icon('trash')}</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    _renderError() {
        const tbody = $('#evalTableBody');
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
        const search = $('#evalSearch');
        if (search) {
            search.addEventListener('input', () => {
                clearTimeout(this._debounceTimer);
                this._debounceTimer = setTimeout(async () => {
                    this.searchQuery = search.value;
                    await this._loadData();
                }, 300);
            });
        }

        const statusTabs = $('#evalStatusFilter');
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

        const instrumentSelect = $('#evalInstrumentFilter');
        if (instrumentSelect) {
            instrumentSelect.addEventListener('change', async () => {
                this.currentInstrumentFilter = instrumentSelect.value;
                await this._loadData();
            });
        }

        const tbody = $('#evalTableBody');
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
                    else if (action === 'start') this._handleTransition(id, 'EN_PROGRESO');
                    else if (action === 'complete') this._handleTransition(id, 'COMPLETADA');
                    return;
                }
                const row = e.target.closest('tr[data-id]');
                if (row) this._openDetail(row.dataset.id);
            });
        }

        const newBtn = $('#btnNewEvaluation');
        if (newBtn) newBtn.addEventListener('click', () => this._openForm());

        const overlay = $('#evalModalOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this._closeModal();
            });
        }

        const closeBtn = $('#evalModalClose');
        if (closeBtn) closeBtn.addEventListener('click', () => this._closeModal());

        document.addEventListener('keydown', this._onKeyDown);

        const unsub = evaluationService.onChange(() => {
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
        const overlay = $('#evalModalOverlay');
        const titleEl = $('#evalModalTitle');
        const body = $('#evalModalBody');
        const actions = $('#evalModalActions');

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
        this.editingEvaluation = null;
        const overlay = $('#evalModalOverlay');
        if (overlay) {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    /* ===== DETALLE ===== */

    async _openDetail(id) {
        this._openModal('Cargando...', '<div class="modal-loading"><div class="loading-orbit"><div class="ring"></div><div class="ring ring-2"></div><div class="core"></div></div></div>', '');

        const { data: e, error } = await evaluationService.getById(id);
        if (error || !e) {
            this._openModal('Error', '<div class="patients-empty"><p>No se pudo cargar la evaluación</p></div>', '<button class="btn btn-primary" id="modalCloseBtn">Cerrar</button>');
            $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
            return;
        }

        const transitions = evaluationService.getValidTransitions(e.status);
        const transitionButtons = transitions.map(t => {
            const label = STATUS_LABELS[t] || t;
            const btnClass = t === 'COMPLETADA' ? 'btn btn-primary' : t === 'CANCELADA' ? 'btn btn-danger' : 'btn';
            return `<button class="${btnClass}" data-transition="${t}">${label}</button>`;
        }).join('');

        const bodyHTML = `
            <div class="patient-detail-header">
                <div class="patient-detail-avatar">${getInitials(e.patientName)}</div>
                <div>
                    <h3 class="patient-detail-name">${escapeHtml(e.patientName)}</h3>
                    <span class="patient-detail-id">${escapeHtml(e.id)}</span>
                </div>
            </div>
            <div class="detail-section-title">Instrumento</div>
            <div class="patient-detail-grid">
                <div class="detail-field full">
                    <span class="detail-label">${icon('clipboard')} Instrumento</span>
                    <span class="detail-value">${escapeHtml(e.instrumentName)}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Código</span>
                    <span class="detail-value"><span class="therapy-tag">${escapeHtml(e.instrumentCode)}</span></span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Categoría</span>
                    <span class="detail-value">${escapeHtml(e.instrumentCategory)}</span>
                </div>
            </div>
            <div class="detail-section-title">Evaluación</div>
            <div class="patient-detail-grid">
                <div class="detail-field">
                    <span class="detail-label">Fecha</span>
                    <span class="detail-value">${formatDate(e.assessmentDate)}</span>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Estado</span>
                    <span class="detail-value"><span class="status-badge ${STATUS_COLORS[e.status] || 'amber'}">${STATUS_LABELS[e.status] || e.status}</span></span>
                </div>
                ${e.resultScore != null ? `
                <div class="detail-field">
                    <span class="detail-label">Puntuación</span>
                    <span class="detail-value"><strong>${e.resultScore}</strong></span>
                </div>
                ` : ''}
                ${e.resultInterpretation ? `
                <div class="detail-field full">
                    <span class="detail-label">Interpretación</span>
                    <span class="detail-value">${escapeHtml(e.resultInterpretation)}</span>
                </div>
                ` : ''}
                ${e.startedAt ? `
                <div class="detail-field">
                    <span class="detail-label">Iniciada</span>
                    <span class="detail-value">${formatDate(e.startedAt)}</span>
                </div>
                ` : ''}
                ${e.completedAt ? `
                <div class="detail-field">
                    <span class="detail-label">Completada</span>
                    <span class="detail-value">${formatDate(e.completedAt)}</span>
                </div>
                ` : ''}
                ${e.notes ? `
                <div class="detail-field full">
                    <span class="detail-label">Notas</span>
                    <span class="detail-value">${escapeHtml(e.notes)}</span>
                </div>
                ` : ''}
            </div>
        `;

        const actionsHTML = `
            ${transitionButtons}
            <button class="btn" id="modalEditBtn">${icon('pencil')} Editar</button>
            <button class="btn btn-primary" id="modalCloseBtn">Cerrar</button>
        `;

        this._openModal(e.instrumentName, bodyHTML, actionsHTML);

        $('#modalEditBtn')?.addEventListener('click', () => { this._closeModal(); this._openForm(id); });
        $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());

        $$('[data-transition]', $('#evalModalBody')).forEach(btn => {
            btn.addEventListener('click', async () => {
                const newStatus = btn.dataset.transition;
                await this._handleTransition(id, newStatus);
                this._closeModal();
            });
        });
    }

    /* ===== FORMULARIO (NUEVO / EDITAR) ===== */

    async _openForm(id) {
        const isEdit = !!id;
        let e = null;

        if (isEdit) {
            this._openModal('Cargando...', '<div class="modal-loading"><div class="loading-orbit"><div class="ring"></div><div class="ring ring-2"></div><div class="core"></div></div></div>', '');
            const { data, error } = await evaluationService.getById(id);
            if (error || !data) {
                this._showToast('Error al cargar evaluación');
                this._closeModal();
                return;
            }
            e = data;
        }
        this.editingEvaluation = e;

        const patientOptions = this.patients
            .map(p => `<option value="${p.id}" ${e && e.patientId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
            .join('');

        const instrumentOptions = INSTRUMENTS
            .map(i => `<option value="${i.name}" data-code="${i.code}" data-category="${i.category}" ${e && e.instrumentName === i.name ? 'selected' : ''}>${i.code} — ${i.name}</option>`)
            .join('');

        const bodyHTML = `
            <form class="form-grid" id="evalForm" novalidate>
                <div class="form-field">
                    <label for="efPatient">Paciente *</label>
                    <select id="efPatient" required>
                        <option value="">Seleccionar paciente…</option>
                        ${patientOptions}
                    </select>
                    <span class="form-error" id="efPatientError"></span>
                </div>
                <div class="form-field">
                    <label for="efInstrument">Instrumento *</label>
                    <select id="efInstrument" required>
                        <option value="">Seleccionar instrumento…</option>
                        ${instrumentOptions}
                    </select>
                    <span class="form-error" id="efInstrumentError"></span>
                </div>
                <div class="form-field">
                    <label for="efDate">Fecha *</label>
                    <input type="date" id="efDate" value="${e ? formatDateInput(e.assessmentDate) : formatDateInput(new Date().toISOString())}" required>
                    <span class="form-error" id="efDateError"></span>
                </div>
                <div class="form-field">
                    <label for="efStatus">Estado</label>
                    <select id="efStatus">
                        ${Object.entries(STATUS_LABELS).map(([val, label]) => `<option value="${val}" ${e && e.status === val ? 'selected' : ''}>${label}</option>`).join('')}
                    </select>
                </div>
                <div class="form-field full">
                    <label for="efNotes">Notas</label>
                    <textarea id="efNotes" placeholder="Observaciones sobre la evaluación…">${e ? escapeHtml(e.notes) : ''}</textarea>
                </div>
            </form>
        `;

        const actionsHTML = `
            <button class="btn" id="formCancelBtn">Cancelar</button>
            <button class="btn btn-primary" id="formSaveBtn">${isEdit ? 'Guardar cambios' : 'Crear evaluación'}</button>
        `;

        this._openModal(isEdit ? 'Editar evaluación' : 'Nueva evaluación', bodyHTML, actionsHTML);

        $('#formCancelBtn')?.addEventListener('click', () => this._closeModal());
        $('#formSaveBtn')?.addEventListener('click', () => this._handleSave(isEdit, id));

        const form = $('#evalForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this._handleSave(isEdit, id);
            });
        }
    }

    async _handleSave(isEdit, id) {
        const patientId = $('#efPatient')?.value || '';
        const instrumentName = $('#efInstrument')?.value || '';
        const instrumentOption = $('#efInstrument')?.selectedOptions[0];
        const instrumentCode = instrumentOption?.dataset?.code || '';
        const instrumentCategory = instrumentOption?.dataset?.category || '';
        const assessmentDate = $('#efDate')?.value || '';
        const status = $('#efStatus')?.value || 'PENDIENTE';
        const notes = $('#efNotes')?.value.trim() || '';

        const errorIds = ['efPatientError', 'efInstrumentError', 'efDateError'];
        errorIds.forEach(eid => { const el = $(`#${eid}`); if (el) el.textContent = ''; });

        let valid = true;

        if (!patientId) {
            $('#efPatientError').textContent = 'Selecciona un paciente';
            valid = false;
        }
        if (!instrumentName) {
            $('#efInstrumentError').textContent = 'Selecciona un instrumento';
            valid = false;
        }
        if (!assessmentDate) {
            $('#efDateError').textContent = 'La fecha es obligatoria';
            valid = false;
        }

        if (!valid) return;

        const saveBtn = $('#formSaveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        }

        const evalData = {
            patientId,
            instrumentName,
            instrumentCode,
            instrumentCategory,
            assessmentDate,
            status,
            notes: notes || null
        };

        try {
            let result;
            if (isEdit) {
                result = await evaluationService.update(id, evalData);
            } else {
                result = await evaluationService.create(evalData);
            }

            if (result.error) throw result.error;

            this._closeModal();
            window.app?.toast?.success(
                isEdit ? 'Evaluación actualizada' : 'Evaluación creada',
                isEdit ? 'Los datos se actualizaron correctamente.' : 'La evaluación se registró correctamente.'
            );
            await this._loadData();
        } catch (err) {
            console.error('Error al guardar evaluación:', err);
            window.app?.toast?.error('Error', 'No se pudo guardar: ' + (err.message || 'Intenta de nuevo'));
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = isEdit ? 'Guardar cambios' : 'Crear evaluación';
            }
        }
    }

    /* ===== TRANSICIONES DE ESTADO ===== */

    async _handleTransition(id, newStatus) {
        const evalItem = this.evaluations.find(e => e.id === id);
        if (!evalItem) return;

        if (!evaluationService.canTransition(evalItem.status, newStatus)) return;

        const statusData = { status: newStatus };
        if (newStatus === 'EN_PROGRESO') statusData.startedAt = new Date().toISOString();
        if (newStatus === 'COMPLETADA') statusData.completedAt = new Date().toISOString();

        try {
            const { error } = await evaluationService.update(id, statusData);
            if (error) throw error;
            window.app?.toast?.success('Estado actualizado', `Evaluación marcada como ${STATUS_LABELS[newStatus] || newStatus}.`);
            await this._loadData();
        } catch (err) {
            console.error('Error al cambiar estado:', err);
            window.app?.toast?.error('Error', 'No se pudo actualizar el estado.');
        }
    }

    /* ===== ELIMINAR ===== */

    async _confirmDelete(id) {
        const e = this.evaluations.find(ev => ev.id === id);
        if (!e) return;

        const confirmed = await window.app?.confirm?.show({
            title: '¿Eliminar evaluación?',
            message: `Se eliminará la evaluación de ${e.instrumentName} para ${e.patientName}. Esta acción no se puede deshacer.`,
            confirmLabel: 'Eliminar',
            cancelLabel: 'Cancelar',
            danger: true
        });

        if (!confirmed) return;

        try {
            const { error } = await evaluationService.delete(id);
            if (error) throw error;
            window.app?.toast?.success('Eliminada', 'Evaluación eliminada correctamente.');
            await this._loadData();
        } catch (err) {
            console.error('Error al eliminar:', err);
            window.app?.toast?.error('Error', 'No se pudo eliminar: ' + (err.message || 'Intenta de nuevo'));
        }
    }

    /* ===== TOAST LOCAL ===== */

    _showToast(message) {
        const toast = $('#evalToast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2800);
    }
}
