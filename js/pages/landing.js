// js/pages/landing.js
// Página principal (landing) de CONTEXTO — Psicología.
// Reutiliza las variables globales de tema (css/themes/variables.css) para
// mantener coherencia visual con el Dashboard. No depende de frameworks.

import { bookingRequestsService, buildWhatsAppUrl } from '../services/bookingRequestsService.js';
import { cmsService } from '../services/cmsService.js';
import { siteSettingsService } from '../services/siteSettingsService.js';
import { cookieBanner } from '../components/cookieBanner.js';

export class LandingPage {
    constructor() {
        this.container = document.getElementById('pageBody');
        this._scrollHandler = null;
        this._keydownHandler = null;
        this._revealObserver = null;
        this._navObserver = null;
        this._cms = null;
        this._settings = null;
    }

    async render() {
        if (!this.container) return;

        this.container.className = 'page-body';
        this.container.innerHTML = '<div class="lp-page"><div class="lp-skeleton" aria-label="Cargando contenido">' +
            '<div class="lp-skeleton-block lp-skeleton-hero"></div>' +
            '<div class="lp-skeleton-block lp-skeleton-grid"></div>' +
            '</div></div>';

        // Contenido dinámico de la landing + ajustes globales (en paralelo).
        const [cms, settings] = await Promise.all([
            cmsService.getLandingContent().catch(() => null),
            siteSettingsService.getAll().catch(() => null)
        ]);
        this._cms = cms || cmsService.getDefaultContent();
        this._settings = settings || null;

        this.container.innerHTML = this._template();

        this._bindTheme();
        this._bindHeaderScroll();
        this._bindMobileNav();
        this._bindScrollLinks();
        this._bindFaq();
        this._bindReveal();
        this._bindActiveNav();
        this._bindCalendar();
        this._bindBookingForm();
        cookieBanner.ensure();
    }

    destroy() {
        cookieBanner.remove();
        if (this._scrollHandler) {
            window.removeEventListener('scroll', this._scrollHandler);
            this._scrollHandler = null;
        }
        if (this._keydownHandler) {
            window.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }
        if (this._revealObserver) {
            this._revealObserver.disconnect();
            this._revealObserver = null;
        }
        if (this._navObserver) {
            this._navObserver.disconnect();
            this._navObserver = null;
        }
    }

