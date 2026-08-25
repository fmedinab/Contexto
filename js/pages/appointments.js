// js/pages/appointments.js
// Stub: módulo de citas (pendiente de implementación).

export class AppointmentsPage {
    constructor() {
        this.container = document.getElementById('pageBody');
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon" aria-hidden="true">◈</div>
                <p class="empty-state-title">Módulo en desarrollo</p>
                <p class="empty-state-description">La gestión de citas se implementará en una fase posterior.</p>
            </div>
        `;
    }
}
