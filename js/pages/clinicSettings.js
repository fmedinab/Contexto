// js/pages/clinicSettings.js
// Panel de ajustes globales del consultorio.
// Edita site_settings (horarios de trabajo, tiempo de inactividad,
// datos de contacto, WhatsApp, moneda y zona horaria).

import { siteSettingsService } from '../services/siteSettingsService.js';

const WEEKDAYS = [
    { key: 'lunes', label: 'Lunes' },
    { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
];

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
}

export class ClinicSettings {
    constructor(container) {
        this.container = container;
        this._settings = null;
        this._saving = false;
    }

    async show() {
        this.container.innerHTML = '<div class="admin-loading"><span class="spinner spinner--sm"></span> Cargando ajustes…</div>';

        this._settings = await siteSettingsService.getAll().catch(() => null);
        if (!this._settings) {
            this.container.innerHTML = '<div class="settings-error">No se pudieron cargar los ajustes.</div>';
            return;
        }
        this._render();
    }

    _workSchedule() {
        const ws = this._settings.work_schedule;
        if (typeof ws === 'string') {
            try { return JSON.parse(ws); } catch { return {}; }
        }
        return (ws && typeof ws === 'object') ? ws : {};
    }

    _render() {
        const s = this._settings;
        const schedule = this._workSchedule();

        this.container.innerHTML = `
            <div class="cms-panel">
                <div class="cms-header">
                    <div>
                        <h2 class="cms-title"><i class="fa-solid fa-sliders"></i> Ajustes del consultorio</h2>
                        <p class="cms-subtitle">Configuración global: horarios de atención, sesión y contacto.</p>
                    </div>
                    <button class="settings-btn settings-btn--primary" id="clinicSave">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar ajustes
                    </button>
                </div>

                <div class="clinic-wrap">
                    <div class="settings-card">
                        <h3 class="clinic-card-title"><i class="fa-solid fa-clock"></i> Horarios de atención</h3>
                        <p class="clinic-hint">Define el horario de cada día. Usa formato <code>HH:MM-HH:MM</code> o escribe <code>cerrado</code>.</p>
                        <div class="clinic-schedule">
                            ${WEEKDAYS.map(d => `
                                <div class="clinic-schedule-row">
                                    <label class="settings-label">${d.label}</label>
                                    <input class="settings-input" type="text" id="sch-${d.key}" value="${esc(schedule[d.key] || 'cerrado')}" placeholder="08:00-20:00">
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="settings-card">
                        <h3 class="clinic-card-title"><i class="fa-solid fa-moon"></i> Sesión e inactividad</h3>
                        <div class="clinic-form-row">
                            <div class="settings-field">
                                <label class="settings-label" for="set-timeout">Tiempo de inactividad (minutos)</label>
                                <input class="settings-input" type="number" id="set-timeout" min="1" max="480"
                                    value="${esc(s.session_timeout_minutes || '30')}" placeholder="30">
                                <span class="settings-hint">Tras este tiempo sin actividad la sesión se cierra. Mínimo 1, máximo 480.</span>
                            </div>
                            <div class="settings-field">
                                <label class="settings-label" for="set-confirm">Confirmación de cita (horas)</label>
                                <input class="settings-input" type="number" id="set-confirm" min="1" max="168"
                                    value="${esc(s.booking_confirm_hours || '24')}" placeholder="24">
                                <span class="settings-hint">Tiempo prometido en la landing para confirmar una solicitud.</span>
                            </div>
                        </div>
                    </div>

                    <div class="settings-card">
                        <h3 class="clinic-card-title"><i class="fa-solid fa-address-book"></i> Contacto</h3>
                        <div class="clinic-form-row">
                            <div class="settings-field">
                                <label class="settings-label" for="set-email">Correo de contacto</label>
                                <input class="settings-input" type="email" id="set-email" value="${esc(s.contact_email || '')}" placeholder="contacto@sitio.com">
                            </div>
                            <div class="settings-field">
                                <label class="settings-label" for="set-phone">Teléfono / WhatsApp</label>
                                <input class="settings-input" type="tel" id="set-phone" value="${esc(s.contact_phone || '')}" placeholder="+502 1234 5678">
                            </div>
                            <div class="settings-field">
                                <label class="settings-label" for="set-wa">Número WhatsApp (solo dígitos, con país)</label>
                                <input class="settings-input" type="text" id="set-wa" value="${esc(s.whatsapp_number || '')}" placeholder="50212345678">
                                <span class="settings-hint">Se usa para los enlaces wa.me de la landing.</span>
                            </div>
                        </div>
                    </div>

                    <div class="settings-card">
                        <h3 class="clinic-card-title"><i class="fa-solid fa-earth-americas"></i> Localización</h3>
                        <div class="clinic-form-row">
                            <div class="settings-field">
                                <label class="settings-label" for="set-currency">Moneda</label>
                                <select class="settings-input" id="set-currency">
                                    ${['PEN', 'USD', 'MXN', 'GTQ', 'COP', 'ARS', 'CLP', 'EUR'].map(c =>
                                        `<option value="${c}"${String(s.currency || 'PEN') === c ? ' selected' : ''}>${c}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="settings-field">
                                <label class="settings-label" for="set-tz">Zona horaria</label>
                                <input class="settings-input" type="text" id="set-tz" value="${esc(s.timezone || 'America/Guatemala')}" list="tz-list" placeholder="America/Guatemala">
                                <datalist id="tz-list">
                                    <option>America/Guatemala</option><option>America/Mexico_City</option>
                                    <option>America/Bogota</option><option>America/Lima</option>
                                    <option>America/Argentina/Buenos_Aires</option><option>America/Santiago</option>
                                </datalist>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        this._bindEvents();
    }

    _bindEvents() {
        const btn = this.container.querySelector('#clinicSave');
        if (btn) btn.addEventListener('click', () => this._save());

        this.container.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('input', () => { if (btn) btn.disabled = false; });
            el.addEventListener('change', () => { if (btn) btn.disabled = false; });
        });
    }

    async _save() {
        if (this._saving) return;
        const btn = this.container.querySelector('#clinicSave');
        this._saving = true;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner spinner--sm"></span> Guardando…';
        }

        const schedule = {};
        WEEKDAYS.forEach(d => {
            const el = this.container.querySelector(`#sch-${d.key}`);
            schedule[d.key] = (el?.value || 'cerrado').trim().toLowerCase();
        });

        const timeout = Math.max(1, Math.min(480, Number(this.container.querySelector('#set-timeout')?.value) || 30));
        const confirmHrs = Math.max(1, Math.min(168, Number(this.container.querySelector('#set-confirm')?.value) || 24));

        const updates = {
            work_schedule: schedule,
            session_timeout_minutes: timeout,
            booking_confirm_hours: confirmHrs,
            contact_email: this.container.querySelector('#set-email')?.value.trim() || '',
            contact_phone: this.container.querySelector('#set-phone')?.value.trim() || '',
            whatsapp_number: String(this.container.querySelector('#set-wa')?.value || '').replace(/\D/g, ''),
            currency: this.container.querySelector('#set-currency')?.value || 'PEN',
            timezone: this.container.querySelector('#set-tz')?.value.trim() || 'America/Guatemala'
        };

        const { ok, errors } = await siteSettingsService.saveMany(updates);

        this._saving = false;
        if (btn) btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar ajustes';

        if (ok) {
            // Refrescar el tiempo de inactividad de la sesión actual.
            try {
                const { siteSettingsService: sss } = await import('../services/siteSettingsService.js');
                sss.getSessionTimeoutMs();
            } catch { /* noop */ }
            window.app?.toast?.success?.('Ajustes guardados', 'La configuración global del consultorio se actualizó.');
        } else {
            window.app?.toast?.error?.('Error', 'No se pudieron guardar algunos ajustes.');
        }
    }
}