    /* ---------------------------------------------------------- */
    _template() {
        return `
        <div class="lp-page" id="lpPage">

            <!-- ============ HEADER ============ -->
            <header class="lp-header" id="lpHeader">
                <div class="lp-container lp-header-inner">
                    <a href="#inicio" class="lp-brand" data-scroll="inicio" aria-label="CONTEXTO Psicología - Inicio">
                        ${this._brandMark()}
                        <span>
                            <span class="lp-brand-name">CONTEXTO</span>
                            <span class="lp-brand-sub">Psicología</span>
                        </span>
                    </a>

                    <nav class="lp-nav" id="lpNav" aria-label="Navegación principal">
                        <a href="#inicio" data-scroll="inicio">Inicio</a>
                        <a href="#servicios" data-scroll="servicios">Servicios</a>
                        <a href="#especialidades" data-scroll="especialidades">Especialidades</a>
                        <a href="#nosotros" data-scroll="nosotros">Nosotros</a>
                        <a href="#agendar" data-scroll="agendar">Agendar</a>
                    </nav>

                    <div class="lp-header-actions">
                        <button class="lp-icon-toggle lp-theme-toggle" id="lpThemeToggle" type="button"
                                aria-label="Cambiar tema claro/oscuro" aria-pressed="false">
                            <svg class="lp-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
                            <svg class="lp-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>
                        </button>
                        <a href="#agendar" class="lp-btn lp-btn--primary" data-scroll="agendar">Agendar cita</a>
                        <button class="lp-icon-toggle lp-nav-toggle" id="lpNavToggle" type="button"
                                aria-label="Abrir menú" aria-expanded="false" aria-controls="lpMobileNav">
                            <span class="lp-hb"></span><span class="lp-hb"></span><span class="lp-hb"></span>
                        </button>
                    </div>
                </div>
            </header>

            <nav class="lp-mobile-nav" id="lpMobileNav" aria-label="Navegación móvil">
                <a href="#inicio" data-scroll="inicio"><span class="lp-mnav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a13 13 0 0 0 0 18M12 3a13 13 0 0 1 0 18M3.5 9h17M3.5 15h17"/></svg></span>Inicio</a>
                <a href="#servicios" data-scroll="servicios"><span class="lp-mnav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><path d="M7 3.5h7l4 4V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/></svg></span>Servicios</a>
                <a href="#especialidades" data-scroll="especialidades"><span class="lp-mnav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg></span>Especialidades</a>
                <a href="#nosotros" data-scroll="nosotros"><span class="lp-mnav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg></span>Nosotros</a>
                <a href="#agendar" data-scroll="agendar"><span class="lp-mnav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v3M16 3v3"/></svg></span>Agendar</a>
                <a href="#agendar" class="lp-btn lp-btn--primary" data-scroll="agendar">Agendar cita</a>
            </nav>

            <main id="inicio">

                <!-- ============ HERO ============ -->
                <section class="lp-hero">
                    <div class="lp-container lp-hero-grid">
                        <div class="lp-hero-copy">
                            <span class="lp-eyebrow">${this._t('hero', 'eyebrow')}</span>
                            <h1>${this._t('hero', 'title')}</h1>
                            <p class="lp-hero-desc">${this._t('hero', 'description')}</p>
                            <div class="lp-hero-actions">
                                <a href="#agendar" class="lp-btn lp-btn--primary" data-scroll="agendar">
                                    ${this._t('hero', 'cta_primary')}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                                </a>
                                <a href="#especialidades" class="lp-btn lp-btn--ghost" data-scroll="especialidades">${this._t('hero', 'cta_secondary')}</a>
                            </div>
                            <div class="lp-hero-stats">
                                ${this._statsHtml()}
                            </div>
                        </div>

                        <div class="lp-hero-visual">
                            <div class="lp-hero-orbit" aria-hidden="true">
                                <div class="lp-orbit-ring lp-orbit-ring--1"></div>
                                <div class="lp-orbit-ring lp-orbit-ring--2"></div>
                                <div class="lp-orbit-ring lp-orbit-ring--3"></div>
                            </div>
                            ${this._heroDiagram()}
                        </div>
                    </div>
                </section>

                <!-- ============ TRUST STRIP ============ -->
                <div class="lp-trust">
                    <div class="lp-container lp-trust-inner">
                        ${this._trustItems()}
                    </div>
                </div>

                <!-- ============ SERVICIOS ============ -->
                <section class="lp-section lp-section--alt" id="servicios">
                    <div class="lp-container">
                        <div class="lp-section-head is-center">
                            <span class="lp-eyebrow" style="justify-content:center;">${this._t('servicios', 'eyebrow')}</span>
                            <h2 class="lp-section-title">${this._t('servicios', 'title')}</h2>
                        </div>
                        <div class="lp-services-grid">
                            ${this._servicesHtml()}
                        </div>
                    </div>
                </section>

                <!-- ============ ESPECIALIDADES ============ -->
                <section class="lp-section" id="especialidades">
                    <div class="lp-container">
                        <div class="lp-section-head lp-reveal">
                            <span class="lp-eyebrow lp-eyebrow--brand">${this._t('especialidades', 'eyebrow')}</span>
                            <h2 class="lp-section-title">${this._t('especialidades', 'title')}</h2>
                            <p class="lp-section-desc">${this._t('especialidades', 'description')}</p>
                        </div>

                        <div class="lp-approach-wrap">
                            <div class="lp-approach-diagram lp-reveal" aria-hidden="true">
                                ${this._approachDiagram()}
                            </div>
                            <div class="lp-pillars-grid">
                                ${this._pillarsHtml()}
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ============ SOBRE CONTEXTO ============ -->
                <section class="lp-section lp-section--alt" id="nosotros">
                    <div class="lp-container">
                        <div class="lp-section-head lp-reveal">
                            <span class="lp-eyebrow">${this._t('nosotros', 'eyebrow')}</span>
                            <h2 class="lp-section-title">${this._t('nosotros', 'title')}</h2>
                        </div>
                        <div class="lp-about-grid">
                            <div class="lp-about-copy lp-reveal">
                                <p>${this._t('nosotros', 'paragraph1')}</p>
                                <p>${this._t('nosotros', 'paragraph2')}</p>
                                <div class="lp-about-values">
                                    ${this._aboutValuesHtml()}
                                </div>
                            </div>
                            <div class="lp-about-card lp-reveal">
                                <h3>${this._t('nosotros', 'card_title')}</h3>
                                <p>${this._t('nosotros', 'card_text')}</p>
                                <p class="lp-about-meta"><i class="fa-solid fa-location-dot"></i> ${this._t('nosotros', 'card_meta')}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ============ PROCESO ============ -->
                <section class="lp-section" id="proceso">
                    <div class="lp-container">
                        <div class="lp-section-head lp-reveal">
                            <span class="lp-eyebrow">${this._t('proceso', 'eyebrow')}</span>
                            <h2 class="lp-section-title">${this._t('proceso', 'title')}</h2>
                        </div>
                        <div class="lp-method-row">
                            ${this._processStepsHtml()}
                        </div>
                    </div>
                </section>

                <!-- ============ EQUIPO ============ -->
                <section class="lp-section lp-section--alt" id="equipo">
                    <div class="lp-container">
                        <div class="lp-section-head is-center lp-reveal">
                            <span class="lp-eyebrow" style="justify-content:center;">${this._t('equipo', 'eyebrow')}</span>
                            <h2 class="lp-section-title">${this._t('equipo', 'title')}</h2>
                        </div>
                        <div class="lp-team-grid">
                            ${this._teamHtml()}
                        </div>
                    </div>
                </section>

                <!-- ============ TESTIMONIOS ============ -->
                <section class="lp-section" id="testimonios">
                    <div class="lp-container">
                        <div class="lp-section-head is-center lp-reveal">
                            <span class="lp-eyebrow" style="justify-content:center;">${this._t('testimonios', 'eyebrow')}</span>
                            <h2 class="lp-section-title">${this._t('testimonios', 'title')}</h2>
                        </div>
                        <div class="lp-testimonial-grid">
                            ${this._testimonialsHtml()}
                        </div>
                    </div>
                </section>

                <!-- ============ FAQ ============ -->
                <section class="lp-section lp-section--alt" id="preguntas">
                    <div class="lp-container">
                        <div class="lp-section-head is-center lp-reveal">
                            <span class="lp-eyebrow" style="justify-content:center;">${this._t('faq', 'eyebrow')}</span>
                            <h2 class="lp-section-title">${this._t('faq', 'title')}</h2>
                        </div>
                        <div class="lp-faq-list lp-reveal">
                            ${this._faqHtml()}
                        </div>
                    </div>
                </section>

                <!-- ============ CTA FINAL ============ -->
                <section class="lp-section">
                    <div class="lp-container">
                        <div class="lp-cta-banner lp-reveal">
                            <div>
                                <h2>${this._t('cta', 'title')}</h2>
                                <p>${this._t('cta', 'description')}</p>
                            </div>
                            <div class="lp-cta-actions">
                                <a href="#agendar" class="lp-btn lp-btn--light" data-scroll="agendar">${this._t('cta', 'button_primary')}</a>
                                <a href="#agendar" class="lp-btn lp-btn--ghost" data-scroll="agendar" style="border-color:rgba(244,244,251,0.4); color:#f4f4fb;">${this._t('cta', 'button_secondary')}</a>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ============ AGENDA TU CITA ============ -->
                <section class="lp-section lp-section--alt" id="agendar">
                    <div class="lp-container">
                        <div class="lp-section-head is-center lp-reveal">
                            <span class="lp-eyebrow" style="justify-content:center;">${this._t('agendar', 'eyebrow')}</span>
                            <h2 class="lp-section-title">${this._t('agendar', 'title')}</h2>
                            <p class="lp-section-desc" style="margin-left:auto;margin-right:auto;">Elige el servicio, la modalidad y tu horario preferido. Te confirmamos en menos de ${this._confirmHoursHtml()} horas por WhatsApp.</p>
                        </div>

                        <div class="lp-booking-grid">
                            <div class="lp-booking-info lp-reveal">
                                <h4>Si reservas con nosotros</h4>
                                <div class="lp-booking-perks">
                                    <div class="lp-booking-perk">
                                        <span class="lp-booking-perk-ico"><i class="fa-solid fa-bolt"></i></span>
                                        <div><strong>Confirmación en menos de 24h</strong><small>Recibes respuesta por WhatsApp o correo.</small></div>
                                    </div>
                                    <div class="lp-booking-perk">
                                        <span class="lp-booking-perk-ico"><i class="fa-solid fa-calendar-check"></i></span>
                                        <div><strong>Reprograma gratis</strong><small>Si surge un imprevisto, movemos tu cita sin costo.</small></div>
                                    </div>
                                    <div class="lp-booking-perk">
                                        <span class="lp-booking-perk-ico"><i class="fa-solid fa-shield-halved"></i></span>
                                        <div><strong>Confidencialidad total</strong><small>Tus datos y tu proceso se manejan con estricta privacidad.</small></div>
                                    </div>
                                    <div class="lp-booking-perk">
                                        <span class="lp-booking-perk-ico"><i class="fa-solid fa-bell"></i></span>
                                        <div><strong>Recordatorio antes de tu cita</strong><small>Te avisamos por WhatsApp cuando se acerca el día.</small></div>
                                    </div>
                                </div>

                                <div class="lp-booking-banner">
                                    <p>¿Prefieres resolver tus dudas directo? Escríbenos por WhatsApp</p>
                                    <a class="lp-btn lp-btn--wa" href="${this._whatsAppUrl()}" target="_blank" rel="noopener">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5Z"/><path d="M9 10c0 3 2 5 5 5l1-1.5-1.5-1-1 .5a4.5 4.5 0 0 1-2-2L11 10 10 8.5 8.5 9.5 9 10z" opacity="0.9"/></svg>
                                        Escribir por WhatsApp
                                    </a>
                                </div>

                                <ul class="lp-booking-channels">
                                    <li><i class="fa-solid fa-envelope"></i> ${this._footer('contact_email')}</li>
                                    <li><i class="fa-solid fa-phone"></i> ${this._footer('contact_phone')} · ${this._scheduleSummaryHtml()}</li>
                                    <li><i class="fa-solid fa-location-dot"></i> Atención presencial y online</li>
                                </ul>
                            </div>

                            <form class="lp-booking-form lp-reveal" id="lpBookingForm" novalidate>
                                <div class="lp-form-row">
                                    <div class="lp-form-group">
                                        <label class="lp-form-label" for="bkName">Nombre completo <span style="color:var(--lp-cyan);">*</span></label>
                                        <input class="lp-input" type="text" id="bkName" name="fullName" placeholder="Tu nombre" required autocomplete="name">
                                    </div>
                                    <div class="lp-form-group">
                                        <label class="lp-form-label" for="bkPhone">WhatsApp / teléfono <span style="color:var(--lp-cyan);">*</span></label>
                                        <input class="lp-input" type="tel" id="bkPhone" name="phone" placeholder="+502 …" required autocomplete="tel">
                                    </div>
                                </div>
                                <div class="lp-form-group">
                                    <label class="lp-form-label" for="bkEmail">Correo electrónico</label>
                                    <input class="lp-input" type="email" id="bkEmail" name="email" placeholder="tu@email.com" autocomplete="email">
                                </div>
                                <div class="lp-form-row">
                                    <div class="lp-form-group">
                                        <label class="lp-form-label" for="bkService">Servicio <span style="color:var(--lp-cyan);">*</span></label>
                                        <select class="lp-input lp-input--select" id="bkService" name="serviceType" required>
                                            ${this._serviceOptionsHtml()}
                                        </select>
                                    </div>
                                    <div class="lp-form-group">
                                        <label class="lp-form-label" for="bkModality">Modalidad <span style="color:var(--lp-cyan);">*</span></label>
                                        <select class="lp-input lp-input--select" id="bkModality" name="modality" required>
                                            <option value="Presencial">Presencial</option>
                                            <option value="Online">Online</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="lp-form-row">
                                    <div class="lp-form-group">
                                        <label class="lp-form-label" for="bkDate">Fecha preferida <span style="color:var(--lp-cyan);">*</span></label>
                                        <div class="lp-calendar" id="bkCalendar">
                                            <div class="lp-cal-head">
                                                <button class="lp-cal-nav" type="button" data-cal-nav="prev" aria-label="Mes anterior">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
                                                </button>
                                                <span class="lp-cal-title" data-cal-title></span>
                                                <button class="lp-cal-nav" type="button" data-cal-nav="next" aria-label="Mes siguiente">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                                                </button>
                                            </div>
                                            <div class="lp-cal-grid" data-cal-grid></div>
                                        </div>
                                        <input type="hidden" id="bkDate" name="preferredDate">
                                        <p class="lp-cal-hint">Días pasados no disponibles. Mientras antes reserves, mejor horario.</p>
                                    </div>
                                    <div class="lp-form-group">
                                        <label class="lp-form-label" id="bkTimeLabel">Horario preferido <span style="color:var(--lp-cyan);">*</span></label>
                                        <div class="lp-time-grid" id="bkTimeGrid" aria-labelledby="bkTimeLabel"></div>
                                        <input type="hidden" id="bkTime" name="preferredTime">
                                        <p class="lp-cal-hint" id="bkTimeHint"></p>
                                    </div>
                                </div>
                                <div class="lp-form-group">
                                    <label class="lp-form-label" for="bkMsg">¿En qué podemos acompañarte? <span style="color:var(--lp-cyan);">(opcional)</span></label>
                                    <textarea class="lp-textarea" id="bkMsg" name="message" placeholder="Cuéntanos brevemente tu motivo de consulta."></textarea>
                                </div>
                                <button type="submit" class="lp-btn lp-btn--primary" style="width:100%;">Solicitar mi cita</button>
                                <p class="lp-booking-status" id="lpBookingStatus" role="status"></p>
                                <p class="lp-form-note">Tus datos se usan únicamente para contactarte y agendar tu cita.</p>
                            </form>
                        </div>
                    </div>
                </section>

            </main>

            <!-- ============ FOOTER ============ -->
            <footer class="lp-footer" id="lpFooter">
                <div class="lp-container">
                    <div class="lp-footer-top">
                        <div class="lp-footer-brand">
                            <a href="#inicio" class="lp-brand" data-scroll="inicio">
                                ${this._brandMark('#fbf7ee')}
                                <span>
                                    <span class="lp-brand-name">CONTEXTO</span>
                                    <span class="lp-brand-sub">Psicología</span>
                                </span>
                            </a>
                            <p>${this._footer('description')}</p>
                        </div>

                        <nav class="lp-footer-col" aria-label="Navegación del pie">
                            <h4>Navegación</h4>
                            <div class="lp-footer-links">
                                <a href="#inicio" data-scroll="inicio">Inicio</a>
                                <a href="#servicios" data-scroll="servicios">Servicios</a>
                                <a href="#especialidades" data-scroll="especialidades">Especialidades</a>
                                <a href="#nosotros" data-scroll="nosotros">Nosotros</a>
                                <a href="#agendar" data-scroll="agendar">Agendar</a>
                            </div>
                        </nav>

                        <div class="lp-footer-col">
                            <h4>Contacto</h4>
                            <div class="lp-footer-contact">
                                <span><i class="fa-solid fa-envelope"></i> ${this._footer('contact_email')}</span>
                                <span><i class="fa-solid fa-phone"></i> ${this._footer('contact_phone')}</span>
                            </div>
                        </div>
                    </div>

                    <div class="lp-footer-bottom">
                        <span>© 2026 CONTEXTO Psicología · Centro de Ciencias Comportamentales</span>
                        <span>
                            <a href="#/privacidad">Privacidad</a> ·
                            <a href="#/cookies">Cookies</a> ·
                            <a href="#/aviso-legal">Aviso legal</a>
                        </span>
                    </div>
                </div>
            </footer>

        </div>`;
    }

