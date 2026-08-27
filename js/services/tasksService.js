import { supabase } from '../../config/supabase.js';
import { auditService } from './auditService.js';

class TasksService {
  constructor() {
    this._listeners = new Set();
  }

  onChange(cb) { this._listeners.add(cb); return () => this._listeners.delete(cb); }
  _emit(event, data) { this._listeners.forEach(cb => { try { cb(event, data); } catch(e) { console.error('TasksService listener error:', e); } }); }

  // ── DB → UI ──────────────────────────────────────────────
  _dbRowToUI(row) {
    if (!row) return null;
    return {
      id:               row.id,
      patientId:        row.patient_id,
      ownerId:          row.owner_id,
      patient:          row.patient_name || null,
      title:            row.title,
      description:      row.description,
      category:         row.category,
      status:           row.status,
      priority:         row.priority,
      progress:         row.progress,
      assignedDate:     row.assigned_date,
      dueDate:          row.due_date,
      completedAt:      row.completed_at,
      notes:            row.notes,
      createdAt:        row.created_at,
      updatedAt:        row.updated_at,
    };
  }

  _uiToDBRow(ui) {
    const row = {};
    if ('patientId' in ui)      row.patient_id = ui.patientId;
    if ('ownerId' in ui)        row.owner_id = ui.ownerId;
    if ('title' in ui)          row.title = ui.title;
    if ('description' in ui)    row.description = ui.description;
    if ('category' in ui)       row.category = ui.category;
    if ('status' in ui)         row.status = ui.status;
    if ('priority' in ui)       row.priority = ui.priority;
    if ('progress' in ui)       row.progress = ui.progress;
    if ('assignedDate' in ui)   row.assigned_date = ui.assignedDate;
    if ('dueDate' in ui)        row.due_date = ui.dueDate;
    if ('completedAt' in ui)    row.completed_at = ui.completedAt;
    if ('notes' in ui)          row.notes = ui.notes;
    return row;
  }

  // ── Nombre paciente ──────────────────────────────────────
  async _resolvePatientNames(rows) {
    const ids = [...new Set(rows.filter(r => r.patient_id).map(r => r.patient_id))];
    if (!ids.length) return rows;
    const { data: patients } = await supabase.from('patients').select('id, full_name').in('id', ids);
    if (!patients) return rows;
    const map = Object.fromEntries(patients.map(p => [p.id, p.full_name || '']));
    return rows.map(r => ({ ...r, patient_name: map[r.patient_id] || null }));
  }

  // ── Marcar tareas vencidas ───────────────────────────────
  async _markOverdue() {
    try { await supabase.rpc('check_overdue_tasks'); } catch { /* function may not exist yet */ }
  }

  // ── Listar ───────────────────────────────────────────────
  async list(filters = {}) {
    await this._markOverdue();
    let q = supabase.from('therapeutic_tasks').select('*');

    if (filters.status)  q = q.eq('status', filters.status);
    if (filters.priority) q = q.eq('priority', filters.priority);
    if (filters.patientId) q = q.eq('patient_id', filters.patientId);
    if (filters.ownerId)  q = q.eq('owner_id', filters.ownerId);
    if (filters.category) q = q.eq('category', filters.category);
    if (filters.search)   q = q.ilike('title', `%${filters.search}%`);
    if (filters.limit)    q = q.limit(filters.limit);

    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return (await this._resolvePatientNames(data || [])).map(r => this._dbRowToUI(r));
  }

  // ── Obtener por ID ───────────────────────────────────────
  async getById(id) {
    const { data, error } = await supabase.from('therapeutic_tasks').select('*').eq('id', id).single();
    if (error) throw error;
    const [resolved] = await this._resolvePatientNames([data]);
    return this._dbRowToUI(resolved);
  }

  // ── Crear ────────────────────────────────────────────────
  async create(taskData) {
    const { data: { user } } = await supabase.auth.getUser();
    const dbRow = this._uiToDBRow({ ...taskData, ownerId: user?.id || taskData.ownerId });
    const { data, error } = await supabase.from('therapeutic_tasks').insert(dbRow).select().single();
    if (error) throw error;
    const resolved = await this._resolvePatientNames([data]);
    const ui = this._dbRowToUI(resolved[0]);
    this._emit('created', ui);
    return ui;
  }

  // ── Actualizar ───────────────────────────────────────────
  async update(id, changes) {
    const dbRow = this._uiToDBRow(changes);
    dbRow.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('therapeutic_tasks').update(dbRow).eq('id', id).select().single();
    if (error) throw error;
    const resolved = await this._resolvePatientNames([data]);
    const ui = this._dbRowToUI(resolved[0]);
    this._emit('updated', ui);
    return ui;
  }

  // ── Eliminar ─────────────────────────────────────────────
  async delete(id) {
    const { error } = await supabase.from('therapeutic_tasks').delete().eq('id', id);
    if (error) throw error;
    this._emit('deleted', { id });
  }

  // ── Transiciones de estado ───────────────────────────────
  async start(id) {
    return this.update(id, { status: 'EN_PROGRESO', progress: 0 });
  }

  async complete(id) {
    return this.update(id, {
      status:     'COMPLETADA',
      progress:   100,
      completedAt: new Date().toISOString(),
    });
  }

  async cancel(id) {
    return this.update(id, { status: 'CANCELADA' });
  }

  async markOverdue(id) {
    return this.update(id, { status: 'VENCIDA' });
  }

  async setProgress(id, progress) {
    const p = Math.min(100, Math.max(0, parseInt(progress) || 0));
    const changes = { progress: p };
    if (p === 100) {
      changes.status = 'COMPLETADA';
      changes.completedAt = new Date().toISOString();
    }
    return this.update(id, changes);
  }

  // ── Estadísticas ─────────────────────────────────────────
  async getStats() {
    const all = await this.list();
    const today = new Date().toISOString().slice(0,10);
    return {
      total:            all.length,
      pending:          all.filter(t => t.status === 'PENDIENTE').length,
      inProgress:       all.filter(t => t.status === 'EN_PROGRESO').length,
      completed:        all.filter(t => t.status === 'COMPLETADA').length,
      overdue:          all.filter(t => t.status === 'VENCIDA').length,
      cancelled:        all.filter(t => t.status === 'CANCELADA').length,
      dueToday:         all.filter(t => t.dueDate === today && t.status !== 'COMPLETADA' && t.status !== 'CANCELADA').length,
      dueThisWeek:      all.filter(t => {
        if (!t.dueDate || t.status === 'COMPLETADA' || t.status === 'CANCELADA') return false;
        const d = new Date(t.dueDate + 'T00:00:00');
        const now = new Date();
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + (7 - now.getDay()));
        return d >= now && d <= weekEnd;
      }).length,
      compliancePercent: all.length
        ? Math.round((all.filter(t => t.status === 'COMPLETADA').length / all.length) * 100)
        : 0,
    };
  }

  // ── Obtener paciente de una tarea ────────────────────────
  async getPatientForTask(taskId) {
    const task = await this.getById(taskId);
    if (!task || !task.patientId) return null;
    const { data } = await supabase.from('patients').select('id, full_name, email, phone').eq('id', task.patientId).single();
    return data || null;
  }

  // ── Pacientes disponibles (para select) ──────────────────
  async getPatients() {
    const { data, error } = await supabase.from('patients').select('id, full_name').order('full_name');
    if (error) throw error;
    return (data || []).map(p => ({
      id:   p.id,
      name: p.full_name || '',
    }));
  }
}

export const tasksService = new TasksService();
