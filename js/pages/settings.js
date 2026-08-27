import { profilesService } from '../services/profilesService.js';
import { authService } from '../services/authService.js';

function $(sel, ctx) { return (ctx || document).querySelector(sel); }

export class SettingsPage {
    constructor() { this._profile = null; }

    async render() {
        const pageBody = document.getElementById('pageBody');
        if (!pageBody) return;
        pageBody.className = '';
        pageBody.style.minHeight = '100vh';
        pageBody.style.background = 'var(--bg-primary)';
        pageBody.innerHTML = `
            <div class="settings-page">
                <div class="settings-header">
                    <h1 class="settings-title">Mi perfil</h1>
                    <p class="settings-subtitle">Administra tu información personal y configuración de cuenta.</p>
                </div>
                <div id="settingsContent">
                    <div class="settings-loading"><span class="spinner spinner--sm"></span> Cargando perfil...</div>
                </div>
            </div>`;

        try {
            this._profile = await profilesService.getProfile();
        } catch (e) {
            console.error('Settings load error:', e);
            this._profile = this._fallback();
        }
        this._render();
    }

    _fallback() {
        const user = authService.getCurrentUser();
        const meta = user?.user_metadata || {};
        return {
            id: user?.id || '', email: user?.email || '',
            full_name: meta.full_name || meta.first_name || (user?.email || '').split('@')[0],
            dni: meta.dni || null, phone: meta.phone || null,
            avatar_url: meta.avatar_url || null, birth_date: meta.birth_date || null,
            currency: meta.currency || 'PEN', language: meta.language || 'es',
            role: meta.role || 'Profesional', created_at: user?.created_at || null,
        };
    }