    /* ---------------- Helpers de contenido dinámico (CMS) ---------------- */

    // Valor textual de una sección/clave. Si no existe → usa '…'.
    _t(section, key) {
        const val = this._cms && this._cms[section] && this._cms[section][key];
        return (val === undefined || val === null) ? '…' : val;
    }

    // Ayuda tipada para arrays del CMS.
    _list(section, key = 'items') {
        const arr = this._cms && this._cms[section] && this._cms[section][key];
        return Array.isArray(arr) ? arr : [];
    }

    _statsHtml() {
        return this._list('hero', 'stats').map(s =>
            `<div class="lp-stat"><div class="lp-stat-num">${this._esc(s.num)}</div><div class="lp-stat-label">${this._esc(s.label)}</div></div>`
        ).join('');
    }

    _trustItems() {
        return this._list('trust').map(t => `<span>${this._esc(t)}</span>`).join('');
    }

    _servicesHtml() {
        return this._list('servicios').map(s => this._serviceCard(s)).join('');
    }

    _pillarsHtml() {
        return this._list('especialidades').map(p => this._pillar(p.title, p.desc, p.color)).join('');
    }

    _aboutValuesHtml() {
        return this._list('nosotros', 'values').map(v =>
            `<div class="lp-value"><i class="fa-solid ${this._esc(v.icon)}"></i> ${this._esc(v.label)}</div>`
        ).join('');
    }

