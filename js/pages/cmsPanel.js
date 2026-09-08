// js/pages/cmsPanel.js
// Panel de administración del contenido dinámico de la página principal.
// Edita la tabla cms_website. Solo usuarios con permiso `cms:manage`.

import { cmsService, DEFAULT_CONTENT } from '../services/cmsService.js';

// Metadatos por sección: título, icono y definición de campos.
// type: 'text' | 'textarea' | 'list' | 'html'
const SECTIONS = [
    {
        id: 'hero',
        label: 'Inicio',
        icon: 'fa-solid fa-house',
        fields: [
            { key: 'eyebrow', label: 'Antetítulo', type: 'text' },
            { key: 'title', label: 'Título principal', type: 'html', hint: 'Puedes usar <em>, <br>, <strong>. Se inserta como HTML.' },
            { key: 'description', label: 'Descripción', type: 'textarea' },
            { key: 'cta_primary', label: 'Botón principal', type: 'text' },
            { key: 'cta_secondary', label: 'Botón secundario', type: 'text' },
            {
                key: 'stats', label: 'Estadísticas', type: 'list', itemFields: [
                    { key: 'num', label: 'Número', type: 'text' },
                    { key: 'label', label: 'Texto', type: 'textarea' }
                ]
            }
        ]
    },
    {
        id: 'trust',
        label: 'Frase de confianza',
        icon: 'fa-solid fa-quote-left',
        fields: [
            { key: 'items', label: 'Frases', type: 'string-list' }
        ]
    },
    {
        id: 'servicios',
        label: 'Servicios',
        icon: 'fa-solid fa-briefcase',
        fields: [
            { key: 'eyebrow', label: 'Antetítulo', type: 'text' },
            { key: 'title', label: 'Título', type: 'textarea' },
            {
                key: 'items', label: 'Servicios', type: 'list', itemFields: [
                    { key: 'title', label: 'Nombre', type: 'text' },
                    { key: 'desc', label: 'Descripción', type: 'textarea' },
                    {
                        key: 'icon', label: 'Icono', type: 'select',
                        options: [
                            { value: 'user', label: 'Persona' },
                            { value: 'heart', label: 'Corazón' },
                            { value: 'users', label: 'Grupo' },
                            { value: 'child', label: 'Niño/Infantil' },
                            { value: 'clipboard', label: 'Evaluación' },
                            { value: 'video', label: 'Online' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'especialidades',
        label: 'Especialidades',
        icon: 'fa-solid fa-dna',
        fields: [
            { key: 'eyebrow', label: 'Antetítulo', type: 'text' },
            { key: 'title', label: 'Título', type: 'textarea' },
            { key: 'description', label: 'Descripción', type: 'textarea' },
            {
                key: 'items', label: 'Pilares', type: 'list', itemFields: [
                    { key: 'title', label: 'Nombre', type: 'text' },
                    { key: 'desc', label: 'Descripción', type: 'textarea' },
                    { key: 'color', label: 'Color (hex)', type: 'color' }
                ]
            }
        ]
    },
    {
        id: 'nosotros',
        label: 'Nosotros',
        icon: 'fa-solid fa-circle-info',
        fields: [
            { key: 'eyebrow', label: 'Antetítulo', type: 'text' },
            { key: 'title', label: 'Título', type: 'textarea' },
            { key: 'paragraph1', label: 'Párrafo 1', type: 'textarea' },
            { key: 'paragraph2', label: 'Párrafo 2', type: 'textarea' },
            {
                key: 'values', label: 'Valores', type: 'list', itemFields: [
                    { key: 'icon', label: 'Icono FontAwesome (fa-*)', type: 'text' },
                    { key: 'label', label: 'Texto', type: 'text' }
                ]
            },
            { key: 'card_title', label: 'Título de la tarjeta', type: 'textarea' },
            { key: 'card_text', label: 'Texto de la tarjeta', type: 'textarea' },
            { key: 'card_meta', label: 'Meta de la tarjeta', type: 'text' }
        ]
    },
    {
        id: 'proceso',
        label: 'Proceso',
        icon: 'fa-solid fa-route',
        fields: [
            { key: 'eyebrow', label: 'Antetítulo', type: 'text' },
            { key: 'title', label: 'Título', type: 'textarea' },
            {
                key: 'items', label: 'Pasos', type: 'list', itemFields: [
                    { key: 'num', label: 'Número', type: 'text' },
                    { key: 'title', label: 'Título', type: 'text' },
                    { key: 'desc', label: 'Descripción', type: 'textarea' }
                ]
            }
        ]
    },
    {
        id: 'equipo',
        label: 'Equipo',
        icon: 'fa-solid fa-user-group',
        fields: [
            { key: 'eyebrow', label: 'Antetítulo', type: 'text' },
            { key: 'title', label: 'Título', type: 'textarea' },
            {
                key: 'items', label: 'Miembros', type: 'list', itemFields: [
                    { key: 'name', label: 'Nombre', type: 'text' },
                    { key: 'role', label: 'Rol', type: 'text' },
                    { key: 'desc', label: 'Descripción', type: 'textarea' },
                    { key: 'initials', label: 'Iniciales', type: 'text' },
                    { key: 'color', label: 'Color (hex)', type: 'color' }
                ]
            }
        ]
    },
    {
        id: 'testimonios',
        label: 'Testimonios',
        icon: 'fa-solid fa-comment-dots',
        fields: [
            { key: 'eyebrow', label: 'Antetítulo', type: 'text' },
            { key: 'title', label: 'Título', type: 'textarea' },
            {
                key: 'items', label: 'Testimonios', type: 'list', itemFields: [
                    { key: 'name', label: 'Nombre', type: 'text' },
                    { key: 'meta', label: 'Meta', type: 'text' },
                    { key: 'text', label: 'Texto', type: 'textarea' },
                    { key: 'initials', label: 'Iniciales', type: 'text' },
                    { key: 'color', label: 'Color (hex)', type: 'color' }
                ]
            }
        ]
    },
    {
        id: 'faq',
        label: 'Preguntas',
        icon: 'fa-solid fa-circle-question',
        fields: [
            { key: 'eyebrow', label: 'Antetítulo', type: 'text' },
            { key: 'title', label: 'Título', type: 'textarea' },
            {
                key: 'items', label: 'Preguntas', type: 'list', itemFields: [
                    { key: 'q', label: 'Pregunta', type: 'textarea' },
                    { key: 'a', label: 'Respuesta', type: 'textarea' }
                ]
            }
        ]
    },
    {
        id: 'cta',
        label: 'Llamada final',
        icon: 'fa-solid fa-bullhorn',
        fields: [
            { key: 'title', label: 'Título', type: 'textarea' },
            { key: 'description', label: 'Descripción', type: 'textarea' },
            { key: 'button_primary', label: 'Botón principal', type: 'text' },
            { key: 'button_secondary', label: 'Botón secundario', type: 'text' }
        ]
    },
    {
        id: 'agendar',
        label: 'Agendar',
        icon: 'fa-solid fa-calendar-check',
        fields: [
            { key: 'eyebrow', label: 'Antetítulo', type: 'text' },
            { key: 'title', label: 'Título', type: 'textarea' }
        ]
    },
    {
        id: 'footer',
        label: 'Contacto y pie',
        icon: 'fa-solid fa-bars',
        fields: [
            { key: 'description', label: 'Descripción del pie', type: 'textarea' },
            { key: 'contact_email', label: 'Correo de contacto', type: 'text' },
            { key: 'contact_phone', label: 'Teléfono', type: 'text' }
        ]
    }
];

// Escape de HTML para previsualización segura.
function esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
}

export class CmsPanel {
    constructor(container) {
        this.container = container;
        this._content = null;
        this._activeSection = 'hero';
        this._saving = false;
    }

    async show() {
        this.container.innerHTML = '<div class="admin-loading"><span class="spinner spinner--sm"></span> Cargando contenido…</div>';

        const content = await cmsService.getLandingContent().catch(() => null);
        this._content = content || cmsService.getDefaultContent();
        this._draft = JSON.parse(JSON.stringify(this._content));

        this._renderShell();
        this._selectSection(this._activeSection);
    }

    _renderShell() {
        this.container.innerHTML = `
            <div class="cms-panel">
                <div class="cms-header">
                    <div>
                        <h2 class="cms-title"><i class="fa-solid fa-globe"></i> Contenido del sitio</h2>
                        <p class="cms-subtitle">Edita la información visible en la página principal. Los cambios se publican al guardar.</p>
                    </div>
                    <button class="settings-btn settings-btn--primary" id="cmsSaveAll" disabled>
                        <i class="fa-solid fa-floppy-disk"></i> Guardar cambios
                    </button>
                </div>

                <div class="cms-layout">
                    <nav class="cms-tabs" aria-label="Secciones del sitio">
                        ${SECTIONS.map(s => `
                            <button class="cms-tab" data-section="${s.id}" type="button">
                                <i class="${s.icon}"></i>
                                <span>${s.label}</span>
                            </button>
                        `).join('')}
                    </nav>

                    <div class="cms-content" id="cmsContent">
                        <div class="admin-loading"><span class="spinner spinner--sm"></span> Cargando…</div>
                    </div>
                </div>
            </div>`;

        this._bindTabs();
        this._bindSave();
        this._markDirty();
    }

    _bindTabs() {
        this.container.querySelectorAll('.cms-tab').forEach(tab => {
            tab.addEventListener('click', () => this._selectSection(tab.dataset.section));
        });
    }

    _selectSection(sectionId) {
        // Persistir la sección actual hacia el draft antes de cambiar de pestaña.
        if (this._activeSection && this._activeSection !== sectionId) {
            const prevDef = SECTIONS.find(s => s.id === this._activeSection);
            if (prevDef) this._draft[this._activeSection] = this._collectSectionData(prevDef);
        }

        this._activeSection = sectionId;
        this.container.querySelectorAll('.cms-tab').forEach(t => {
            t.classList.toggle('is-active', t.dataset.section === sectionId);
        });

        const def = SECTIONS.find(s => s.id === sectionId);
        const data = this._draft[sectionId] || {};
        const contentEl = this.container.querySelector('#cmsContent');
        if (!contentEl || !def) return;

        contentEl.innerHTML = `
            <div class="cms-section-head">
                <h3><i class="${def.icon}"></i> ${def.label}</h3>
                <span class="cms-section-badge">${def.fields.length} campo(s)</span>
            </div>
            <form class="cms-form" data-section-form="${def.id}" novalidate>
                ${def.fields.map(f => this._renderField(f, data[f.key])).join('')}
            </form>`;

        this._bindFieldEvents(contentEl);
        this._markDirty();
    }

    _renderField(field, value) {
        switch (field.type) {
            case 'text':
                return `
                <div class="cms-field">
                    <label class="settings-label" for="cms-${field.key}">${field.label}</label>
                    <input class="settings-input" type="text" id="cms-${field.key}" data-field="${field.key}" value="${esc(value || '')}">
                </div>`;
            case 'textarea':
            case 'html':
                return `
                <div class="cms-field">
                    <label class="settings-label" for="cms-${field.key}">${field.label}${field.hint ? ` <span class="cms-hint">(${field.hint})</span>` : ''}</label>
                    <textarea class="settings-input cms-textarea" id="cms-${field.key}" data-field="${field.key}" rows="4">${esc(value || '')}</textarea>
                </div>`;
            case 'select':
                return `
                <div class="cms-field">
                    <label class="settings-label" for="cms-${field.key}">${field.label}</label>
                    <select class="settings-input" id="cms-${field.key}" data-field="${field.key}">
                        ${field.options.map(o => `<option value="${o.value}"${String(value) === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
                    </select>
                </div>`;
            case 'color':
                return `
                <div class="cms-field cms-field--color">
                    <label class="settings-label" for="cms-${field.key}">${field.label}</label>
                    <input class="settings-input" type="color" id="cms-${field.key}" data-field="${field.key}" value="${value || '#7E8F79'}">
                </div>`;
            case 'string-list':
                return this._renderStringList(field, value);
            case 'list':
                return this._renderItemList(field, value);
            default:
                return '';
        }
    }

    _renderStringList(field, value) {
        const items = Array.isArray(value) ? value : [];
        return `
        <div class="cms-field cms-field--list">
            <label class="settings-label">${field.label}</label>
            <div class="cms-strlist" data-field="${field.key}">
                ${items.map((it, i) => `
                    <div class="cms-strlist-row">
                        <input class="settings-input" type="text" value="${esc(it)}" data-idx="${i}" aria-label="Ítem ${i + 1}">
                        <button type="button" class="cms-remove-btn" data-remove="${i}" aria-label="Eliminar ítem"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                `).join('')}
            </div>
            <button type="button" class="cms-add-btn" data-add-str="${field.key}"><i class="fa-solid fa-plus"></i> Añadir</button>
        </div>`;
    }

    _renderItemList(field, value) {
        const items = Array.isArray(value) ? value : [];
        return `
        <div class="cms-field cms-field--list">
            <label class="settings-label">${field.label}</label>
            <div class="cms-itemlist" data-field="${field.key}">
                ${items.map((it, i) => this._renderItemRow(field, it, i)).join('')}
            </div>
            <button type="button" class="cms-add-btn" data-add-list="${field.key}"><i class="fa-solid fa-plus"></i> Añadir elemento</button>
        </div>`;
    }

    _renderItemRow(field, item, idx) {
        return `
        <div class="cms-itemrow" data-idx="${idx}">
            <div class="cms-itemrow-head">
                <span class="cms-itemrow-title">Elemento ${idx + 1}</span>
                <button type="button" class="cms-remove-btn" data-remove-list="${field.key}" data-idx="${idx}" aria-label="Eliminar elemento"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div class="cms-itemrow-grid">
                ${field.itemFields.map(f =>
                    this._renderItemField(f, item[f.key])
                ).join('')}
            </div>
        </div>`;
    }

    _renderItemField(field, value) {
        switch (field.type) {
            case 'textarea':
                return `
                <div class="cms-itemfield">
                    <label class="settings-label">${field.label}</label>
                    <textarea class="settings-input cms-textarea" data-itemkey="${field.key}" rows="3">${esc(value || '')}</textarea>
                </div>`;
            case 'color':
                return `
                <div class="cms-itemfield">
                    <label class="settings-label">${field.label}</label>
                    <input class="settings-input" type="color" data-itemkey="${field.key}" value="${value || '#7E8F79'}">
                </div>`;
            case 'select':
                return `
                <div class="cms-itemfield">
                    <label class="settings-label">${field.label}</label>
                    <select class="settings-input" data-itemkey="${field.key}">
                        ${field.options.map(o => `<option value="${o.value}"${String(value) === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
                    </select>
                </div>`;
            default:
                return `
                <div class="cms-itemfield">
                    <label class="settings-label">${field.label}</label>
                    <input class="settings-input" type="text" data-itemkey="${field.key}" value="${esc(value || '')}">
                </div>`;
        }
    }

    /* ---- Lectura del formulario ---- */

    _readFieldValue(field) {
        const el = this.container.querySelector(`[data-field="${field.key}"]`);
        if (!el) return undefined;
        if (field.type === 'string-list') return this._readStringList(field.key);
        if (field.type === 'list') return this._readItemList(field.key, field);
        return el.value;
    }

    _readStringList(key) {
        const wrap = this.container.querySelector(`[data-field="${key}"].cms-strlist`);
        if (!wrap) return [];
        return Array.from(wrap.querySelectorAll('input')).map(i => i.value).filter(v => v.trim() !== '');
    }

    _readItemList(key, field) {
        const wrap = this.container.querySelector(`[data-field="${key}"].cms-itemlist`);
        if (!wrap) return [];
        return Array.from(wrap.querySelectorAll('.cms-itemrow')).map(row => {
            const item = {};
            row.querySelectorAll('[data-itemkey]').forEach(input => {
                item[input.dataset.itemkey] = input.value;
            });
            return item;
        });
    }

    _collectSectionData(def) {
        const data = {};
        def.fields.forEach(f => {
            const v = this._readFieldValue(f);
            if (v !== undefined) data[f.key] = v;
        });
        return data;
    }

    /* ---- Interacciones ---- */

    _bindFieldEvents(scope) {
        // Inputs y textareas marcan "sin guardar".
        scope.querySelectorAll('input, textarea, select').forEach(el => {
            el.addEventListener('input', () => this._markDirty());
            el.addEventListener('change', () => this._markDirty());
        });

        // Añadir string
        scope.querySelectorAll('[data-add-str]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.addStr;
                const wrap = scope.querySelector(`[data-field="${key}"].cms-strlist`);
                if (wrap) {
                    const div = document.createElement('div');
                    div.className = 'cms-strlist-row';
                    div.innerHTML = `
                        <input class="settings-input" type="text" value="" aria-label="Ítem nuevo">
                        <button type="button" class="cms-remove-btn" aria-label="Eliminar ítem"><i class="fa-solid fa-xmark"></i></button>`;
                    wrap.appendChild(div);
                    this._bindRemoveBtns(div);
                    this._markDirty();
                }
            });
        });

        // Añadir item (objeto)
        scope.querySelectorAll('[data-add-list]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.addList;
                const field = this._activeFieldDef(key);
                if (!field) return;
                const wrap = scope.querySelector(`[data-field="${key}"].cms-itemlist`);
                if (wrap) {
                    const div = document.createElement('div');
                    div.className = 'cms-itemrow';
                    div.innerHTML = this._renderItemRow(field, {}, wrap.children.length);
                    div.innerHTML += '';
                    wrap.appendChild(div);
                    this._bindRemoveBtns(div);
                    this._markDirty();
                }
            });
        });

        this._bindRemoveBtns(scope);
    }

    _activeFieldDef(key) {
        const def = SECTIONS.find(s => s.id === this._activeSection);
        if (!def) return null;
        return def.fields.find(f => f.key === key);
    }

    _bindRemoveBtns(scope) {
        scope.querySelectorAll('.cms-remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.cms-strlist-row') || btn.closest('.cms-itemrow');
                if (row) {
                    row.remove();
                    this._markDirty();
                }
            });
        });
    }

    /* ---- Guardado ---- */

    _markDirty() {
        const btn = this.container.querySelector('#cmsSaveAll');
        if (btn) btn.disabled = false;
    }

    _bindSave() {
        const btn = this.container.querySelector('#cmsSaveAll');
        if (!btn) return;
        btn.addEventListener('click', () => this._saveAll());
    }

    async _saveAll() {
        if (this._saving) return;
        const btn = this.container.querySelector('#cmsSaveAll');
        this._saving = true;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner spinner--sm"></span> Guardando…';
        }

        // Persistir la sección activa hacia el draft (si cambió de pestaña se
        // ya guardó; esto cubre el caso de guardar sin cambiar de pestaña).
        const activeDef = SECTIONS.find(s => s.id === this._activeSection);
        if (activeDef) this._draft[this._activeSection] = this._collectSectionData(activeDef);

        const pending = [];
        SECTIONS.forEach(def => {
            const data = this._draft[def.id] || {};
            Object.entries(data).forEach(([key, value]) => {
                const isList = Array.isArray(value);
                pending.push({
                    section: def.id,
                    item_key: key,
                    content: isList ? null : (typeof value === 'string' ? value : JSON.stringify(value)),
                    content_json: isList ? value : null,
                    sort_order: 0
                });
            });
        });

        let errors = 0;
        for (const item of pending) {
            const { error } = await cmsService.saveItem(item);
            if (error) {
                errors++;
                console.error('cms save error', item.section, item.item_key, error);
            }
        }

        this._saving = false;
        if (btn) btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';

        if (errors === 0) {
            window.app?.toast?.success?.('Contenido publicado', 'La página principal ya muestra los cambios.');
        } else {
            window.app?.toast?.error?.('Error parcial', `No se pudieron guardar ${errors} campo(s).`);
        }
    }
}