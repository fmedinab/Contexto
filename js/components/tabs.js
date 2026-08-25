// js/components/tabs.js
// Sistema de tabs.

export class Tabs {
    constructor(container) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.tabs = [];
        this.activeTab = null;
        this.bindEvents();
    }

    bindEvents() {
        if (!this.container) return;

        const buttons = this.container.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                this.activate(tabId);
            });
        });
    }

    activate(tabId) {
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        this.container.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === tabId);
        });
        this.activeTab = tabId;

        if (typeof this.onChange === 'function') {
            this.onChange(tabId);
        }
    }

    getActive() {
        return this.activeTab;
    }
}