    _processStepsHtml() {
        return this._list('proceso').map(p => this._methodStep(p.num, p.title, p.desc)).join('');
    }

    _teamHtml() {
        return this._list('equipo').map(m => this._teamCard(m)).join('');
    }

    _testimonialsHtml() {
        return this._list('testimonios').map(t => this._testimonial(t)).join('');
    }

    _faqHtml() {
        const items = this._list('faq');
        return items.map((f, i) => this._faq(i === 0, f.q, f.a)).join('');
    }

    _footer(key) {
        const val = this._cms && this._cms.footer && this._cms.footer[key];
        return val || '';
    }

    // Número de WhatsApp del consultorio (desde site_settings) con fallback.
    _whatsAppNumber() {
        if (this._settings && this._settings.whatsapp_number) {
            return String(this._settings.whatsapp_number).replace(/\D/g, '');
        }
        return '50212345678';
    }

    _whatsAppUrl() {
        return buildWhatsAppUrl(this._whatsAppNumber(), 'Hola CONTEXTO, me gustaría agendar una consulta.');
    }

    _confirmHoursHtml() {
        const h = this._settings && this._settings.booking_confirm_hours;
        return h ? String(h) : '24';
    }

    // Resumen de horario: "Lun a Vie · 8:00–20:00" desde work_schedule.
    _scheduleSummaryHtml() {
        const ws = this._settings && this._settings.work_schedule;
        if (!ws) return 'Lun a Vie · 8:00–20:00';
        let schedule = ws;
        if (typeof schedule === 'string') {
            try { schedule = JSON.parse(schedule); } catch { return 'Horarios flexibles'; }
        }
        const weekdays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
        const weekdayTimes = weekdays
            .map(d => schedule[d])
            .filter(v => v && v !== 'cerrado');
        const first = weekdayTimes[0];
        if (first && weekdayTimes.every(t => t === first)) {
            return `Lun a Vie · ${first.replace('-', '–')}`;
        }
        return 'Lun a Vie · 8:00–20:00';
    }

