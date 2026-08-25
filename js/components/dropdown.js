// js/components/dropdown.js
// Dropdown personalizado.

export class Dropdown {
    constructor(element) {
        this.element = typeof element === 'string' ? document.querySelector(element) : element;
        this.isOpen = false;
        this.bindEvents();
    }

    bindEvents() {
        if (!this.element) return;

        const trigger = this.element.querySelector('[data-dropdown-trigger]');
        const menu = this.element.querySelector('.dropdown-menu');

        if (trigger && menu) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });

            menu.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    const action = item.dataset.action;
                    if (action === 'close') {
                        this.close();
                    }
                    if (item.dataset.href) {
                        window.location.href = item.dataset.href;
                    }
                    if (item.dataset.callback) {
                        const callback = this.element[item.dataset.callback];
                        if (typeof callback === 'function') callback();
                    }
                });
            });
        }

        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.close();
            }
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.element.classList.add('open');
        this.isOpen = true;
    }

    close() {
        this.element.classList.remove('open');
        this.isOpen = false;
    }
}
