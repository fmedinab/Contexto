import { supabase } from '../../config/supabase.js';
import { auditService } from './auditService.js';

class NotesService {
  constructor() {
    this._listeners = new Set();
  }

  onChange(cb) { this._listeners.add(cb); return () => this._listeners.delete(cb); }
  _emit(event, data) { this._listeners.forEach(cb => { try { cb(event, data); } catch(e) { console.error('NotesService listener error:', e); } }); }

  _dbRowToUI(row) {
    if (!row) return null;
    return {
      id:            row.id,
      patientId:     row.patient_id,
      ownerId:       row.owner_id,
      patient:       row.patient_name || null,
      sessionType:   row.session_type,
      sessionDate:   row.session_date,
      title:         row.title,
      summary:       row.summary,
      interventions: row.interventions,
      observations:  row.observations,
      nextSteps:     row.next_steps,
      riskLevel:     row.risk_level,
      createdAt:     row.created_at,
      updatedAt:     row.updated_at,
    };
  }

  _uiToDBRow(ui) {
    const row = {};
    if ('patientId' in ui)     row.patient_id = ui.patientId;
    if ('ownerId' in ui)       row.owner_id = ui.ownerId;
    if ('sessionType' in ui)   row.session_type = ui.sessionType;
    if ('sessionDate' in ui)   row.session_date = ui.sessionDate;
    if ('title' in ui)         row.title = ui.title;
    if ('summary' in ui)       row.summary = ui.summary;
    if ('interventions' in ui) row.interventions = ui.interventions;
    if ('observations' in ui)  row.observations = ui.observations;
    if ('nextSteps' in ui)     row.next_steps = ui.nextSteps;
    if ('riskLevel' in ui)     row.risk_level = ui.riskLevel;
    return row;
  }

  async _resolvePatientNames(rows) {
    const ids = [...new Set(rows.filter(r => r.patient_id).map(r => r.patient_id))];
    if (!ids.length) return rows;
    const { data: patients } = await supabase.from('patients').select('id, full_name').in('id', ids);
    if (!patients) return rows;
    const map = Object.fromEntries(patients.map(p => [p.id, p.full_name || '']));
    return rows.map(r => ({ ...r, patient_name: map[r.patient_id] || null }));
  }

  async list(filters = {}) {
    let q = supabase.from('clinical_notes').select('*');
    if (filters.patientId)    q = q.eq('patient_id', filters.patientId);
    if (filters.ownerId)      q = q.eq('owner_id', filters.ownerId);
    if (filters.sessionType)  q = q.eq('session_type', filters.sessionType);
    if (filters.riskLevel)    q = q.eq('risk_level', filters.riskLevel);
    if (filters.search)       q = q.ilike('title', `%${filters.search}%`);
    if (filters.fromDate)     q = q.gte('session_date', filters.fromDate);
    if (filters.toDate)       q = q.lte('session_date', filters.toDate);
    if (filters.limit)        q = q.limit(filters.limit);
    q = q.order('session_date', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return (await this._resolvePatientNames(data || [])).map(r => this._dbRowToUI(r));
  }

  async getById(id) {
    const { data, error } = await supabase.from('clinical_notes').select('*').eq('id', id).single();
    if (error) throw error;
    const [resolved] = await this._resolvePatientNames([data]);
    return this._dbRowToUI(resolved);
  }

  async create(noteData) {
    const { data: { user } } = await supabase.auth.getUser();
    const dbRow = this._uiToDBRow({ ...noteData, ownerId: user?.id || noteData.ownerId });
    const { data, error } = await supabase.from('clinical_notes').insert(dbRow).select().single();
    if (error) throw error;
    const resolved = await this._resolvePatientNames([data]);
    const ui = this._dbRowToUI(resolved[0]);
    this._emit('created', ui);
    return ui;
  }

  async update(id, changes) {
    const dbRow = this._uiToDBRow(changes);
    dbRow.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('clinical_notes').update(dbRow).eq('id', id).select().single();
    if (error) throw error;
    const resolved = await this._resolvePatientNames([data]);
    const ui = this._dbRowToUI(resolved[0]);
    this._emit('updated', ui);
    return ui;
  }

  async delete(id) {
    const { error } = await supabase.from('clinical_notes').delete().eq('id', id);
    if (error) throw error;
    this._emit('deleted', { id });
  }

  async getStats() {
    const all = await this.list();
    return {
      total:      all.length,
      thisWeek:   all.filter(n => {
        if (!n.sessionDate) return false;
        const d = new Date(n.sessionDate + 'T00:00:00');
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }).length,
      thisMonth:  all.filter(n => {
        if (!n.sessionDate) return false;
        const d = new Date(n.sessionDate + 'T00:00:00');
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      highRisk:   all.filter(n => n.riskLevel === 'ALTO' || n.riskLevel === 'CRISIS').length,
      byType:     all.reduce((acc, n) => { acc[n.sessionType] = (acc[n.sessionType] || 0) + 1; return acc; }, {}),
      uniquePatients: new Set(all.map(n => n.patientId)).size,
    };
  }

  async getPatients() {
    const { data, error } = await supabase.from('patients').select('id, full_name').order('full_name');
    if (error) throw error;
    return (data || []).map(p => ({ id: p.id, name: p.full_name || '' }));
  }
}

export const notesService = new NotesService();