    // Opciones del select de servicios en el formulario de reserva.
    _serviceOptionsHtml() {
        const services = this._list('servicios');
        if (!services.length) {
            return '<option value="Terapia Individual">Terapia Individual</option>';
        }
        return services.map(s =>
            `<option value="${this._esc(s.title)}">${this._esc(s.title)}</option>`
        ).join('');
    }

    _esc(str) {
        const d = document.createElement('div');
        d.textContent = str ?? '';
        return d.innerHTML;
    }

    /* ---------------- SVG / fragmentos reutilizables ---------------- */
    _brandMark(strokeColor) {
        const stroke = strokeColor || 'var(--lp-heading)';
        return `
        <svg class="lp-brand-mark" viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <path d="M64 15C43 15 26 32 26 53c0 21 17 38 38 38" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/>
            <circle class="lp-dot-ring" cx="50" cy="35" r="8.75"/>
            <circle cx="50" cy="35" r="8" fill="#7E8F79"/>
            <circle class="lp-dot-ring" cx="35" cy="53" r="8.75"/>
            <circle cx="35" cy="53" r="8" fill="#1D3348"/>
            <circle class="lp-dot-ring" cx="65" cy="53" r="8.75"/>
            <circle cx="65" cy="53" r="8" fill="#5F757C"/>
            <circle class="lp-dot-ring" cx="50" cy="71" r="8.75"/>
            <circle cx="50" cy="71" r="8" fill="#C7A15F"/>
        </svg>`;
    }

    _heroDiagram() {
        return `
        <svg class="lp-hero-diagram" viewBox="0 0 440 440" fill="none" aria-hidden="true">
            <circle class="lp-soft-line" cx="220" cy="220" r="170" stroke-width="1"/>
            <g class="lp-spin-slow">
                <path class="lp-soft-line" d="M292 90C250 68 198 68 156 92c-42 24-68 68-68 118" stroke-width="7" stroke-linecap="round"/>
            </g>
            <circle class="lp-soft-line-2" cx="220" cy="220" r="86" stroke-width="1.2" stroke-dasharray="2 7"/>
            <path class="lp-soft-line-2" d="M220 148a72 72 0 0 0-72 66M152 224a72 72 0 0 0 68 58M224 282a72 72 0 0 0 68-58M288 220a72 72 0 0 0-64-72" stroke-width="1.3"/>
            <g class="lp-floaty">
                <circle class="lp-dot-ring" cx="220" cy="148" r="26.75"/>
                <circle cx="220" cy="148" r="26" fill="#7E8F79"/>
                <text x="220" y="153" text-anchor="middle" font-family="Inter, sans-serif" font-size="10" fill="#fbf7ee" font-weight="600">CONDUCTA</text>
            </g>
            <g class="lp-floaty--delay">
                <circle class="lp-dot-ring" cx="150" cy="222" r="26.75"/>
                <circle cx="150" cy="222" r="26" fill="#1D3348"/>
                <text x="150" y="219" text-anchor="middle" font-family="Inter, sans-serif" font-size="9.5" fill="#fbf7ee" font-weight="600">COGNI-</text>
                <text x="150" y="229" text-anchor="middle" font-family="Inter, sans-serif" font-size="9.5" fill="#fbf7ee" font-weight="600">CIÓN</text>
            </g>
            <g class="lp-floaty">
                <circle class="lp-dot-ring" cx="290" cy="222" r="26.75"/>
                <circle cx="290" cy="222" r="26" fill="#5F757C"/>
                <text x="290" y="219" text-anchor="middle" font-family="Inter, sans-serif" font-size="9.5" fill="#fbf7ee" font-weight="600">EMO-</text>
                <text x="290" y="229" text-anchor="middle" font-family="Inter, sans-serif" font-size="9.5" fill="#fbf7ee" font-weight="600">CIÓN</text>
            </g>
            <g class="lp-floaty--delay">
                <circle class="lp-dot-ring" cx="220" cy="292" r="26.75"/>
                <circle cx="220" cy="292" r="26" fill="#C7A15F"/>
                <text x="220" y="297" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="#2b2313" font-weight="600">CONTEXTO</text>
            </g>
            <circle cx="345" cy="150" r="3" fill="#C7A15F"/>
            <circle cx="360" cy="175" r="2" fill="#C7A15F"/>
            <circle cx="335" cy="120" r="2" fill="#7E8F79"/>
            <circle cx="90" cy="310" r="2.5" fill="#7E8F79"/>
        </svg>`;
    }

