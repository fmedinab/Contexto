// js/components/skeleton.js
// Componentes skeleton para estados de carga.

export class Skeleton {
    static text(width = '100%', height = '1em') {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton--text';
        skeleton.style.width = width;
        skeleton.style.height = height;
        return skeleton;
    }

    static title(width = '60%') {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton--text';
        skeleton.style.width = width;
        skeleton.style.height = '1.5em';
        skeleton.style.marginBottom = 'var(--space-md)';
        return skeleton;
    }

    static circle(size = '48px') {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton--circle';
        skeleton.style.width = size;
        skeleton.style.height = size;
        return skeleton;
    }

    static card() {
        const card = document.createElement('div');
        card.className = 'skeleton skeleton--card';
        card.innerHTML = `
            <div style="margin-bottom: var(--space-md);">
                <div class="skeleton skeleton--text" style="width: 40%; height: 1.2em; margin-bottom: var(--space-sm);"></div>
                <div class="skeleton skeleton--text" style="width: 70%; height: 0.8em;"></div>
            </div>
            <div style="margin-bottom: var(--space-md);">
                <div class="skeleton skeleton--text" style="width: 100%; height: 0.8em; margin-bottom: var(--space-xs);"></div>
                <div class="skeleton skeleton--text" style="width: 80%; height: 0.8em;"></div>
            </div>
            <div style="display: flex; gap: var(--space-sm);">
                <div class="skeleton skeleton--text" style="width: 30%; height: 2rem; border-radius: var(--radius-md);"></div>
                <div class="skeleton skeleton--text" style="width: 30%; height: 2rem; border-radius: var(--radius-md);"></div>
            </div>
        `;
        return card;
    }

    static table(rows = 5, columns = 4) {
        const container = document.createElement('div');
        container.className = 'skeleton-table';

        let html = '<div style="display: flex; flex-direction: column; gap: var(--space-sm);">';

        for (let i = 0; i < rows; i++) {
            html += '<div style="display: flex; gap: var(--space-md); padding: var(--space-sm) 0;">';
            for (let j = 0; j < columns; j++) {
                const width = j === 0 ? '20%' : j === columns - 1 ? '10%' : '25%';
                html += `<div class="skeleton skeleton--text" style="flex: 1; height: 0.9em;"></div>`;
            }
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
        return container;
    }

    static list(items = 4) {
        const container = document.createElement('div');
        let html = '<div style="display: flex; flex-direction: column; gap: var(--space-md);">';

        for (let i = 0; i < items; i++) {
            html += `
                <div style="display: flex; align-items: center; gap: var(--space-md);">
                    <div class="skeleton skeleton--circle" style="width: 40px; height: 40px; flex-shrink: 0;"></div>
                    <div style="flex: 1;">
                        <div class="skeleton skeleton--text" style="width: 50%; height: 1em; margin-bottom: var(--space-xs);"></div>
                        <div class="skeleton skeleton--text" style="width: 30%; height: 0.8em;"></div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
        return container;
    }
}
