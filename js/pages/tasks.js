import { tasksService } from '../services/tasksService.js';

const STATUS_LABELS = {
  PENDIENTE:    { label: 'Pendiente',    color: 'pending' },
  EN_PROGRESO:  { label: 'En progreso',  color: 'in-progress' },
  COMPLETADA:   { label: 'Completada',   color: 'completed' },
  VENCIDA:      { label: 'Vencida',      color: 'danger' },
  CANCELADA:    { label: 'Cancelada',    color: 'ghost' },
};

const PRIORITY_LABELS = {
  BAJA:    { label: 'Baja',    color: 'ghost' },
  MEDIA:   { label: 'Media',   color: 'info' },
  ALTA:    { label: 'Alta',    color: 'warn' },
  URGENTE: { label: 'Urgente', color: 'danger' },
};

const CATEGORIES = ['Seguimiento', 'Ejercicio', 'Diario', 'Cuestionario', 'Técnica', 'Lectura', 'Otra'];

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

function escapeHtml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

function _fmtDate(ds) {
  if (!ds) return '—';
  return new Date(ds + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
}

function _isOverdue(t) {
  if (!t.dueDate || t.status === 'COMPLETADA' || t.status === 'CANCELADA' || t.status === 'VENCIDA') return false;
  return new Date(t.dueDate + 'T23:59:59') < new Date();
}

function _daysLeft(t) {
  if (!t.dueDate || t.status === 'COMPLETADA' || t.status === 'CANCELADA') return null;
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.ceil((new Date(t.dueDate + 'T00:00:00') - now) / 86400000);
}

function _progressHTML(p) {
  return `<div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div><span style="font-size:12px;color:var(--dash-text-secondary);margin-left:6px;">${p}%</span>`;
}

export class TasksPage {
  constructor() {
    this._filters = { status: '', priority: '', search: '' };
    this.currentModal = null;
    this._onKeyDown = (e) => { if (e.key === 'Escape' && this.currentModal) this._closeModal(); };
    this._unsub = tasksService.onChange(() => this._load());
  }

  destroy() {
    this._unsub();
    document.removeEventListener('keydown', this._onKeyDown);
  }

  async render() {
    const pageBody = document.getElementById('pageBody');
    if (!pageBody) return;
    pageBody.innerHTML = `
      <div class="ambient-bg" aria-hidden="true"></div>
      <div class="patients-page">
        <div class="patients-header">
          <div class="patients-header-left">
            <h1 class="patients-title">Tareas terapéuticas</h1>
            <p class="patients-subtitle">Gestiona las tareas asignadas a tus pacientes.</p>
          </div>
          <div class="patients-header-actions">
            <button class="btn btn-primary" id="btnNewTask"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Nueva tarea</button>
          </div>
        </div>
        <div class="patients-stats" id="taskStats"></div>
        <div class="patients-toolbar">
          <input type="search" class="form-input" id="taskSearch" placeholder="Buscar tarea…" autocomplete="off">
          <select class="form-select" id="taskStatusFilter"><option value="">Todos los estados</option>
            ${Object.entries(STATUS_LABELS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
          </select>
          <select class="form-select" id="taskPriorityFilter"><option value="">Todas las prioridades</option>
            ${Object.entries(PRIORITY_LABELS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
          </select>
        </div>
        <div id="taskTable"></div>
        <div class="modal-overlay" id="taskModalOverlay">
          <div class="modal-box">
            <div class="modal-header">
              <h2 class="modal-title" id="taskModalTitle"></h2>
              <button class="modal-close" id="taskModalClose" aria-label="Cerrar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
            </div>
            <div class="modal-body" id="taskModalBody"></div>
          </div>
        </div>
      </div>`;

    $('#btnNewTask').addEventListener('click', () => this._openForm());
    $('#taskSearch').addEventListener('input', (e) => { this._filters.search = e.target.value; this._load(); });
    $('#taskStatusFilter').addEventListener('change', (e) => { this._filters.status = e.target.value; this._load(); });
    $('#taskPriorityFilter').addEventListener('change', (e) => { this._filters.priority = e.target.value; this._load(); });
    $('#taskModalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) this._closeModal(); });
    $('#taskModalClose').addEventListener('click', () => this._closeModal());
    document.addEventListener('keydown', this._onKeyDown);

    await this._load();
  }

  async _load() {
    try {
      const [stats, tasks] = await Promise.all([
        tasksService.getStats(),
        tasksService.list(this._filters),
      ]);
      $('#taskStats').innerHTML = `
        <div class="stat-card"><span class="stat-value">${stats.total}</span><span class="stat-label">Total</span></div>
        <div class="stat-card"><span class="stat-value stat-value--info">${stats.pending}</span><span class="stat-label">Pendientes</span></div>
        <div class="stat-card"><span class="stat-value stat-value--warn">${stats.inProgress}</span><span class="stat-label">En progreso</span></div>
        <div class="stat-card"><span class="stat-value stat-value--ok">${stats.completed}</span><span class="stat-label">Completadas</span></div>
        <div class="stat-card"><span class="stat-value stat-value--danger">${stats.overdue}</span><span class="stat-label">Vencidas</span></div>
        <div class="stat-card"><span class="stat-value">${stats.compliancePercent}%</span><span class="stat-label">Cumplimiento</span></div>`;
      this._renderTable(tasks);
    } catch (e) {
      console.error('TasksPage load error:', e);
      $('#taskTable').innerHTML = '<div class="patients-empty">Error al cargar tareas.</div>';
    }
  }

  _renderTable(tasks) {
    const wrap = $('#taskTable');
    if (!tasks.length) { wrap.innerHTML = '<div class="patients-empty">No hay tareas terapéuticas registradas.</div>'; return; }
    wrap.innerHTML = `
      <div class="table-responsive-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Título</th><th>Paciente</th><th>Estado</th><th>Prioridad</th><th>Vence</th><th>Progreso</th><th></th>
          </tr></thead>
          <tbody>${tasks.map(t => {
            const st = STATUS_LABELS[t.status] || STATUS_LABELS.PENDIENTE;
            const pr = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS.MEDIA;
            const overdue = _isOverdue(t);
            const dl = _daysLeft(t);
            let dueBadge = '—';
            if (t.dueDate && t.status !== 'COMPLETADA' && t.status !== 'CANCELADA') {
              if (overdue)        dueBadge = `<span class="status-pill danger">Vencida ${Math.abs(dl)}d</span>`;
              else if (dl === 0)  dueBadge = '<span class="status-pill in-progress">Hoy</span>';
              else if (dl <= 3)   dueBadge = `<span class="status-pill pending">${dl}d</span>`;
              else                dueBadge = _fmtDate(t.dueDate);
            }
            return `
              <tr class="${overdue ? 'row-overdue' : ''}" data-id="${t.id}">
                <td><strong>${escapeHtml(t.title || 'Sin título')}</strong></td>
                <td>${escapeHtml(t.patient || '—')}</td>
                <td><span class="status-pill ${st.color}">${st.label}</span></td>
                <td><span class="status-pill ${pr.color}">${pr.label}</span></td>
                <td>${dueBadge}</td>
                <td>${_progressHTML(t.progress)}</td>
                <td class="col-actions">
                  <button class="btn btn-sm" data-action="view" data-id="${t.id}">Ver</button>
                  <button class="btn btn-sm" data-action="edit" data-id="${t.id}">Editar</button>
                  ${t.status !== 'COMPLETADA' && t.status !== 'CANCELADA' ? `<button class="btn btn-sm btn-primary" data-action="complete" data-id="${t.id}">✓</button>` : ''}
                </td>
              </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;

    $$('#taskTable [data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const a = btn.dataset.action;
        if (a === 'view')     this._openDetail(id);
        else if (a === 'edit') this._openForm(id);
        else if (a === 'complete') this._handleTransition(id, 'COMPLETADA');
      });
    });
    $$('#taskTable tbody tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => this._openDetail(tr.dataset.id));
    });
  }

  /* ===== MODAL ===== */

  _openModal(title, bodyHTML) {
    this.currentModal = true;
    const overlay = $('#taskModalOverlay');
    $('#taskModalTitle').textContent = title;
    $('#taskModalBody').innerHTML = bodyHTML;
    if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
  }

  _closeModal() {
    this.currentModal = null;
    const overlay = $('#taskModalOverlay');
    if (overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
  }

  /* ===== DETALLE ===== */

  async _openDetail(id) {
    this._openModal('Cargando...', '<div class="patients-empty"><p>Cargando…</p></div>');
    try {
      const task = await tasksService.getById(id);
      if (!task) { this._openModal('Error', '<div class="patients-empty">Tarea no encontrada.</div>'); return; }

      const st = STATUS_LABELS[task.status] || STATUS_LABELS.PENDIENTE;
      const pr = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.MEDIA;
      const overdue = _isOverdue(task);
      const dl = _daysLeft(task);
      const transitions = tasksService.getValidTransitions ? tasksService.getValidTransitions(task.status) : [];
      const nextStatus = { PENDIENTE: 'EN_PROGRESO', EN_PROGRESO: 'COMPLETADA' };
      const nextLabel  = { PENDIENTE: 'Iniciar', EN_PROGRESO: 'Completar' };
      const nextBtn = nextStatus[task.status] ? `<button class="btn btn-primary" data-transition="${nextStatus[task.status]}">${nextLabel[task.status]}</button>` : '';

      const bodyHTML = `
        <div class="patient-detail-header">
          <div class="patient-detail-avatar">${(task.patient || '?')[0]?.toUpperCase() || '?'}</div>
          <div>
            <h3 class="patient-detail-name">${escapeHtml(task.title)}</h3>
            <span class="patient-detail-id">${escapeHtml(task.patient || 'Sin paciente')}</span>
          </div>
        </div>
        <div class="detail-section-title">Detalles</div>
        <div class="patient-detail-grid">
          <div class="detail-field"><span class="detail-label">Estado</span><span class="detail-value"><span class="status-pill ${st.color}">${st.label}</span></span></div>
          <div class="detail-field"><span class="detail-label">Prioridad</span><span class="detail-value"><span class="status-pill ${pr.color}">${pr.label}</span></span></div>
          <div class="detail-field"><span class="detail-label">Categoría</span><span class="detail-value">${escapeHtml(task.category)}</span></div>
          <div class="detail-field"><span class="detail-label">Asignada</span><span class="detail-value">${_fmtDate(task.assignedDate)}</span></div>
          <div class="detail-field"><span class="detail-label">Vence</span><span class="detail-value">${task.dueDate ? _fmtDate(task.dueDate) + (overdue ? ' <span style="color:var(--dash-pink);">(VENCIDA)</span>' : '') : 'Sin fecha límite'}</span></div>
          <div class="detail-field"><span class="detail-label">Completada</span><span class="detail-value">${task.completedAt ? new Date(task.completedAt).toLocaleString('es-ES') : '—'}</span></div>
        </div>
        <div class="detail-section-title">Progreso</div>
        <div style="display:flex;align-items:center;">${_progressHTML(task.progress)}</div>
        ${task.description ? `<div class="detail-section-title">Descripción</div><div class="detail-field full"><span class="detail-value">${escapeHtml(task.description)}</span></div>` : ''}
        ${task.notes ? `<div class="detail-section-title">Notas</div><div class="detail-field full"><span class="detail-value" style="opacity:.7">${escapeHtml(task.notes)}</span></div>` : ''}
        <div class="action-row">
          ${nextBtn}
          ${task.status !== 'COMPLETADA' && task.status !== 'CANCELADA' ? `<button class="btn" data-action-cancel>Cancelar tarea</button>` : ''}
          <button class="btn" data-action-edit>Editar</button>
          <button class="btn" id="modalCloseBtn">Cerrar</button>
        </div>`;

      this._openModal('Tarea: ' + task.title, bodyHTML);

      $('#taskModalBody [data-transition]')?.addEventListener('click', async (e) => {
        const newStatus = e.target.dataset.transition;
        e.target.disabled = true;
        e.target.textContent = 'Procesando…';
        try {
          if (newStatus === 'COMPLETADA') await tasksService.complete(task.id);
          else await tasksService.start(task.id);
          this._closeModal();
          await this._load();
        } catch (err) { alert('Error: ' + err.message); e.target.disabled = false; }
      });
      $('#taskModalBody [data-action-cancel]')?.addEventListener('click', async () => {
        try { await tasksService.cancel(task.id); this._closeModal(); await this._load(); }
        catch (err) { alert('Error: ' + err.message); }
      });
      $('#taskModalBody [data-action-edit]')?.addEventListener('click', () => { this._closeModal(); this._openForm(task.id); });
      $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
    } catch (err) {
      this._openModal('Error', '<div class="patients-empty">Error al cargar la tarea.</div><div class="action-row"><button class="btn btn-primary" id="modalCloseBtn">Cerrar</button></div>');
      $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
    }
  }

  /* ===== TRANSICIONES ===== */

  async _handleTransition(id, newStatus) {
    try {
      if (newStatus === 'COMPLETADA') await tasksService.complete(id);
      else await tasksService.start(id);
      await this._load();
    } catch (err) { alert('Error: ' + err.message); }
  }

  /* ===== FORMULARIO (CREAR / EDITAR) ===== */

  async _openForm(editId) {
    this._openModal('Cargando...', '<div class="patients-empty"><p>Cargando…</p></div>');
    try {
      const patients = await tasksService.getPatients();
      let task = null;
      if (editId) task = await tasksService.getById(editId);
      const isEdit = !!task;
      const title = isEdit ? 'Editar tarea' : 'Nueva tarea terapéutica';

      const patientOpts = patients.map(p => `<option value="${p.id}" ${task && task.patientId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
      const statusOpts = Object.entries(STATUS_LABELS).map(([k,v]) => `<option value="${k}" ${task && task.status === k ? 'selected' : ''}>${v.label}</option>`).join('');
      const priorityOpts = Object.entries(PRIORITY_LABELS).map(([k,v]) => `<option value="${k}" ${task && task.priority === k ? 'selected' : ''}>${v.label}</option>`).join('');
      const categoryOpts = CATEGORIES.map(c => `<option value="${c}" ${task && task.category === c ? 'selected' : ''}>${c}</option>`).join('');

      const bodyHTML = `
        <form class="form-grid" id="taskForm" novalidate>
          <div class="form-field" style="grid-column:1/-1;">
            <label for="tfTitle">Título *</label>
            <input type="text" id="tfTitle" value="${isEdit ? escapeHtml(task.title) : ''}" placeholder="Ej: Practicar respiración 4-7-8" required>
            <span class="form-error" id="tfTitleError"></span>
          </div>
          <div class="form-field"><label for="tfPatient">Paciente *</label><select id="tfPatient" required><option value="">Seleccionar…</option>${patientOpts}</select><span class="form-error" id="tfPatientError"></span></div>
          <div class="form-field"><label for="tfCategory">Categoría</label><select id="tfCategory">${categoryOpts}</select></div>
          <div class="form-field"><label for="tfPriority">Prioridad</label><select id="tfPriority">${priorityOpts}</select></div>
          <div class="form-field"><label for="tfDue">Fecha límite</label><input type="date" id="tfDue" value="${isEdit && task.dueDate ? task.dueDate : ''}"></div>
          ${isEdit ? `
            <div class="form-field"><label for="tfStatus">Estado</label><select id="tfStatus">${statusOpts}</select></div>
            <div class="form-field"><label for="tfProgress">Progreso (${task.progress || 0}%)</label><input type="range" id="tfProgress" min="0" max="100" value="${task.progress || 0}"></div>
          ` : ''}
          <div class="form-field" style="grid-column:1/-1;"><label for="tfDescription">Descripción</label><textarea id="tfDescription" rows="3" placeholder="Describe la tarea…">${isEdit ? escapeHtml(task.description || '') : ''}</textarea></div>
          <div class="form-field" style="grid-column:1/-1;"><label for="tfNotes">Notas internas</label><textarea id="tfNotes" rows="2" placeholder="Notas privadas del profesional…">${isEdit ? escapeHtml(task.notes || '') : ''}</textarea></div>
          <div class="action-row" style="grid-column:1/-1;">
            <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar cambios' : 'Crear tarea'}</button>
            <button type="button" class="btn" id="formCancelBtn">Cancelar</button>
          </div>
        </form>`;

      this._openModal(title, bodyHTML);

      const form = $('#taskForm');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        $('#tfTitleError').textContent = '';
        $('#tfPatientError').textContent = '';
        let valid = true;
        if (!$('#tfTitle').value.trim()) { $('#tfTitleError').textContent = 'El título es obligatorio'; valid = false; }
        if (!$('#tfPatient').value) { $('#tfPatientError').textContent = 'Selecciona un paciente'; valid = false; }
        if (!valid) return;

        const submitBtn = form.querySelector('[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Guardando…'; }

        const data = {
          title:       $('#tfTitle').value.trim(),
          patientId:   $('#tfPatient').value,
          category:    $('#tfCategory').value || 'Seguimiento',
          priority:    $('#tfPriority').value || 'MEDIA',
          dueDate:     $('#tfDue').value || null,
          description: $('#tfDescription').value.trim() || '',
          notes:       $('#tfNotes').value.trim() || '',
        };

        if (isEdit) {
          data.status = $('#tfStatus').value;
          data.progress = parseInt($('#tfProgress').value || '0');
          if (data.status === 'COMPLETADA' && task.status !== 'COMPLETADA') {
            data.completedAt = new Date().toISOString();
          }
        }

        try {
          if (isEdit) await tasksService.update(editId, data);
          else await tasksService.create(data);
          this._closeModal();
          await this._load();
        } catch (err) {
          alert('Error: ' + err.message);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = isEdit ? 'Guardar cambios' : 'Crear tarea'; }
        }
      });

      $('#formCancelBtn')?.addEventListener('click', () => this._closeModal());

      const range = $('#tfProgress');
      if (range) {
        range.addEventListener('input', () => {
          const lbl = range.closest('.form-field').querySelector('label');
          if (lbl) lbl.textContent = `Progreso (${range.value}%)`;
        });
      }
    } catch (err) {
      this._openModal('Error', '<div class="patients-empty">Error al cargar el formulario.</div><div class="action-row"><button class="btn btn-primary" id="modalCloseBtn">Cerrar</button></div>');
      $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
    }
  }
}