    _approachDiagram() {
        return `
        <svg viewBox="0 0 400 400" fill="none" aria-hidden="true">
            <circle class="lp-soft-line" cx="200" cy="200" r="150" stroke-width="1"/>
            <path class="lp-soft-line" d="M266 82C230 62 184 62 148 84c-38 23-62 65-62 112" stroke-width="6" stroke-linecap="round"/>
            <circle class="lp-soft-line-2" cx="200" cy="200" r="78" stroke-width="1.2" stroke-dasharray="2 7"/>
            <circle class="lp-dot-ring" cx="200" cy="132" r="24.75"/>
            <circle cx="200" cy="132" r="24" fill="#7E8F79"/>
            <circle class="lp-dot-ring" cx="136" cy="200" r="24.75"/>
            <circle cx="136" cy="200" r="24" fill="#1D3348"/>
            <circle class="lp-dot-ring" cx="264" cy="200" r="24.75"/>
            <circle cx="264" cy="200" r="24" fill="#5F757C"/>
            <circle class="lp-dot-ring" cx="200" cy="268" r="24.75"/>
            <circle cx="200" cy="268" r="24" fill="#C7A15F"/>
        </svg>`;
    }

    _serviceCard(item) {
        const icons = {
            user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
            heart: '<path d="M20.8 8.6c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.8 4.8 0 0 1 8.8-2.7A4.8 4.8 0 0 1 20.8 8.6Z"/>',
            users: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
            child: '<path d="M12 20.5s-7-4.2-9.5-8.4C.8 8.9 2.2 5 6 5c2 0 3.4 1 4 2 .6-1 2-2 4-2 3.8 0 5.2 3.9 3.5 7.1C19 16.3 12 20.5 12 20.5Z"/>',
            clipboard: '<path d="M9 12l2 2 4-4"/><path d="M7 3.5h7l4 4V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/>',
            video: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M8 21h8M12 17v4"/>'
        };
        const icon = icons[item.icon] || icons.user;
        return `
        <div class="lp-service-card lp-reveal">
            <div class="lp-service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></div>
            <h3>${this._esc(item.title)}</h3>
            <p>${this._esc(item.desc)}</p>
            <a href="#agendar" class="lp-service-link" data-scroll="agendar">Agendar sesión <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></a>
        </div>`;
    }

    _pillar(color, title, desc) {
        return `
        <div class="lp-pillar-card lp-reveal">
            <div class="lp-pillar-dot" style="background:${color};"></div>
            <h3>${this._esc(title)}</h3>
            <p>${this._esc(desc)}</p>
        </div>`;
    }

    _methodStep(num, title, desc) {
        return `
        <div class="lp-method-step lp-reveal">
            <div class="lp-method-num">${num}</div>
            <h3>${this._esc(title)}</h3>
            <p>${this._esc(desc)}</p>
        </div>`;
    }

    _teamCard(item) {
        return `
        <div class="lp-team-card lp-reveal">
            <div class="lp-team-avatar" style="background:linear-gradient(135deg, ${item.color}, ${item.color}cc);">${item.initials}</div>
            <h3>${this._esc(item.name)}</h3>
            <div class="lp-team-role">${this._esc(item.role)}</div>
            <p class="lp-team-desc">${this._esc(item.desc)}</p>
        </div>`;
    }

    _testimonial(item) {
        return `
        <div class="lp-testimonial-card lp-reveal">
            <span class="lp-testimonial-quote-mark">“</span>
            <p>${this._esc(item.text)}</p>
            <div class="lp-testimonial-author">
                <div class="lp-testimonial-avatar" style="background:linear-gradient(135deg, ${item.color}, ${item.color}cc);">${item.initials}</div>
                <div>
                    <div class="lp-t-name">${this._esc(item.name)}</div>
                    <div class="lp-t-meta">${this._esc(item.meta)}</div>
                </div>
            </div>
        </div>`;
    }

