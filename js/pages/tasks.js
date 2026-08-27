import { formatPersonName } from '../services/mockData.js';
import { patientsService } from '../services/patientsService.js';
import { tasksService } from '../services/tasksService.js';
import { showToast } from '../components/toast.js';
import { showModal, closeModal } from '../components/modal.js';

const STATUS_LABELS = {
  PENDIENTE:    { label: 'Pendiente',    class: 'badge badge--info',  icon: 'bi-hourglass-split' },
  EN_PROGRESO:  { label: 'En progreso',  class: 'badge badge--warn',  icon: 'bi-play-circle' },
  COMPLETADA:   { label: 'Completada',   class: 'badge badge--ok',    icon: 'bi-check-circle' },
  VENCIDA:      { label: 'Vencida',      class: 'badge badge--danger', icon: 'bi-exclamation-triangle' },
  CANCELADA:    { label: 'Cancelada',    class: 'badge badge--ghost', icon: 'bi-x-circle' },
};

const PRIORITY_LABELS = {
  BAJA:    { label: 'Baja',    class: 'badge badge--ghost',  icon: 'bi-arrow-down' },
  MEDIA:   { label: 'Media',   class: 'badge badge--info',   icon: 'bi-dash' },
  ALTA:    { label: 'Alta',    class: 'badge badge--warn',   icon: 'bi-arrow-up' },
  URGENTE: { label: 'Urgente', class: 'badge badge--danger', icon: 'bi-lightning' },
};

const CATEGORY_LABELS = {
  Seguimiento:  { label: 'Seguimiento',  icon: 'bi-clipboard-check' },
  Ejercicio:    { label: 'Ejercicio',    icon: 'bi-heart-pulse' },
  Diario:       { label: 'Diario',       icon: 'bi-journal-text' },
  Cuestionario: { label: 'Cuestionario', icon: 'bi-ui-checks-grid' },
  Técnica:      { label: 'Técnica',      icon: 'bi-tools' },
  Lectura:      { label: 'Lectura',      icon: 'bi-book' },
  Otra:         { label: 'Otra',         icon: 'bi-three-dots' },
};

function _dateDisplay(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
}

function _isOverdue(task) {
  if (!task.dueDate || task.status === 'COMPLETADA' || task.status === 'CANCELADA' || task.status === 'VENCIDA') return false;
  return new Date(task.dueDate + 'T23:59:59') < new Date();
}

function _daysUntilDue(task) {
  if (!task.dueDate || task.status === 'COMPLETADA' || task.status === 'CANCELADA') return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const due = new Date(task.dueDate + 'T00:00:00');
  return Math.ceil((due - now) / (1000*60*60*24));
}

// ── Stats cards ────────────────────────────────────────────
function _statsCardsHTML(stats) {
  return `
    <div class="stats">
      <div class="stat-card"><span class="stat-value">${stats.total}</span><span class="stat-label">Total</span></div>
      <div class="stat-card"><span class="stat-value stat-value--info">${stats.pending}</span><span class="stat-label">Pendientes</span></div>
      <div class="stat-card"><span class="stat-value stat-value--warn">${stats.inProgress}</span><span class="stat-label">En progreso</span></div>
      <div class="stat-card"><span class="stat-value stat-value--ok">${stats.completed}</span><span class="stat-label">Completadas</span></div>
      <div class="stat-card"><span class="stat-value stat-value--danger">${stats.overdue}</span><span class="stat-label">Vencidas</span></div>
      <div class="stat-card"><span class="stat-value stat-value--info">${stats.dueToday}</span><span class="stat-label">Vence hoy</span></div>
      <div class="stat-card"><span class="stat-value stat-value--info">${stats.compliancePercent}%</span><span class="stat-label">Cumplimiento</span></div>
    </div>`;
}

