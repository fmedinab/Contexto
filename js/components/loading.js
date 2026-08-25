// js/components/loading.js
// Gestión de estados de carga.

export class Loading {
    constructor() {
        this.overlays = new Map();
    }

    show(target, options = {}) {
        const {
            text = 'Cargando...',
            overlay = true,
            spinner = true
        } = options;

        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) return null;

        const id = 'loading-' + Date.now();

        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-overlay';
        loadingEl.id = id;
        loadingEl.innerHTML = `
            <div class="loading-content">
                ${spinner ? '<div class="spinner"></div>' : ''}
                ${text ? `<p class="loading-text">${text}</p>` : ''}
            </div>
        `;

        if (!overlay) {
            loadingEl.classList.add('loading-overlay--transparent');
        }

        element.style.position = element.style.position || 'relative';
        element.appendChild(loadingEl);
        this.overlays.set(id, loadingEl);

        return id;
    }

    hide(id) {
        const loadingEl = this.overlays.get(id);
        if (!loadingEl) return;

        loadingEl.style.opacity = '0';
        setTimeout(() => {
            if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
            this.overlays.delete(id);
        }, 200);
    }

    hideAll() {
        this.overlays.forEach((_, id) => this.hide(id));
    }
}
