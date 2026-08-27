// js/pages/landing.js
// Página principal (landing) de CONTEXTO — Psicología.
// Reutiliza las variables globales de tema (css/themes/variables.css) para
// mantener coherencia visual con el Dashboard. No depende de frameworks.

export class LandingPage {
    constructor() {
        this.container = document.getElementById('pageBody');
        this._scrollHandler = null;
        this._keydownHandler = null;
        this._revealObserver = null;
        this._navObserver = null;
    }

    render() {
        if (!this.container) return;

        this.container.className = 'page-body';
        this.container.innerHTML = this._template();

        this._bindTheme();
        this._bindHeaderScroll();
        this._bindMobileNav();
        this._bindScrollLinks();
        this._bindFaq();
        this._bindReveal();
        this._bindActiveNav();
        this._bindContactForm();
    }

    destroy() {
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
                        <a href="#contacto" data-scroll="contacto">Contacto</a>
                    </nav>

                    <div class="lp-header-actions">
                        <button class="lp-icon-toggle lp-theme-toggle" id="lpThemeToggle" type="button"
                                aria-label="Cambiar tema claro/oscuro" aria-pressed="false">
                            <svg class="lp-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
                            <svg class="lp-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>
                        </button>
                        <a href="/login" class="lp-btn lp-btn--primary" data-link>Agendar cita</a>
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
                <a href="#contacto" data-scroll="contacto"><span class="lp-mnav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2Z"/></svg></span>Contacto</a>
                <a href="/login" class="lp-btn lp-btn--primary" data-link>Agendar cita</a>
            </nav>

            <main id="inicio">

                <!-- ============ HERO ============ -->
                <section class="lp-hero">
                    <div class="lp-container lp-hero-grid">
                        <div class="lp-hero-copy">
                            <span class="lp-eyebrow">Centro de Ciencias Comportamentales</span>
                            <h1>Entender tu <em>contexto</em><br>es el primer paso<br>para cambiar tu historia.</h1>
                            <p class="lp-hero-desc">En CONTEXTO Psicología integramos mente, conducta, emoción y entorno en un mismo proceso terapéutico, con un enfoque clínico basado en evidencia y una escucha genuinamente humana.</p>
                            <div class="lp-hero-actions">
                                <a href="/login" class="lp-btn lp-btn--primary" data-link>
                                    Agendar primera consulta
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                                </a>
                                <a href="#especialidades" class="lp-btn lp-btn--ghost" data-scroll="especialidades">Conocer nuestro enfoque</a>
                            </div>
                            <div class="lp-hero-stats">
                                <div class="lp-stat"><div class="lp-stat-num">12+</div><div class="lp-stat-label">Años de<br>experiencia</div></div>
                                <div class="lp-stat"><div class="lp-stat-num">1.800+</div><div class="lp-stat-label">Pacientes<br>acompañados</div></div>
                                <div class="lp-stat"><div class="lp-stat-num">6</div><div class="lp-stat-label">Especialistas<br>certificados</div></div>
                                <div class="lp-stat"><div class="lp-stat-num">96%</div><div class="lp-stat-label">Satisfacción<br>reportada</div></div>
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
                        <span>Terapia Cognitivo-Conductual</span>
                        <span>Ciencia Conductual Contextual</span>
                        <span>ACT</span>
                        <span>Evaluación Psicométrica</span>
                        <span>Atención Online y Presencial</span>
                    </div>
                </div>

                <!-- ============ SERVICIOS ============ -->
                <section class="lp-section lp-section--alt" id="servicios">
                    <div class="lp-container">
                        <div class="lp-section-head is-center">
                            <span class="lp-eyebrow" style="justify-content:center;">Servicios</span>
                            <h2 class="lp-section-title">Programas terapéuticos a la<br>medida de cada historia.</h2>
                        </div>
                        <div class="lp-services-grid">
                            ${this._serviceCard('Terapia Individual', 'Un espacio confidencial para trabajar ansiedad, estado de ánimo, autoestima y procesos de cambio personal.', 'M20.8 8.6c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.8 4.8 0 0 1 8.8-2.7A4.8 4.8 0 0 1 20.8 8.6Z', 'user')}
                            ${this._serviceCard('Terapia de Pareja', 'Herramientas de comunicación y vínculo para atravesar crisis, reconstruir confianza o fortalecer la relación.', 'M20.8 8.6c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.8 4.8 0 0 1 8.8-2.7A4.8 4.8 0 0 1 20.8 8.6Z', 'heart')}
                            ${this._serviceCard('Terapia Familiar', 'Abordamos dinámicas y roles familiares para mejorar la convivencia y fortalecer los vínculos entre generaciones.', 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2', 'users')}
                            ${this._serviceCard('Psicología Infantil y Adolescente', 'Acompañamos el desarrollo emocional y conductual de niñas, niños y adolescentes junto a sus familias.', 'M12 20.5s-7-4.2-9.5-8.4C.8 8.9 2.2 5 6 5c2 0 3.4 1 4 2 .6-1 2-2 4-2 3.8 0 5.2 3.9 3.5 7.1C19 16.3 12 20.5 12 20.5Z', 'child')}
                            ${this._serviceCard('Evaluación Psicológica', 'Pruebas psicométricas y evaluaciones clínicas para diagnóstico, orientación vocacional o procesos legales.', 'M9 12l2 2 4-4', 'clipboard')}
                            ${this._serviceCard('Terapia Online', 'El mismo acompañamiento clínico, adaptado a un formato remoto seguro, flexible y igual de cercano.', 'M8 21h8M12 17v4', 'video')}
                        </div>
                    </div>
                </section>

                <!-- ============ ESPECIALIDADES ============ -->
                <section class="lp-section" id="especialidades">
                    <div class="lp-container">
                        <div class="lp-section-head lp-reveal">
                            <span class="lp-eyebrow lp-eyebrow--brand">Especialidades y enfoque</span>
                            <h2 class="lp-section-title">Ciencia conductual contextual,<br>aplicada con calidez humana.</h2>
                            <p class="lp-section-desc">No tratamos síntomas aislados: entendemos a cada persona dentro de su historia, su entorno y sus vínculos. Nuestro modelo clínico se sostiene en cuatro pilares que trabajamos siempre en conjunto.</p>
                        </div>

                        <div class="lp-approach-wrap">
                            <div class="lp-approach-diagram lp-reveal" aria-hidden="true">
                                ${this._approachDiagram()}
                            </div>
                            <div class="lp-pillars-grid">
                                ${this._pillar('#7E8F79', 'CONDUCTA', 'Lo que haces frente a cada situación: tus hábitos, respuestas y patrones de acción observables.')}
                                ${this._pillar('#1D3348', 'COGNICIÓN', 'Tus pensamientos, creencias e interpretaciones, y cómo influyen en tus decisiones diarias.')}
                                ${this._pillar('#5F757C', 'EMOCIÓN', 'La forma en que sientes, reconoces y regulas tus emociones en distintos momentos de tu vida.')}
                                ${this._pillar('#C7A15F', 'CONTEXTO', 'El entorno, tus vínculos y las circunstancias reales que rodean cada comportamiento.')}
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ============ SOBRE CONTEXTO ============ -->
                <section class="lp-section lp-section--alt" id="nosotros">
                    <div class="lp-container">
                        <div class="lp-section-head lp-reveal">
                            <span class="lp-eyebrow">Sobre CONTEXTO</span>
                            <h2 class="lp-section-title">Un espacio profesional para<br>comprender y transformar.</h2>
                        </div>
                        <div class="lp-about-grid">
                            <div class="lp-about-copy lp-reveal">
                                <p>CONTEXTO es un centro de ciencias comportamentales que entiende la salud mental como un proceso integral. Combinamos rigor clínico y tecnología para que cada persona reciba un acompañamiento ordenado, privado y humano.</p>
                                <p>Nuestro enfoque respeta el ritmo de cada quien: escuchamos sin apuro, evaluamos con método y construimos un plan claro junto a ti, con objetivos concretos y seguimiento continuo.</p>
                                <div class="lp-about-values">
                                    <div class="lp-value"><i class="fa-solid fa-shield-halved"></i> Privacidad y confidencialidad</div>
                                    <div class="lp-value"><i class="fa-solid fa-heart-pulse"></i> Acompañamiento empático</div>
                                    <div class="lp-value"><i class="fa-solid fa-microscope"></i> Enfoque basado en evidencia</div>
                                    <div class="lp-value"><i class="fa-solid fa-leaf"></i> Bienestar sostenible</div>
                                </div>
                            </div>
                            <div class="lp-about-card lp-reveal">
                                <h3>Tu bienestar comienza cuando decides escucharte.</h3>
                                <p>Cada proceso tiene su propio ritmo. Por eso diseñamos un espacio donde la tecnología sostiene tu atención clínica, sin reemplazar el vínculo con tu profesional.</p>
                                <p class="lp-about-meta"><i class="fa-solid fa-location-dot"></i> Atención presencial y online · Horarios flexibles</p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ============ PROCESO ============ -->
                <section class="lp-section" id="proceso">
                    <div class="lp-container">
                        <div class="lp-section-head lp-reveal">
                            <span class="lp-eyebrow">Cómo trabajamos</span>
                            <h2 class="lp-section-title">Un proceso claro,<br>de principio a fin.</h2>
                        </div>
                        <div class="lp-method-row">
                            ${this._methodStep('01', 'Primer contacto', 'Agendas tu cita por el canal que prefieras y te asignamos al especialista más adecuado para tu motivo de consulta.')}
                            ${this._methodStep('02', 'Evaluación inicial', 'Escuchamos tu historia sin apuro y hacemos una lectura clínica de tu situación actual, sin diagnósticos apresurados.')}
                            ${this._methodStep('03', 'Plan terapéutico', 'Definimos objetivos concretos y medibles junto a ti, y elegimos el enfoque que mejor se adapta a tu contexto.')}
                            ${this._methodStep('04', 'Acompañamiento', 'Damos seguimiento continuo a tu progreso, ajustando el proceso cuantas veces sea necesario.')}
                        </div>
                    </div>
                </section>

                <!-- ============ EQUIPO ============ -->
                <section class="lp-section lp-section--alt" id="equipo">
                    <div class="lp-container">
                        <div class="lp-section-head is-center lp-reveal">
                            <span class="lp-eyebrow" style="justify-content:center;">Equipo</span>
                            <h2 class="lp-section-title">Especialistas que te acompañan<br>con evidencia y empatía.</h2>
                        </div>
                        <div class="lp-team-grid">
                            ${this._teamCard('#6366f1', 'CT', 'Dra. Camila Torres', 'Directora clínica', 'Terapia Cognitivo-Conductual · 14 años de experiencia clínica.')}
                            ${this._teamCard('#06b6d4', 'AR', 'Dr. Andrés Rivas', 'Terapia de pareja y familia', 'Especialista en vínculos y comunicación · 10 años de experiencia.')}
                            ${this._teamCard('#8b5cf6', 'VR', 'Dra. Valentina Ruiz', 'Psicología infantil', 'Desarrollo emocional en niñas, niños y adolescentes · 9 años.')}
                            ${this._teamCard('#a78bfa', 'MS', 'Dr. Mateo Salas', 'Evaluación psicométrica', 'Diagnóstico clínico y orientación vocacional · 8 años.')}
                        </div>
                    </div>
                </section>

                <!-- ============ TESTIMONIOS ============ -->
                <section class="lp-section" id="testimonios">
                    <div class="lp-container">
                        <div class="lp-section-head is-center lp-reveal">
                            <span class="lp-eyebrow" style="justify-content:center;">Testimonios</span>
                            <h2 class="lp-section-title">Historias reales de<br>procesos reales.</h2>
                        </div>
                        <div class="lp-testimonial-grid">
                            ${this._testimonial('#6366f1', 'MJ', 'María J.', 'Terapia individual · 8 meses', 'Llegué sin entender por qué me sentía así todo el tiempo. Hoy tengo herramientas concretas y, sobre todo, entiendo mi propio contexto.')}
                            ${this._testimonial('#8b5cf6', 'DP', 'Diego & Paula', 'Terapia de pareja · 1 año', 'Como pareja llegamos a un punto muerto. El acompañamiento fue claro, honesto y sin juicios. Hoy nos comunicamos de otra forma.')}
                            ${this._testimonial('#a78bfa', 'RL', 'Rocío L.', 'Psicología infantil · 6 meses', 'Mi hijo dejó de ver la terapia como un castigo. El equipo supo explicarle todo con paciencia y eso cambió todo el proceso.')}
                        </div>
                    </div>
                </section>

                <!-- ============ FAQ ============ -->
                <section class="lp-section lp-section--alt" id="preguntas">
                    <div class="lp-container">
                        <div class="lp-section-head is-center lp-reveal">
                            <span class="lp-eyebrow" style="justify-content:center;">Preguntas frecuentes</span>
                            <h2 class="lp-section-title">Todo lo que necesitas<br>saber antes de empezar.</h2>
                        </div>
                        <div class="lp-faq-list lp-reveal">
                            ${this._faq(true, '¿Cómo es la primera sesión?', 'Es una conversación abierta de aproximadamente 50 minutos donde conocemos tu historia y motivo de consulta, sin ningún compromiso de continuar. Al final te explicamos cómo vemos tu situación y qué opciones de acompañamiento tiene sentido explorar.')}
                            ${this._faq(false, '¿Trabajan con obras sociales o seguros?', 'Contamos con convenios con algunas obras sociales y entregamos factura para reintegro con la mayoría de los seguros privados. Escríbenos con el nombre de tu cobertura y te confirmamos antes de tu primera cita.')}
                            ${this._faq(false, '¿Ofrecen sesiones online?', 'Sí, todos nuestros especialistas ofrecen modalidad online mediante videollamada segura, con el mismo formato y duración que una sesión presencial.')}
                            ${this._faq(false, '¿Cuánto dura un proceso terapéutico?', 'Depende de cada historia y objetivo. Algunos procesos duran pocos meses y son focalizados en una situación puntual; otros son de acompañamiento más extendido. Esto se define y se revisa junto a tu especialista.')}
                            ${this._faq(false, '¿Atienden niños y adolescentes?', 'Sí, contamos con especialistas en psicología infantil y adolescente, que trabajan tanto con los niños como con madres, padres o cuidadores según cada caso.')}
                        </div>
                    </div>
                </section>

                <!-- ============ CTA FINAL ============ -->
                <section class="lp-section" id="agendar">
                    <div class="lp-container">
                        <div class="lp-cta-banner lp-reveal">
                            <div>
                                <h2>Da el primer paso hacia tu bienestar.</h2>
                                <p>Agenda tu primera consulta hoy y empieza a entender tu contexto.</p>
                            </div>
                            <div class="lp-cta-actions">
                                <a href="/login" class="lp-btn lp-btn--light" data-link>Agendar cita</a>
                                <a href="#contacto" class="lp-btn lp-btn--ghost" data-scroll="contacto" style="border-color:rgba(244,244,251,0.4); color:#f4f4fb;">Hablar con nosotros</a>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            <!-- ============ CONTACTO ============ -->
            <section class="lp-section lp-section--alt" id="contacto">
                <div class="lp-container">
                    <div class="lp-section-head is-center lp-reveal">
                        <span class="lp-eyebrow" style="justify-content:center;">Contacto</span>
                        <h2 class="lp-section-title">Hablemos de tu<br>bienestar y contexto.</h2>
                        <p class="lp-section-desc" style="margin-left:auto;margin-right:auto;">Escríbenos o agendamos tu primera consulta. Estamos para acompañarte en cada paso del proceso.</p>
                    </div>
                    <div class="lp-contact-grid">
                        <div class="lp-contact-info lp-reveal">
                            <h4>CONTEXTO Psicología</h4>
                            <p>Centro de Ciencias Comportamentales. Atención presencial y online para acompañarte donde estés.</p>
                            <ul class="lp-contact-list">
                                <li><i class="fa-solid fa-envelope"></i> <a href="mailto:contacto@contextopsicologia.com">contacto@contextopsicologia.com</a></li>
                                <li><i class="fa-solid fa-phone"></i> <a href="tel:+50212345678">+502 1234 5678</a></li>
                                <li><i class="fa-solid fa-clock"></i> Lun a Vie · 8:00 - 20:00</li>
                                <li><i class="fa-solid fa-location-dot"></i> Atención presencial y online</li>
                            </ul>
                            <div class="lp-footer-social">
                                <a href="#" aria-label="Instagram" data-noop><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg></a>
                                <a href="#" aria-label="Facebook" data-noop><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 9h3V5h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4v-2a1 1 0 0 1 1-1Z"/></svg></a>
                                <a href="#" aria-label="WhatsApp" data-noop><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5Z"/></svg></a>
                            </div>
                        </div>
                        <form class="lp-contact-form lp-reveal" id="lpContactForm" novalidate>
                            <div class="lp-form-group">
                                <label class="lp-form-label" for="lpName">Nombre <span style="color:var(--lp-cyan);">*</span></label>
                                <input class="lp-input" type="text" id="lpName" name="name" placeholder="Tu nombre" required autocomplete="name">
                            </div>
                            <div class="lp-form-group">
                                <label class="lp-form-label" for="lpEmail">Correo electrónico <span style="color:var(--lp-cyan);">*</span></label>
                                <input class="lp-input" type="email" id="lpEmail" name="email" placeholder="tu@email.com" required autocomplete="email">
                            </div>
                            <div class="lp-form-group">
                                <label class="lp-form-label" for="lpMsg">Mensaje <span style="color:var(--lp-cyan);">*</span></label>
                                <textarea class="lp-textarea" id="lpMsg" name="message" placeholder="¿En qué podemos acompañarte?" required></textarea>
                            </div>
                            <button type="submit" class="lp-btn lp-btn--primary" style="width:100%;">Enviar mensaje</button>
                            <p class="lp-form-note">Demo: este formulario no envía datos a un servidor.</p>
                        </form>
                    </div>
                </div>
            </section>

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
                            <p>Centro de Ciencias Comportamentales. Atención presencial y online.</p>
                        </div>

                        <nav class="lp-footer-col" aria-label="Navegación del pie">
                            <h4>Navegación</h4>
                            <div class="lp-footer-links">
                                <a href="#inicio" data-scroll="inicio">Inicio</a>
                                <a href="#servicios" data-scroll="servicios">Servicios</a>
                                <a href="#especialidades" data-scroll="especialidades">Especialidades</a>
                                <a href="#nosotros" data-scroll="nosotros">Nosotros</a>
                            </div>
                        </nav>

                        <div class="lp-footer-col">
                            <h4>Contacto</h4>
                            <div class="lp-footer-contact">
                                <span><i class="fa-solid fa-envelope"></i> contacto@contextopsicologia.com</span>
                                <span><i class="fa-solid fa-phone"></i> +502 1234 5678</span>
                            </div>
                        </div>
                    </div>

                    <div class="lp-footer-bottom">
                        <span>© 2026 CONTEXTO Psicología · Centro de Ciencias Comportamentales</span>
                        <span><a href="#inicio" data-scroll="inicio">Privacidad</a> · <a href="#inicio" data-scroll="inicio">Términos</a></span>
                    </div>
                </div>
            </footer>

        </div>`;
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

    _serviceCard(title, desc, path, iconKey) {
        const icons = {
            user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
            heart: '<path d="M20.8 8.6c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.8 4.8 0 0 1 8.8-2.7A4.8 4.8 0 0 1 20.8 8.6Z"/>',
            users: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
            child: '<path d="M12 20.5s-7-4.2-9.5-8.4C.8 8.9 2.2 5 6 5c2 0 3.4 1 4 2 .6-1 2-2 4-2 3.8 0 5.2 3.9 3.5 7.1C19 16.3 12 20.5 12 20.5Z"/>',
            clipboard: '<path d="M9 12l2 2 4-4"/><path d="M7 3.5h7l4 4V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/>',
            video: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M8 21h8M12 17v4"/>'
        };
        const icon = icons[iconKey] || icons.user;
        return `
        <div class="lp-service-card lp-reveal">
            <div class="lp-service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></div>
            <h3>${title}</h3>
            <p>${desc}</p>
            <a href="/login" class="lp-service-link" data-link>Agendar sesión <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></a>
        </div>`;
    }

    _pillar(color, title, desc) {
        return `
        <div class="lp-pillar-card lp-reveal">
            <div class="lp-pillar-dot" style="background:${color};"></div>
            <h3>${title}</h3>
            <p>${desc}</p>
        </div>`;
    }

    _methodStep(num, title, desc) {
        return `
        <div class="lp-method-step lp-reveal">
            <div class="lp-method-num">${num}</div>
            <h3>${title}</h3>
            <p>${desc}</p>
        </div>`;
    }

    _teamCard(color, initials, name, role, desc) {
        return `
        <div class="lp-team-card lp-reveal">
            <div class="lp-team-avatar" style="background:linear-gradient(135deg, ${color}, ${color}cc);">${initials}</div>
            <h3>${name}</h3>
            <div class="lp-team-role">${role}</div>
            <p class="lp-team-desc">${desc}</p>
        </div>`;
    }

    _testimonial(color, initials, name, meta, text) {
        return `
        <div class="lp-testimonial-card lp-reveal">
            <span class="lp-testimonial-quote-mark">“</span>
            <p>${text}</p>
            <div class="lp-testimonial-author">
                <div class="lp-testimonial-avatar" style="background:linear-gradient(135deg, ${color}, ${color}cc);">${initials}</div>
                <div>
                    <div class="lp-t-name">${name}</div>
                    <div class="lp-t-meta">${meta}</div>
                </div>
            </div>
        </div>`;
    }

    _faq(open, question, answer) {
        return `
        <div class="lp-faq-item ${open ? 'is-open' : ''}">
            <button class="lp-faq-question" type="button" aria-expanded="${open ? 'true' : 'false'}">
                ${question}
                <span class="lp-faq-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>
            </button>
            <div class="lp-faq-answer">
                <div class="lp-faq-answer-inner">${answer}</div>
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

    _bindContactForm() {
        const form = this.container.querySelector('#lpContactForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = form.querySelector('#lpName').value.trim();
            const email = form.querySelector('#lpEmail').value.trim();
            const msg = form.querySelector('#lpMsg').value.trim();

            if (!name || !email || !msg) {
                if (window.app && window.app.toast) {
                    window.app.toast.show({ type: 'warning', title: 'Faltan datos', message: 'Completa nombre, correo y mensaje.' });
                }
                return;
            }

            const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            if (!emailOk) {
                if (window.app && window.app.toast) {
                    window.app.toast.show({ type: 'error', title: 'Correo inválido', message: 'Revisa el formato de tu correo electrónico.' });
                }
                return;
            }

            form.reset();
            if (window.app && window.app.toast) {
                window.app.toast.show({ type: 'info', title: 'Mensaje recibido', message: 'Gracias por escribirnos. Te contactaremos pronto.' });
            }
        });
    }
}
