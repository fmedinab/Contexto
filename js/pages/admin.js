// js/pages/admin.js
// Panel de administración — Stub mínimo.
// Permite registrar la ruta sin romper el bundle ES.

export class AdminPage {
    constructor() {
        this.container = null;
    }

    render() {
        this.container = document.getElementById('pageBody');
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <h1 class="page-title">Administración</h1>
                    <p class="page-subtitle">Gestión de usuarios y roles</p>
                </div>
                <div class="page-body">
                    <p>Panel de administración en desarrollo.</p>
                </div>
            </div>
        `;
    }

    destroy() {
        this.container = null;
    }
}