    _render() {
        const el = $('#settingsContent');
        if (!el) return;
        const p = this._profile || this._fallback();
        const user = authService.getCurrentUser();
        const name = p.full_name || 'Usuario';
        const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const created = p.created_at ? new Date(p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

        el.innerHTML = `
            <div class="settings-card">
                <div class="settings-avatar-section">
                    <div class="settings-avatar" id="settingsAvatar">
                        ${p.avatar_url ? `<img src="${this._esc(p.avatar_url)}" alt="Avatar">` : `<span>${initials}</span>`}
                    </div>
                    <label class="settings-avatar-upload" for="avatarInput"><i class="fa-solid fa-camera"></i> Cambiar foto</label>
                    <input type="file" id="avatarInput" accept="image/*" style="display:none;">
                </div>
                <form id="profileForm" class="settings-form">
                    <div class="settings-form-row">
                        <div class="settings-field">
                            <label class="settings-label" for="profileFullName">Nombre completo</label>
                            <input class="settings-input" type="text" id="profileFullName" value="${this._esc(p.full_name || '')}" autocomplete="name">
                        </div>
                        <div class="settings-field">
                            <label class="settings-label" for="profileEmail">Correo electrónico</label>
                            <input class="settings-input" type="email" id="profileEmail" value="${this._esc(user?.email || '')}" disabled style="opacity:0.5;cursor:not-allowed;">
                            <span class="settings-hint">El correo no se puede cambiar</span>
                        </div>
                    </div>
                    <div class="settings-form-row">
                        <div class="settings-field">
                            <label class="settings-label" for="profileDNI">DNI / Documento</label>
                            <input class="settings-input" type="text" id="profileDNI" value="${this._esc(p.dni || '')}" placeholder="Opcional">
                        </div>
                        <div class="settings-field">
                            <label class="settings-label" for="profilePhone">Teléfono</label>
                            <input class="settings-input" type="tel" id="profilePhone" value="${this._esc(p.phone || '')}" placeholder="+51 999 888 777">
                        </div>
                    </div>
                    <div class="settings-form-row">
                        <div class="settings-field">
                            <label class="settings-label" for="profileBirthDate">Fecha de nacimiento</label>
                            <input class="settings-input" type="date" id="profileBirthDate" value="${p.birth_date || ''}">
                        </div>
                        <div class="settings-field">
                            <label class="settings-label" for="profileLanguage">Idioma</label>
                            <select class="settings-input" id="profileLanguage">
                                <option value="es" ${p.language === 'es' ? 'selected' : ''}>Español</option>
                                <option value="en" ${p.language === 'en' ? 'selected' : ''}>English</option>
                                <option value="pt" ${p.language === 'pt' ? 'selected' : ''}>Português</option>
                            </select>
                        </div>
                    </div>
                    <div class="settings-actions">
                        <button type="submit" class="settings-btn settings-btn--primary" id="profileSaveBtn"><i class="fa-solid fa-check"></i> Guardar cambios</button>
                    </div>
                </form>
            </div>
            <div class="settings-card">
                <h2 class="settings-card-title"><i class="fa-solid fa-lock"></i> Cambiar contraseña</h2>
                <form id="passwordForm" class="settings-form">
                    <div class="settings-field">
                        <label class="settings-label" for="newPassword">Nueva contraseña</label>
                        <input class="settings-input" type="password" id="newPassword" minlength="6" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
                    </div>
                    <div class="settings-field">
                        <label class="settings-label" for="confirmPassword">Confirmar contraseña</label>
                        <input class="settings-input" type="password" id="confirmPassword" minlength="6" placeholder="Repite la contraseña" autocomplete="new-password">
                    </div>
                    <div class="settings-actions">
                        <button type="submit" class="settings-btn settings-btn--secondary" id="passwordSaveBtn"><i class="fa-solid fa-key"></i> Actualizar contraseña</button>
                    </div>
                </form>
            </div>
            <div class="settings-card">
                <h2 class="settings-card-title"><i class="fa-solid fa-shield-halved"></i> Cuenta</h2>
                <div class="settings-account-info">
                    <div class="settings-info-row"><span class="settings-info-label">Rol</span><span class="settings-info-value">${this._esc(p.role || 'Profesional')}</span></div>
                    <div class="settings-info-row"><span class="settings-info-label">Miembro desde</span><span class="settings-info-value">${created}</span></div>
                    <div class="settings-info-row"><span class="settings-info-label">Moneda</span><span class="settings-info-value">${this._esc(p.currency || 'PEN')}</span></div>
                </div>
            </div>`;

        this._bindEvents();
    }

    _bindEvents() {
        const pf = $('#profileForm');
        const pwf = $('#passwordForm');
        const av = $('#avatarInput');

        if (pf) pf.addEventListener('submit', (e) => { e.preventDefault(); this._saveProfile(); });
        if (pwf) pwf.addEventListener('submit', (e) => { e.preventDefault(); this._changePassword(); });
        if (av) av.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { window.app.toast.error('Error', 'La imagen no puede superar 2MB.'); return; }
            try {
                const url = await profilesService.uploadAvatar(file);
                this._profile.avatar_url = url;
                const a = $('#settingsAvatar');
                if (a) a.innerHTML = `<img src="${url}" alt="Avatar">`;
                window.app.toast.success('Avatar actualizado', 'Tu foto de perfil se ha cambiado.');
            } catch { window.app.toast.error('Error', 'No se pudo subir la imagen.'); }
        });
    }

    async _saveProfile() {
        const btn = $('#profileSaveBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner--sm btn-spinner"></span> Guardando...'; }
        try {
            const updates = {
                full_name: $('#profileFullName')?.value.trim() || '',
                dni: $('#profileDNI')?.value.trim() || null,
                phone: $('#profilePhone')?.value.trim() || null,
                birth_date: $('#profileBirthDate')?.value || null,
                language: $('#profileLanguage')?.value || 'es',
            };
            if (!updates.full_name) { window.app.toast.error('Error', 'El nombre es obligatorio.'); return; }
            this._profile = await profilesService.updateProfile(updates);
            window.app.toast.success('Perfil actualizado', 'Los cambios se han guardado correctamente.');
        } catch (e) {
            console.error('Profile save error:', e);
            window.app.toast.error('Error', 'No se pudo guardar el perfil.');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> Guardar cambios'; }
        }
    }

    async _changePassword() {
        const btn = $('#passwordSaveBtn');
        const np = $('#newPassword')?.value;
        const cp = $('#confirmPassword')?.value;
        if (!np || np.length < 6) { window.app.toast.error('Error', 'La contraseña debe tener al menos 6 caracteres.'); return; }
        if (np !== cp) { window.app.toast.error('Error', 'Las contraseñas no coinciden.'); return; }
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner--sm btn-spinner"></span> Actualizando...'; }
        try {
            await profilesService.changePassword(np);
            window.app.toast.success('Contraseña actualizada', 'Tu contraseña se ha cambiado correctamente.');
            $('#newPassword').value = '';
            $('#confirmPassword').value = '';
        } catch (e) {
            window.app.toast.error('Error', e.message || 'No se pudo cambiar la contraseña.');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-key"></i> Actualizar contraseña'; }
        }
    }

    _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
}
