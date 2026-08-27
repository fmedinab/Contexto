import { profilesService } from '../services/profilesService.js';
import { authService } from '../services/authService.js';

function $(sel, ctx) { return (ctx || document).querySelector(sel); }

export class SettingsPage {
    constructor() { this._profile = null; }

    async render(targetContainer) {
        console.log('[Settings] render() called');
        const pageBody = targetContainer || document.getElementById('pageBody');
        if (!pageBody) { console.error('[Settings] pageBody NOT found'); return; }
        console.log('[Settings] container found, rendering...');
        if (!targetContainer) {
            pageBody.className = '';
            pageBody.style.cssText = 'min-height:100vh;background:var(--bg-primary)';
        }

        const user = authService.getCurrentUser();
        const meta = user?.user_metadata || {};
        const name = meta.full_name || meta.first_name || (user?.email || '').split('@')[0] || 'Usuario';
        const role = meta.role || 'Profesional';
        const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const email = user?.email || '';
        const created = user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

        pageBody.innerHTML = `
            <div class="settings-page">
                <div class="settings-header">
                    <h1 class="settings-title">Mi perfil</h1>
                    <p class="settings-subtitle">Administra tu información personal y configuración de cuenta.</p>
                </div>
                <div class="settings-card">
                    <div class="settings-avatar-section">
                        <div class="settings-avatar" id="settingsAvatar"><span>${initials}</span></div>
                        <label class="settings-avatar-upload" for="avatarInput"><i class="fa-solid fa-camera"></i> Cambiar foto</label>
                        <input type="file" id="avatarInput" accept="image/*" style="display:none;">
                    </div>
                    <form id="profileForm" class="settings-form">
                        <div class="settings-form-row">
                            <div class="settings-field">
                                <label class="settings-label" for="profileFullName">Nombre completo</label>
                                <input class="settings-input" type="text" id="profileFullName" value="${esc(name)}" autocomplete="name">
                            </div>
                            <div class="settings-field">
                                <label class="settings-label" for="profileEmail">Correo electrónico</label>
                                <input class="settings-input" type="email" id="profileEmail" value="${esc(email)}" disabled style="opacity:0.5;cursor:not-allowed;">
                                <span class="settings-hint">El correo no se puede cambiar</span>
                            </div>
                        </div>
                        <div class="settings-form-row">
                            <div class="settings-field">
                                <label class="settings-label" for="profileDNI">DNI / Documento</label>
                                <input class="settings-input" type="text" id="profileDNI" value="" placeholder="Opcional">
                            </div>
                            <div class="settings-field">
                                <label class="settings-label" for="profilePhone">Teléfono</label>
                                <input class="settings-input" type="tel" id="profilePhone" value="" placeholder="+51 999 888 777">
                            </div>
                        </div>
                        <div class="settings-form-row">
                            <div class="settings-field">
                                <label class="settings-label" for="profileBirthDate">Fecha de nacimiento</label>
                                <input class="settings-input" type="date" id="profileBirthDate" value="">
                            </div>
                            <div class="settings-field">
                                <label class="settings-label" for="profileLanguage">Idioma</label>
                                <select class="settings-input" id="profileLanguage">
                                    <option value="es" selected>Español</option>
                                    <option value="en">English</option>
                                    <option value="pt">Português</option>
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
                        <div class="settings-info-row"><span class="settings-info-label">Rol</span><span class="settings-info-value">${esc(role)}</span></div>
                        <div class="settings-info-row"><span class="settings-info-label">Miembro desde</span><span class="settings-info-value">${created}</span></div>
                        <div class="settings-info-row"><span class="settings-info-label">Moneda</span><span class="settings-info-value">PEN</span></div>
                    </div>
                </div>
            </div>`;

        this._bindEvents();
        console.log('[Settings] HTML rendered, loading profile in background...');
        this._loadProfile();
    }

    async _loadProfile() {
        try {
            console.log('[Settings] _loadProfile() calling profilesService.getProfile()...');
            this._profile = await profilesService.getProfile();
            console.log('[Settings] profile loaded:', this._profile);
            if (!this._profile) return;
            const p = this._profile;
            const setVal = (id, v) => { const el = $(`#${id}`); if (el) el.value = v || ''; };
            setVal('profileFullName', p.full_name);
            setVal('profileDNI', p.dni);
            setVal('profilePhone', p.phone);
            setVal('profileBirthDate', p.birth_date);
            setVal('profileLanguage', p.language);
            if (p.avatar_url) {
                const av = $('#settingsAvatar');
                if (av) av.innerHTML = `<img src="${esc(p.avatar_url)}" alt="Avatar">`;
            }
        } catch (e) {
            console.warn('Settings profile load (non-critical):', e.message);
        }
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
            await profilesService.updateProfile(updates);
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
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
