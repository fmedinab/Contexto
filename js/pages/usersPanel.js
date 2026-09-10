// js/pages/usersPanel.js
// Panel de administración de usuarios y roles (solo admin/superadmin).
// Lista los usuarios del sistema (desde profiles, la única fuente legible
// desde el cliente) y permite cambiar el rol de cada uno. El cambio de rol
// se hace vía usersService.setRole, que reemplaza los roles previos.

import { usersService } from '../services/usersService.js';
import { authService } from '../services/authService.js';
import { RoleLabels } from '../core/roles.js';

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
}

function initialsOf(name, email) {
    const src = (name || email || '?').trim();
    const parts = src.split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map(w => w[0]).join('').toUpperCase() || '?';
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export class UsersPanel {
    constructor(container) {
        this.container = container;
        this._users = [];
        this._roles = [];
        this._filter = '';
        this._busyIds = new Set();
        this._listener = null;
    }

    async show() {
        this.container.innerHTML = '<div class="admin-loading"><span class="spinner spinner--sm"></span> Cargando usuarios…</div>';

        const [usersRes, rolesRes] = await Promise.all([usersService.getAll(), usersService.getRoles()]);
        if (usersRes.error || rolesRes.error) {
            const err = usersRes.error || rolesRes.error;
            console.error('usersPanel load error:', err);
            this.container.innerHTML = `
                <div class="cms-panel">
                    <div class="cms-header">
                        <div>
                            <h2 class="cms-title"><i class="fa-solid fa-users-gear"></i> Usuarios y roles</h2>
                            <p class="cms-subtitle">Panel de administración de cuentas del sistema.</p>
                        </div>
                    </div>
                    <div class="settings-card">
                        <p class="clinic-hint">No se pudieron cargar los usuarios. Verifica que tu cuenta tenga rol de administrador.</p>
                    </div>
                </div>`;
            return;
        }

        this._users = usersRes.data || [];
        this._roles = rolesRes.data || [];
        this._renderShell();
        this._bindSearch();
    }

    _renderShell() {
        const current = authService.getCurrentUser?.() || {};
        const currentId = current.id;

        this.container.innerHTML = `
            <div class="cms-panel">
                <div class="cms-header">
                    <div>
                        <h2 class="cms-title"><i class="fa-solid fa-users-gear"></i> Usuarios y roles</h2>
                        <p class="cms-subtitle">Cambia el rol de cada usuario: <strong>paciente</strong> (portal de solo lectura), <strong>recepcionista</strong>, <strong>psicólogo</strong> o <strong>administrador</strong>.</p>
                    </div>
                    <div class="users-search">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input class="settings-input" type="text" id="usersSearch" placeholder="Buscar por nombre o correo…">
                        <span class="users-count" id="usersCount"></span>
                    </div>
                </div>

                <div class="users-table-wrap">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Fecha de alta</th>
                                <th>Rol actual</th>
                                <th class="users-th-role">Cambiar rol</th>
                            </tr>
                        </thead>
                        <tbody id="usersRows"></tbody>
                    </table>
                </div>
                <p class="clinic-hint users-note">
                    <i class="fa-solid fa-shield-halved"></i>
                    No puedes quitarte el rol de administrador a ti mismo. Los cambios de rol aplican al instante para la próxima carga de la página.
                </p>
            </div>`;

        this._renderRows(currentId);
    }

    _renderRows(currentId) {
        const tbody = this.container.querySelector('#usersRows');
        const countEl = this.container.querySelector('#usersCount');
        if (!tbody) return;

        const q = this._filter.trim().toLowerCase();
        const visible = this._users.filter(u => {
            if (!q) return true;
            return (u.fullName || '').toLowerCase().includes(q) ||
                   (u.email || '').toLowerCase().includes(q);
        });

        if (countEl) countEl.textContent = `${visible.length} de ${this._users.length}`;

        if (!visible.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="users-empty">No se encontraron usuarios.</td></tr>`;
            return;
        }

        const roleOptions = this._roles.map(r => {
            const label = RoleLabels[r.name] || r.display_name || r.name;
            return `<option value="${esc(r.name)}">${esc(label)}</option>`;
        }).join('');

        tbody.innerHTML = visible.map(u => {
            const isSelf = u.id === currentId;
            const roles = u.roles || [];
            const badges = roles.length
                ? roles.map(r => `<span class="users-role-badge users-role-badge--${r}">${esc(RoleLabels[r] || r)}</span>`).join('')
                : '<span class="users-role-badge">Sin rol</span>';
            const busy = this._busyIds.has(u.id);

            return `
                <tr data-user-id="${esc(u.id)}">
                    <td>
                        <div class="users-ident">
                            <span class="users-avatar">${esc(initialsOf(u.fullName, u.email))}</span>
                            <div class="users-ident-meta">
                                <div class="users-name">${esc(u.fullName || u.email || '—')}</div>
                                <div class="users-email">${esc(u.email || '')}</div>
                            </div>
                        </div>
                    </td>
                    <td class="users-date">${fmtDate(u.createdAt)}</td>
                    <td>
                        <div class="users-badges">${badges}</div>
                        ${isSelf ? '<div class="users-self">Tú</div>' : ''}
                    </td>
                    <td class="users-th-role">
                        <div class="users-role-control">
                            <select class="settings-input" data-role-select ${busy ? 'disabled' : ''}>
                                ${roleOptions}
                            </select>
                            <button class="settings-btn users-apply-btn" type="button" data-role-apply ${busy ? 'disabled' : ''}>
                                ${busy ? '<span class="spinner spinner--xs"></span>' : '<i class="fa-solid fa-check"></i> Aplicar'}
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        tbody.querySelectorAll('tr').forEach(tr => {
            const select = tr.querySelector('[data-role-select]');
            const apply = tr.querySelector('[data-role-apply]');
            if (!select) return;

            const userId = tr.dataset.userId;
            const user = this._users.find(u => u.id === userId);
            const roles = user?.roles || [];
            const currentRole = roles.find(r => r !== 'patient') || roles[0] || 'patient';
            select.value = currentRole;

            apply.addEventListener('click', () => {
                const newRole = select.value;
                if (newRole === currentRole) {
                    window.app?.toast?.info?.('Sin cambios', 'El usuario ya tiene ese rol.');
                    return;
                }
                this._applyRole(userId, newRole, tr, apply, select);
            });
        });
    }

    async _applyRole(userId, roleName, tr, btn, select) {
        if (this._busyIds.has(userId)) return;
        this._busyIds.add(userId);
        tr.classList.add('is-busy');
        select.disabled = true;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner spinner--xs"></span>';

        const { error } = await usersService.setRole(userId, roleName);
        this._busyIds.delete(userId);

        if (error) {
            console.error('setRole error:', error);
            window.app?.toast?.error?.('No se pudo cambiar el rol', error.message || 'Ocurrió un error al asignar el rol.');
            // Restaura el valor anterior.
            const roles = this._users.find(u => u.id === userId)?.roles || [];
            select.value = roles.find(r => r !== 'patient') || roles[0] || 'patient';
            tr.classList.remove('is-busy');
            select.disabled = false;
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Aplicar';
            return;
        }

        const user = this._users.find(u => u.id === userId);
        if (user) user.roles = [roleName];

        window.app?.toast?.success?.('Rol actualizado', `El rol se cambió a ${RoleLabels[roleName] || roleName}.`);
        this._renderRows(authService.getCurrentUser?.()?.id);
    }

    _bindSearch() {
        const input = this.container.querySelector('#usersSearch');
        if (!input) return;

        if (this._listener) input.removeEventListener('input', this._listener);
        this._listener = () => {
            this._filter = input.value;
            this._renderRows(authService.getCurrentUser?.()?.id);
        };
        input.addEventListener('input', this._listener);
    }

    destroy() {
        const input = this.container?.querySelector('#usersSearch');
        if (input && this._listener) {
            input.removeEventListener('input', this._listener);
        }
        this._listener = null;
        this.container = null;
    }
}