import { notesService } from '../services/notesService.js';

const SESSION_TYPES = ['Terapia Individual', 'Terapia de Pareja', 'Terapia Familiar', 'Evaluación Inicial', 'Seguimiento', 'Otra'];
const RISK_LABELS = {
  BAJO:   { label: 'Bajo',   color: 'completed' },
  MODERADO: { label: 'Moderado', color: 'info' },
  ALTO:   { label: 'Alto',   color: 'danger' },
  CRISIS: { label: 'Crisis', color: 'danger' },
};

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

function escapeHtml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

function _fmtDate(ds) {
  if (!ds) return '—';
  return new Date(ds + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
}

export class NotesPage {
  constructor() {
    this._filters = { search: '', sessionType: '', riskLevel: '' };
    this.currentModal = null;
    this._onKeyDown = (e) => { if (e.key === 'Escape' && this.currentModal) this._closeModal(); };
    this._unsub = notesService.onChange(() => this._load());
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
            <h1 class="patients-title">Notas clínicas</h1>
            <p class="patients-subtitle">Historial de notas de sesión por paciente.</p>
          </div>
          <div class="patients-header-actions">
            <button class="btn btn-primary" id="btnNewNote"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Nueva nota</button>
          </div>
        </div>
        <div class="patients-stats" id="noteStats"></div>
        <div class="patients-toolbar">
          <input type="search" class="form-input" id="noteSearch" placeholder="Buscar nota…" autocomplete="off">
          <select class="form-select" id="noteTypeFilter"><option value="">Todos los tipos</option>
            ${SESSION_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
          <select class="form-select" id="noteRiskFilter"><option value="">Todos los niveles</option>
            ${Object.entries(RISK_LABELS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
          </select>
        </div>
        <div id="noteTable"></div>
        <div class="modal-overlay" id="noteModalOverlay">
          <div class="modal-box">
            <div class="modal-header">
              <h2 class="modal-title" id="noteModalTitle"></h2>
              <button class="modal-close" id="noteModalClose" aria-label="Cerrar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
            </div>
            <div class="modal-body" id="noteModalBody"></div>
          </div>
        </div>
      </div>`;

    $('#btnNewNote').addEventListener('click', () => this._openForm());
    $('#noteSearch').addEventListener('input', (e) => { this._filters.search = e.target.value; this._load(); });
    $('#noteTypeFilter').addEventListener('change', (e) => { this._filters.sessionType = e.target.value; this._load(); });
    $('#noteRiskFilter').addEventListener('change', (e) => { this._filters.riskLevel = e.target.value; this._load(); });
    $('#noteModalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) this._closeModal(); });
    $('#noteModalClose').addEventListener('click', () => this._closeModal());
    document.addEventListener('keydown', this._onKeyDown);

    await this._load();
  }

  async _load() {
    try {
      const [stats, notes] = await Promise.all([
        notesService.getStats(),
        notesService.list(this._filters),
      ]);
      $('#noteStats').innerHTML = `
        <div class="stat-card"><span class="stat-value">${stats.total}</span><span class="stat-label">Total</span></div>
        <div class="stat-card"><span class="stat-value stat-value--info">${stats.thisWeek}</span><span class="stat-label">Esta semana</span></div>
        <div class="stat-card"><span class="stat-value stat-value--ok">${stats.thisMonth}</span><span class="stat-label">Este mes</span></div>
        <div class="stat-card"><span class="stat-value stat-value--danger">${stats.highRisk}</span><span class="stat-label">Riesgo alto</span></div>
        <div class="stat-card"><span class="stat-value">${stats.uniquePatients}</span><span class="stat-label">Pacientes</span></div>`;
      this._renderTable(notes);
    } catch (e) {
      console.error('NotesPage load error:', e);
      $('#noteTable').innerHTML = '<div class="patients-empty">Error al cargar notas.</div>';
    }
  }

  _renderTable(notes) {
    const wrap = $('#noteTable');
    if (!notes.length) { wrap.innerHTML = '<div class="patients-empty">No hay notas clínicas registradas.</div>'; return; }
    wrap.innerHTML = `
      <div class="table-responsive-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Fecha</th><th>Paciente</th><th>Tipo</th><th>Título</th><th>Riesgo</th><th></th>
          </tr></thead>
          <tbody>${notes.map(n => {
            const rl = RISK_LABELS[n.riskLevel] || RISK_LABELS.BAJO;
            return `
              <tr data-id="${n.id}">
                <td>${_fmtDate(n.sessionDate)}</td>
                <td>${escapeHtml(n.patient || '—')}</td>
                <td><span class="status-pill info">${escapeHtml(n.sessionType)}</span></td>
                <td><strong>${escapeHtml(n.title || n.summary?.slice(0, 60) || 'Sin título')}</strong></td>
                <td><span class="status-pill ${rl.color}">${rl.label}</span></td>
                <td class="col-actions">
                  <button class="btn btn-sm" data-action="view" data-id="${n.id}">Ver</button>
                  <button class="btn btn-sm" data-action="edit" data-id="${n.id}">Editar</button>
                </td>
              </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;

    $$('#noteTable [data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (btn.dataset.action === 'view')   this._openDetail(id);
        else if (btn.dataset.action === 'edit') this._openForm(id);
      });
    });
    $$('#noteTable tbody tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => this._openDetail(tr.dataset.id));
    });
  }

  _openModal(title, bodyHTML) {
    this.currentModal = true;
    const overlay = $('#noteModalOverlay');
    $('#noteModalTitle').textContent = title;
    $('#noteModalBody').innerHTML = bodyHTML;
    if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
  }

  _closeModal() {
    this.currentModal = null;
    const overlay = $('#noteModalOverlay');
    if (overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
  }

  async _openDetail(id) {
    this._openModal('Cargando...', '<div class="patients-empty"><p>Cargando…</p></div>');
    try {
      const note = await notesService.getById(id);
      if (!note) { this._openModal('Error', '<div class="patients-empty">Nota no encontrada.</div>'); return; }

      const rl = RISK_LABELS[note.riskLevel] || RISK_LABELS.BAJO;
      const bodyHTML = `
        <div class="patient-detail-header">
          <div class="patient-detail-avatar">${(note.patient || '?')[0]?.toUpperCase() || '?'}</div>
          <div>
            <h3 class="patient-detail-name">${escapeHtml(note.title || note.summary?.slice(0, 80) || 'Nota clínica')}</h3>
            <span class="patient-detail-id">${escapeHtml(note.patient || 'Sin paciente')} · ${_fmtDate(note.sessionDate)}</span>
          </div>
        </div>
        <div class="detail-section-title">Detalles</div>
        <div class="patient-detail-grid">
          <div class="detail-field"><span class="detail-label">Tipo de sesión</span><span class="detail-value"><span class="status-pill info">${escapeHtml(note.sessionType)}</span></span></div>
          <div class="detail-field"><span class="detail-label">Fecha</span><span class="detail-value">${_fmtDate(note.sessionDate)}</span></div>
          <div class="detail-field"><span class="detail-label">Nivel de riesgo</span><span class="detail-value"><span class="status-pill ${rl.color}">${rl.label}</span></span></div>
          <div class="detail-field"><span class="detail-label">Creada</span><span class="detail-value">${note.createdAt ? new Date(note.createdAt).toLocaleString('es-ES') : '—'}</span></div>
        </div>
        <div class="detail-section-title">Resumen de la sesión</div>
        <div class="detail-field full"><span class="detail-value">${escapeHtml(note.summary)}</span></div>
        ${note.interventions ? `<div class="detail-section-title">Intervenciones aplicadas</div><div class="detail-field full"><span class="detail-value">${escapeHtml(note.interventions)}</span></div>` : ''}
        ${note.observations ? `<div class="detail-section-title">Observaciones clínicas</div><div class="detail-field full"><span class="detail-value">${escapeHtml(note.observations)}</span></div>` : ''}
        ${note.nextSteps ? `<div class="detail-section-title">Próximos pasos</div><div class="detail-field full"><span class="detail-value">${escapeHtml(note.nextSteps)}</span></div>` : ''}
        <div class="action-row">
          <button class="btn" data-action-edit>Editar</button>
          <button class="btn btn-danger" data-action-delete data-id="${note.id}">Eliminar</button>
          <button class="btn" id="modalCloseBtn">Cerrar</button>
        </div>`;

      this._openModal('Nota: ' + (note.title || note.patient || ''), bodyHTML);

      $('#noteModalBody [data-action-edit]')?.addEventListener('click', () => { this._closeModal(); this._openForm(note.id); });
      $('#noteModalBody [data-action-delete]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar esta nota clínica permanentemente?')) return;
        try {
          await notesService.delete(note.id);
          this._closeModal();
          this._showToast('Nota eliminada.');
          await this._load();
        } catch (err) { alert('Error: ' + err.message); }
      });
      $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
    } catch (err) {
      this._openModal('Error', '<div class="patients-empty">Error al cargar la nota.</div><div class="action-row"><button class="btn btn-primary" id="modalCloseBtn">Cerrar</button></div>');
      $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
    }
  }

  async _openForm(editId) {
    this._openModal('Cargando...', '<div class="patients-empty"><p>Cargando…</p></div>');
    try {
      const patients = await notesService.getPatients();
      let note = null;
      if (editId) note = await notesService.getById(editId);
      const isEdit = !!note;
      const title = isEdit ? 'Editar nota clínica' : 'Nueva nota clínica';

      const patientOpts = patients.map(p => `<option value="${p.id}" ${note && note.patientId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
      const typeOpts = SESSION_TYPES.map(t => `<option value="${t}" ${note && note.sessionType === t ? 'selected' : ''}>${t}</option>`).join('');
      const riskOpts = Object.entries(RISK_LABELS).map(([k,v]) => `<option value="${k}" ${note && note.riskLevel === k ? 'selected' : ''}>${v.label}</option>`).join('');

      const bodyHTML = `
        <form class="form-grid" id="noteForm" novalidate>
          <div class="form-field" style="grid-column:1/-1;"><label for="nfTitle">Título</label><input type="text" id="nfTitle" value="${isEdit ? escapeHtml(note.title || '') : ''}" placeholder="Ej: Sesión 3 — Exposición gradual"></div>
          <div class="form-field"><label for="nfPatient">Paciente *</label><select id="nfPatient" required><option value="">Seleccionar…</option>${patientOpts}</select><span class="form-error" id="nfPatientError"></span></div>
          <div class="form-field"><label for="nfType">Tipo de sesión</label><select id="nfType">${typeOpts}</select></div>
          <div class="form-field"><label for="nfDate">Fecha de sesión *</label><input type="date" id="nfDate" value="${isEdit ? note.sessionDate : new Date().toISOString().slice(0,10)}" required></div>
          <div class="form-field"><label for="nfRisk">Nivel de riesgo</label><select id="nfRisk">${riskOpts}</select></div>
          <div class="form-field" style="grid-column:1/-1;"><label for="nfSummary">Resumen de la sesión *</label><textarea id="nfSummary" rows="4" placeholder="Describe el desarrollo de la sesión…" required>${isEdit ? escapeHtml(note.summary || '') : ''}</textarea><span class="form-error" id="nfSummaryError"></span></div>
          <div class="form-field" style="grid-column:1/-1;"><label for="nfInterventions">Intervenciones aplicadas</label><textarea id="nfInterventions" rows="3" placeholder="Técnicas y estrategias utilizadas…">${isEdit ? escapeHtml(note.interventions || '') : ''}</textarea></div>
          <div class="form-field" style="grid-column:1/-1;"><label for="nfObs">Observaciones clínicas</label><textarea id="nfObs" rows="3" placeholder="Observaciones relevantes del paciente…">${isEdit ? escapeHtml(note.observations || '') : ''}</textarea></div>
          <div class="form-field" style="grid-column:1/-1;"><label for="nfNext">Próximos pasos</label><textarea id="nfNext" rows="2" placeholder="Plan para la siguiente sesión…">${isEdit ? escapeHtml(note.nextSteps || '') : ''}</textarea></div>
          <div class="action-row" style="grid-column:1/-1;">
            <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar cambios' : 'Crear nota'}</button>
            <button type="button" class="btn" id="formCancelBtn">Cancelar</button>
          </div>
        </form>`;

      this._openModal(title, bodyHTML);

      const form = $('#noteForm');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        $('#nfPatientError').textContent = '';
        $('#nfSummaryError').textContent = '';
        let valid = true;
        if (!$('#nfPatient').value) { $('#nfPatientError').textContent = 'Selecciona un paciente'; valid = false; }
        if (!$('#nfSummary').value.trim()) { $('#nfSummaryError').textContent = 'El resumen es obligatorio'; valid = false; }
        if (!valid) return;

        const submitBtn = form.querySelector('[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Guardando…'; }

        const data = {
          patientId:     $('#nfPatient').value,
          sessionType:   $('#nfType').value || 'Terapia Individual',
          sessionDate:   $('#nfDate').value || new Date().toISOString().slice(0,10),
          title:         $('#nfTitle').value.trim() || null,
          summary:       $('#nfSummary').value.trim(),
          interventions: $('#nfInterventions').value.trim() || null,
          observations:  $('#nfObs').value.trim() || null,
          nextSteps:     $('#nfNext').value.trim() || null,
          riskLevel:     $('#nfRisk').value || 'BAJO',
        };

        try {
          if (isEdit) await notesService.update(editId, data);
          else await notesService.create(data);
          this._closeModal();
          await this._load();
        } catch (err) {
          alert('Error: ' + err.message);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = isEdit ? 'Guardar cambios' : 'Crear nota'; }
        }
      });

      $('#formCancelBtn')?.addEventListener('click', () => this._closeModal());
    } catch (err) {
      this._openModal('Error', '<div class="patients-empty">Error al cargar el formulario.</div><div class="action-row"><button class="btn btn-primary" id="modalCloseBtn">Cerrar</button></div>');
      $('#modalCloseBtn')?.addEventListener('click', () => this._closeModal());
    }
  }

  _showToast(msg) {
    let t = document.getElementById('appToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'appToast';
      t.className = 'patients-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }
}