// ── Tabla ──────────────────────────────────────────────────
function _tasksTableHTML(tasks) {
  if (!tasks.length) return '<p class="empty-state">No hay tareas terapéuticas registradas.</p>';
  const rows = tasks.map(t => {
    const st = STATUS_LABELS[t.status] || STATUS_LABELS.PENDIENTE;
    const pr = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS.MEDIA;
    const ca = CATEGORY_LABELS[t.category] || CATEGORY_LABELS.Otra;
    const overdue = _isOverdue(t);
    const daysLeft = _daysUntilDue(t);
    let dueBadge = '';
    if (t.dueDate && t.status !== 'COMPLETADA' && t.status !== 'CANCELADA') {
      if (overdue)      dueBadge = `<span class="badge badge--danger">Vencida hace ${Math.abs(daysLeft)}d</span>`;
      else if (daysLeft === 0) dueBadge = `<span class="badge badge--warn">Vence hoy</span>`;
      else if (daysLeft <= 3)  dueBadge = `<span class="badge badge--info">Quedan ${daysLeft}d</span>`;
      else               dueBadge = `<span class="badge badge--ghost">${_dateDisplay(t.dueDate)}</span>`;
    }
    return `
      <tr class="${overdue ? 'row--overdue' : ''}" data-id="${t.id}">
        <td><strong>${t.title || 'Sin título'}</strong></td>
        <td>${t.patient || '—'}</td>
        <td><span class="badge badge--ghost"><i class="bi ${ca.icon}"></i> ${ca.label}</span></td>
        <td><span class="${st.class}"><i class="bi ${st.icon}"></i> ${st.label}</span></td>
        <td><span class="${pr.class}"><i class="bi ${pr.icon}"></i> ${pr.label}</span></td>
        <td>${dueBadge || '—'}</td>
        <td class="col-progress">
          <div class="progress-bar-wrap">
            <div class="progress-bar" style="width:${t.progress}%"></div>
            <span class="progress-bar-label">${t.progress}%</span>
          </div>
        </td>
        <td class="col-actions">
          <button class="icon-btn icon-btn--sm" data-action="detail" data-id="${t.id}" title="Ver detalle"><i class="bi bi-eye"></i></button>
          <button class="icon-btn icon-btn--sm" data-action="edit" data-id="${t.id}" title="Editar"><i class="bi bi-pencil"></i></button>
          ${t.status !== 'COMPLETADA' && t.status !== 'CANCELADA' ? `
            <button class="icon-btn icon-btn--sm icon-btn--success" data-action="complete" data-id="${t.id}" title="Marcar completada"><i class="bi bi-check-lg"></i></button>
          ` : ''}
        </td>
      </tr>`;
  }).join('');
  return `
    <div class="table-responsive-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Título</th><th>Paciente</th><th>Categoría</th><th>Estado</th><th>Prioridad</th><th>Vence</th><th>Progreso</th><th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── Create/Edit form ───────────────────────────────────────
function _taskFormHTML(task, patients) {
  const isEdit = !!task;
  const title = isEdit ? 'Editar tarea' : 'Nueva tarea terapéutica';
  const statusOpts = Object.entries(STATUS_LABELS).map(([k,v]) =>
    `<option value="${k}" ${task && task.status === k ? 'selected' : ''}>${v.label}</option>`
  ).join('');
  const priorityOpts = Object.entries(PRIORITY_LABELS).map(([k,v]) =>
    `<option value="${k}" ${task && task.priority === k ? 'selected' : ''}>${v.label}</option>`
  ).join('');
  const categoryOpts = Object.entries(CATEGORY_LABELS).map(([k,v]) =>
    `<option value="${k}" ${task && task.category === k ? 'selected' : ''}>${v.label}</option>`
  ).join('');
  const patientOpts = patients.map(p =>
    `<option value="${p.id}" ${task && task.patientId === p.id ? 'selected' : ''}>${p.name}</option>`
  ).join('');

  return `
    <form id="taskForm" class="modal-form">
      <div class="form-grid">
        <div class="form-group form-group--full">
          <label for="task-title">Título *</label>
          <input type="text" id="task-title" name="title" required maxlength="150"
                 value="${isEdit ? (task.title || '').replace(/"/g, '&quot;') : ''}"
                 placeholder="Ej: Practicar respiración 4-7-8">
        </div>
        <div class="form-group">
          <label for="task-patient">Paciente *</label>
          <select id="task-patient" name="patientId" required>
            <option value="">Seleccionar paciente…</option>
            ${patientOpts}
          </select>
        </div>
        <div class="form-group">
          <label for="task-category">Categoría</label>
          <select id="task-category" name="category">${categoryOpts}</select>
        </div>
        <div class="form-group">
          <label for="task-priority">Prioridad</label>
          <select id="task-priority" name="priority">${priorityOpts}</select>
        </div>
        <div class="form-group">
          <label for="task-due">Fecha de vencimiento</label>
          <input type="date" id="task-due" name="dueDate"
                 value="${isEdit && task.dueDate ? task.dueDate : ''}">
        </div>
        ${isEdit ? `
          <div class="form-group">
            <label for="task-status">Estado</label>
            <select id="task-status" name="status">${statusOpts}</select>
          </div>
          <div class="form-group">
            <label for="task-progress">Progreso (${task.progress || 0}%)</label>
            <input type="range" id="task-progress" name="progress" min="0" max="100"
                   value="${task.progress || 0}" class="form-range">
          </div>
        ` : ''}
        <div class="form-group form-group--full">
          <label for="task-description">Descripción</label>
          <textarea id="task-description" name="description" rows="3"
                    placeholder="Describe la tarea, instrucciones específicas…">${isEdit ? (task.description || '') : ''}</textarea>
        </div>
        <div class="form-group form-group--full">
          <label for="task-notes">Notas internas</label>
          <textarea id="task-notes" name="notes" rows="2"
                    placeholder="Notas privadas del profesional…">${isEdit ? (task.notes || '') : ''}</textarea>
        </div>
      </div>
    </form>
    <div class="modal-footer">
      <button class="btn btn--ghost" data-action="cancel">Cancelar</button>
      <button class="btn btn--primary" data-action="save">
        <i class="bi bi-check-lg"></i> ${isEdit ? 'Guardar cambios' : 'Crear tarea'}
      </button>
    </div>`;
}

// ── Detail view ────────────────────────────────────────────
function _taskDetailHTML(task) {
  const st = STATUS_LABELS[t.status] || STATUS_LABELS.PENDIENTE;
  const pr = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS.MEDIA;
  const ca = CATEGORY_LABELS[t.category] || CATEGORY_LABELS.Otra;
  const daysLeft = _daysUntilDue(task);
  const overdue = _isOverdue(task);

  let statusInfo = '';
  if (overdue) statusInfo = `<span class="detail-alert detail-alert--danger"><i class="bi bi-exclamation-triangle"></i> Esta tarea está vencida</span>`;
  else if (daysLeft === 0) statusInfo = `<span class="detail-alert detail-alert--warn"><i class="bi bi-clock"></i> Vence hoy</span>`;
  else if (daysLeft !== null && daysLeft > 0 && daysLeft <= 3) statusInfo = `<span class="detail-alert detail-alert--info"><i class="bi bi-info-circle"></i> Quedan ${daysLeft} días</span>`;

  return `
    <div class="task-detail">
      ${statusInfo}
      <div class="detail-grid">
        <div class="detail-row"><span class="detail-label">Título</span><span class="detail-value">${task.title}</span></div>
        <div class="detail-row"><span class="detail-label">Paciente</span><span class="detail-value">${task.patient || '—'}</span></div>
        <div class="detail-row"><span class="detail-label">Categoría</span><span class="detail-value"><i class="bi ${ca.icon}"></i> ${ca.label}</span></div>
        <div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value"><span class="${st.class}"><i class="bi ${st.icon}"></i> ${st.label}</span></span></div>
        <div class="detail-row"><span class="detail-label">Prioridad</span><span class="detail-value"><span class="${pr.class}"><i class="bi ${pr.icon}"></i> ${pr.label}</span></span></div>
        <div class="detail-row"><span class="detail-label">Asignada</span><span class="detail-value">${_dateDisplay(task.assignedDate)}</span></div>
        <div class="detail-row"><span class="detail-label">Vence</span><span class="detail-value">${task.dueDate ? _dateDisplay(task.dueDate) + (overdue ? ' (VENCIDA)' : '') : 'Sin fecha límite'}</span></div>
        <div class="detail-row"><span class="detail-label">Completada</span><span class="detail-value">${task.completedAt ? new Date(task.completedAt).toLocaleString('es-ES') : '—'}</span></div>
      </div>
      <div class="detail-section">
        <span class="detail-label">Progreso</span>
        <div class="progress-bar-wrap progress-bar-wrap--lg">
          <div class="progress-bar" style="width:${task.progress}%"></div>
          <span class="progress-bar-label">${task.progress}%</span>
        </div>
      </div>
      ${task.description ? `<div class="detail-section"><span class="detail-label">Descripción</span><p class="detail-text">${task.description}</p></div>` : ''}
      ${task.notes ? `<div class="detail-section"><span class="detail-label">Notas internas</span><p class="detail-text detail-text--muted">${task.notes}</p></div>` : ''}
    </div>`;
}

// ── Detail modal ───────────────────────────────────────────
async function _openDetailModal(taskId) {
  const task = await tasksService.getById(taskId);
  if (!task) { showToast('Tarea no encontrada', 'error'); return; }
  const st = STATUS_LABELS[task.status];
  const actionBtns = task.status !== 'COMPLETADA' && task.status !== 'CANCELADA' ? `
    <div class="modal-footer modal-footer--actions">
      ${task.status === 'PENDIENTE' ? `<button class="btn btn--primary" data-action="start"><i class="bi bi-play"></i> Iniciar</button>` : ''}
      ${task.status === 'EN_PROGRESO' ? `<button class="btn btn--success" data-action="complete"><i class="bi bi-check-lg"></i> Completar</button>` : ''}
      <button class="btn btn--ghost" data-action="editFromDetail"><i class="bi bi-pencil"></i> Editar</button>
      <button class="btn btn--danger-light" data-action="cancelTask"><i class="bi bi-x-circle"></i> Cancelar</button>
    </div>` : '';

  showModal({ title: `Tarea: ${task.title}`, wide: true, hasLoading: false, html: _taskDetailHTML(task) + actionBtns });

  const bind = (act, fn) => { const b = document.querySelector(`[data-action="${act}"]`); if (b) b.onclick = fn; };
  bind('start',        () => { tasksService.start(task.id).then(() => { closeModal(); showToast('Tarea iniciada', 'success'); }).catch(e => showToast(e.message, 'error')); });
  bind('complete',     () => { tasksService.complete(task.id).then(() => { closeModal(); showToast('Tarea completada', 'success'); }).catch(e => showToast(e.message, 'error')); });
  bind('cancelTask',   () => { tasksService.cancel(task.id).then(() => { closeModal(); showToast('Tarea cancelada', 'info'); }).catch(e => showToast(e.message, 'error')); });
  bind('editFromDetail', () => { closeModal(); setTimeout(() => _openEditModal(task.id), 200); });
}

// ── Create modal ───────────────────────────────────────────
async function _openCreateModal() {
  const patients = await tasksService.getPatients();
  showModal({ title: 'Nueva tarea terapéutica', wide: true, hasLoading: false,
    html: _taskFormHTML(null, patients),
    onClose: () => document.body.classList.remove('modal-open'),
  });

  document.body.classList.add('modal-open');
  document.querySelector('[data-action="save"]').onclick = async () => {
    const form = document.getElementById('taskForm');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    try {
      await tasksService.create({
        title:       fd.get('title'),
        patientId:   fd.get('patientId'),
        category:    fd.get('category') || 'Seguimiento',
        priority:    fd.get('priority') || 'MEDIA',
        dueDate:     fd.get('dueDate') || null,
        description: fd.get('description') || '',
        notes:       fd.get('notes') || '',
      });
      closeModal();
      showToast('Tarea creada correctamente', 'success');
    } catch (e) { showToast('Error al crear tarea: ' + e.message, 'error'); }
  };
  document.querySelector('[data-action="cancel"]').onclick = () => closeModal();
}

// ── Edit modal ─────────────────────────────────────────────
async function _openEditModal(taskId) {
  const [task, patients] = await Promise.all([
    tasksService.getById(taskId),
    tasksService.getPatients(),
  ]);
  if (!task) { showToast('Tarea no encontrada', 'error'); return; }
  showModal({ title: 'Editar tarea', wide: true, hasLoading: false,
    html: _taskFormHTML(task, patients),
    onClose: () => document.body.classList.remove('modal-open'),
  });

  document.body.classList.add('modal-open');
  document.querySelector('[data-action="save"]').onclick = async () => {
    const form = document.getElementById('taskForm');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    try {
      const changes = {
        title:       fd.get('title'),
        patientId:   fd.get('patientId'),
        category:    fd.get('category'),
        priority:    fd.get('priority'),
        status:      fd.get('status'),
        progress:    parseInt(fd.get('progress') || '0'),
        dueDate:     fd.get('dueDate') || null,
        description: fd.get('description') || '',
        notes:       fd.get('notes') || '',
      };
      if (changes.status === 'COMPLETADA' && task.status !== 'COMPLETADA') {
        changes.completedAt = new Date().toISOString();
      }
      await tasksService.update(taskId, changes);
      closeModal();
      showToast('Tarea actualizada', 'success');
    } catch (e) { showToast('Error al actualizar: ' + e.message, 'error'); }
  };
  document.querySelector('[data-action="cancel"]').onclick = () => closeModal();

  const range = document.getElementById('task-progress');
  if (range) {
    range.oninput = () => {
      const lbl = range.closest('.form-group').querySelector('label');
      if (lbl) lbl.textContent = `Progreso (${range.value}%)`;
    };
  }
}

// ══════════════════════════════════════════════════════════
// TasksPage
// ══════════════════════════════════════════════════════════
export class TasksPage {
  constructor() {
    this._filters = { status: '', priority: '', search: '' };
    this._tasks = [];
    this._unsub = tasksService.onChange(() => this._load());
  }

  destroy() { this._unsub(); }

  async render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="page-actions">
        <button class="btn btn--primary" id="btnNewTask"><i class="bi bi-plus-lg"></i> Nueva tarea</button>
      </div>
      <div id="taskStatsWrap"></div>
      <div class="filters-bar" id="taskFilters">
        <input type="search" class="form-input" placeholder="Buscar tarea…" id="taskSearch" autocomplete="off">
        <select class="form-select" id="taskStatusFilter"><option value="">Todos los estados</option>
          ${Object.entries(STATUS_LABELS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
        </select>
        <select class="form-select" id="taskPriorityFilter"><option value="">Todas las prioridades</option>
          ${Object.entries(PRIORITY_LABELS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
        </select>
      </div>
      <div id="taskTableWrap"></div>`;

    document.getElementById('btnNewTask').onclick = () => _openCreateModal();
    document.getElementById('taskSearch').oninput = (e) => { this._filters.search = e.target.value; this._load(); };
    document.getElementById('taskStatusFilter').onchange = (e) => { this._filters.status = e.target.value; this._load(); };
    document.getElementById('taskPriorityFilter').onchange = (e) => { this._filters.priority = e.target.value; this._load(); };

    await this._load();
  }

  async _load() {
    try {
      const [stats, tasks] = await Promise.all([
        tasksService.getStats(),
        tasksService.list(this._filters),
      ]);
      this._tasks = tasks;
      document.getElementById('taskStatsWrap').innerHTML = _statsCardsHTML(stats);
      document.getElementById('taskTableWrap').innerHTML = _tasksTableHTML(tasks);
      this._bindTable();
    } catch (e) {
      console.error('TasksPage load error:', e);
      showToast('Error al cargar tareas', 'error');
    }
  }

  _bindTable() {
    document.querySelectorAll('#taskTableWrap [data-action]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'detail')   _openDetailModal(id);
        if (action === 'edit')     _openEditModal(id);
        if (action === 'complete') tasksService.complete(id).then(() => showToast('Tarea completada', 'success')).catch(err => showToast(err.message, 'error'));
      };
    });
    document.querySelectorAll('#taskTableWrap tbody tr[data-id]').forEach(tr => {
      tr.onclick = () => _openDetailModal(tr.dataset.id);
    });
  }
}