    _faq(open, question, answer) {
        return `
        <div class="lp-faq-item ${open ? 'is-open' : ''}">
            <button class="lp-faq-question" type="button" aria-expanded="${open ? 'true' : 'false'}">
                ${this._esc(question)}
                <span class="lp-faq-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>
            </button>
            <div class="lp-faq-answer">
                <div class="lp-faq-answer-inner">${this._esc(answer)}</div>
            </div>
        </div>`;
    }

    /* ---------------- Interacciones ---------------- */
    _bindTheme() {
        const toggle = this.container.querySelector('#lpThemeToggle');
        if (!toggle) return;
        toggle.addEventListener('click', () => {
            const next = window.app && window.app.themeManager
                ? window.app.themeManager.toggle()
                : (document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
            if (window.app && !window.app.themeManager) {
                document.documentElement.setAttribute('data-theme', next);
            }
            toggle.setAttribute('aria-pressed', String(next === 'dark'));
            toggle.setAttribute('aria-label', next === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
        });
    }

    _bindHeaderScroll() {
        const header = this.container.querySelector('#lpHeader');
        if (!header) return;
        this._scrollHandler = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
        this._scrollHandler();
        window.addEventListener('scroll', this._scrollHandler, { passive: true });
    }

    _bindMobileNav() {
        const toggle = this.container.querySelector('#lpNavToggle');
        const mobileNav = this.container.querySelector('#lpMobileNav');
        if (!toggle || !mobileNav) return;

        const close = () => {
            mobileNav.classList.remove('is-open');
            toggle.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Abrir menú');
        };

        toggle.addEventListener('click', () => {
            const isOpen = mobileNav.classList.toggle('is-open');
            toggle.classList.toggle('is-open', isOpen);
            toggle.setAttribute('aria-expanded', String(isOpen));
            toggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
        });

        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', close);
        });

        this._keydownHandler = (e) => {
            if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) close();
        };
        window.addEventListener('keydown', this._keydownHandler);
    }

    _bindScrollLinks() {
        const links = this.container.querySelectorAll('[data-scroll]');
        const onClick = (e) => {
            const el = e.currentTarget;
            const id = el.getAttribute('data-scroll');
            const target = id ? document.getElementById(id) : null;
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
        links.forEach(link => link.addEventListener('click', onClick));

        // Evitar que los enlaces placeholder de redes sociales cambien el hash.
        this.container.querySelectorAll('a[data-noop]').forEach(link => {
            link.addEventListener('click', (e) => e.preventDefault());
        });
    }

    _bindFaq() {
        this.container.querySelectorAll('.lp-faq-item').forEach(item => {
            const question = item.querySelector('.lp-faq-question');
            const answer = item.querySelector('.lp-faq-answer');

            if (item.classList.contains('is-open')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }

            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('is-open');

                this.container.querySelectorAll('.lp-faq-item.is-open').forEach(openItem => {
                    if (openItem !== item) {
                        openItem.classList.remove('is-open');
                        openItem.querySelector('.lp-faq-answer').style.maxHeight = null;
                        openItem.querySelector('.lp-faq-question').setAttribute('aria-expanded', 'false');
                    }
                });

                if (isOpen) {
                    item.classList.remove('is-open');
                    answer.style.maxHeight = null;
                    question.setAttribute('aria-expanded', 'false');
                } else {
                    item.classList.add('is-open');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    question.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    _bindReveal() {
        const els = this.container.querySelectorAll('.lp-reveal');
        if (!('IntersectionObserver' in window)) {
            els.forEach(el => el.classList.add('is-in'));
            return;
        }
        this._revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    this._revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        els.forEach(el => this._revealObserver.observe(el));
    }

    _bindActiveNav() {
        const navLinks = Array.from(this.container.querySelectorAll('#lpNav a[data-scroll], .lp-mobile-nav a[data-scroll]'));
        const sections = navLinks
            .map(link => document.getElementById(link.getAttribute('data-scroll')))
            .filter(Boolean);

        const setActive = (id) => {
            navLinks.forEach(link => {
                link.classList.toggle('is-active', link.getAttribute('data-scroll') === id);
            });
        };

        if (!('IntersectionObserver' in window) || !sections.length) return;

        this._navObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) setActive(entry.target.id);
            });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

        sections.forEach(sec => this._navObserver.observe(sec));
    }

    _bindCalendar() {
        const cal = this.container.querySelector('#bkCalendar');
        const hidden = this.container.querySelector('#bkDate');
        if (!cal || !hidden) return;

        const grid = cal.querySelector('[data-cal-grid]');
        const titleEl = cal.querySelector('[data-cal-title]');
        const timeGrid = this.container.querySelector('#bkTimeGrid');
        const timeHidden = this.container.querySelector('#bkTime');
        const timeHint = this.container.querySelector('#bkTimeHint');
        if (!grid || !titleEl) return;

        const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
        const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        let view = new Date(currentMonth);

        const pad = n => String(n).padStart(2, '0');
        const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

        const setTimeState = (msg, cls, chipsHtml) => {
            if (timeGrid) timeGrid.innerHTML = chipsHtml || '';
            if (timeHidden) timeHidden.value = '';
            if (timeHint) {
                timeHint.textContent = msg;
                timeHint.className = `lp-cal-hint ${cls || ''}`.trim();
            }
        };

        const loadTimes = async (iso) => {
            setTimeState('Buscando horarios disponibles…', 'is-pending', '<span class="lp-time-loading">Consultando agenda…</span>');
            const { data: slots, error } = await bookingRequestsService.getAvailableTimes(iso);
            if (error) {
                setTimeState('No se pudieron cargar los horarios. Intenta de nuevo.', 'is-error', '');
                return;
            }
            if (!slots.length) {
                setTimeState('No hay horarios disponibles para esta fecha. Prueba con otro día.', 'is-empty', '');
                return;
            }
            const chips = slots.map(t => `<button type="button" class="lp-time-chip" data-time="${t}">${t}</button>`).join('');
            setTimeState(`${slots.length} horario(s) disponible(s). Toca una hora para elegirla.`, 'is-ok', chips);
        };

        // Selección de hora: un clic en el chip la marca.
        timeGrid && timeGrid.addEventListener('click', (e) => {
            const chip = e.target.closest('.lp-time-chip');
            if (!chip) return;
            timeGrid.querySelectorAll('.lp-time-chip.is-selected').forEach(el => el.classList.remove('is-selected'));
            chip.classList.add('is-selected');
            timeHidden.value = chip.dataset.time;
        });

        const render = () => {
            titleEl.textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
            const year = view.getFullYear();
            const month = view.getMonth();
            // Lunes como primer día de la semana.
            const lead = (new Date(year, month, 1).getDay() + 6) % 7;
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            const prevBtn = cal.querySelector('[data-cal-nav="prev"]');
            if (prevBtn) prevBtn.disabled = view.getTime() <= currentMonth.getTime();

            let cells = WEEKDAYS.map(w => `<span class="lp-cal-weekday">${w}</span>`).join('');
            cells += '<span class="lp-cal-empty"></span>'.repeat(lead);
            for (let d = 1; d <= daysInMonth; d++) {
                const iso = toISO(year, month, d);
                const date = new Date(year, month, d);
                const past = date < today;
                const isToday = date.getTime() === today.getTime();
                const isSelected = hidden.value === iso;
                cells += `<button type="button" class="lp-cal-day${past ? ' is-disabled' : ''}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}" data-cal-day="${iso}"${past ? ' disabled' : ''} aria-label="${iso}">${d}</button>`;
            }
            grid.innerHTML = cells;
        };

        grid.addEventListener('click', async (e) => {
            const day = e.target.closest('[data-cal-day]');
            if (!day || day.disabled) return;
            hidden.value = day.dataset.calDay;
            render();
            await loadTimes(hidden.value);
        });

        cal.addEventListener('click', (e) => {
            const nav = e.target.closest('[data-cal-nav]');
            if (!nav || nav.disabled) return;
            const dir = nav.dataset.calNav === 'next' ? 1 : -1;
            view = new Date(view.getFullYear(), view.getMonth() + dir, 1);
            render();
        });

        setTimeState('Elige una fecha para ver los horarios disponibles.', '', '');
        render();

        this._calendarRefresh = () => {
            hidden.value = '';
            timeHidden.value = '';
            setTimeState('Elige una fecha para ver los horarios disponibles.', '', '');
            render();
        };
    }

    _bindBookingForm() {
        const form = this.container.querySelector('#lpBookingForm');
        if (!form) return;

        const statusEl = form.querySelector('#lpBookingStatus');

        const setStatus = (type, text) => {
            if (!statusEl) return;
            statusEl.textContent = text;
            statusEl.className = `lp-booking-status is-${type}`;
        };

        const setBusy = (busy) => {
            const submit = form.querySelector('[type="submit"]');
            if (!submit) return;
            submit.disabled = busy;
            submit.textContent = busy ? 'Enviando solicitud…' : 'Solicitar mi cita';
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            setStatus('', '');

            const fullName = form.querySelector('#bkName').value.trim();
            const phone = form.querySelector('#bkPhone').value.trim();
            const email = form.querySelector('#bkEmail').value.trim();
            const serviceType = form.querySelector('#bkService').value;
            const modality = form.querySelector('#bkModality').value;
            const preferredDate = form.querySelector('#bkDate').value;
            const preferredTime = form.querySelector('#bkTime').value;
            const message = form.querySelector('#bkMsg').value.trim();

            if (!fullName || !phone || !preferredDate || !preferredTime) {
                setStatus('error', 'Completa nombre, teléfono, fecha y horario.');
                return;
            }
            if (!/^\+?[\d\s()-]{7,}$/.test(phone)) {
                setStatus('error', 'Revisa el formato de tu teléfono.');
                return;
            }
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setStatus('error', 'Revisa el formato de tu correo electrónico.');
                return;
            }

            setBusy(true);
            const { data, error } = await bookingRequestsService.create({
                fullName,
                phone,
                email,
                serviceType,
                modality,
                preferredDate,
                preferredTime,
                message
            });
            setBusy(false);

            if (!error && data) {
                form.reset();
                if (this._calendarRefresh) this._calendarRefresh();
                setStatus('success', '¡Solicitud recibida! Te confirmamos tu cita en menos de 24 horas.');
                if (window.app && window.app.toast) {
                    window.app.toast.show({
                        type: 'success',
                        title: 'Solicitud enviada',
                        message: `Gracias ${data.fullName.split(' ')[0]}. Te contactaremos en menos de 24 horas.`
                    });
                }
            } else {
                console.error('booking create error:', error);
                setStatus('error', 'No pudimos registrar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.');
            }
        });
    }
}
