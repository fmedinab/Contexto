// scripts/test-header-buttons.js
// Verificación en navegador real de la campana y el calendario del header.
// Usa Chrome del sistema vía CDP (puppeteer-core, sin descargar nada).
//
// Uso:  node scripts/test-header-buttons.js [email] [password]
//
// Escribe credenciales de un usuario STAFF real porque las páginas del
// dashboard son fail-closed: sin sesión el router manda a /login y no
// hay header que probar.

const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME_PATH
    || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3111';
const EMAIL = process.argv[2] || process.env.TEST_EMAIL;
const PASSWORD = process.argv[3] || process.env.TEST_PASSWORD;

let passed = 0;
let failed = 0;

function ok(m) { passed++; console.log(`  \x1b[32mOK\x1b[0m   ${m}`); }
function fail(m, d) { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${m}`); if (d) console.log(`       ${d}`); }
function section(t) { console.log(`\n\x1b[1m${t}\x1b[0m`); }

(async () => {
    if (!EMAIL || !PASSWORD) {
        console.log('\n\x1b[33mFaltan credenciales.\x1b[0m');
        console.log('Uso: node scripts/test-header-buttons.js <email> <password>');
        console.log('   o:  set TEST_EMAIL=... y TEST_PASSWORD=...');
        process.exit(2);
    }

    console.log('\x1b[1m═══ HEADER: campana y calendario ═══\x1b[0m');

    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000 });

    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

    try {
        // ── Login ────────────────────────────────────────────
        section('1. Autenticación');
        await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('#loginEmail, input[type=email]', { timeout: 15000 });
        ok('página de login cargada');

        await page.type('input[type=email]', EMAIL, { delay: 12 });
        await page.type('input[type=password]', PASSWORD, { delay: 12 });
        await Promise.all([
            page.click('button[type=submit]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
        ]);
        await new Promise(r => setTimeout(r, 3500));

        const hash = await page.evaluate(() => location.hash);
        if (hash.includes('dashboard')) ok(`sesión iniciada → ${hash}`);
        else { fail(`no se llegó al dashboard (hash actual: "${hash}")`, 'revisar credenciales'); await browser.close(); process.exit(1); }

        // ── Header presente ──────────────────────────────────
        section('2. Header');
        const bell = await page.$('#dashNotifications');
        const cal = await page.$('#dashCalendar');
        if (bell) ok('#dashNotifications existe'); else fail('#dashNotifications no existe');
        if (cal) ok('#dashCalendar existe'); else fail('#dashCalendar no existe');
        if (!bell || !cal) { await browser.close(); process.exit(1); }

        // El badge arranca oculto (no hay "leído/no leído").
        const badgeHidden = await page.evaluate(() => {
            const d = document.getElementById('dashNotifDot');
            return !d || d.hidden || getComputedStyle(d).display === 'none';
        });
        if (badgeHidden) ok('badge arranca oculto'); else fail('el badge queda visible al cargar');

        // ── Campana ──────────────────────────────────────────
        section('3. Campana de notificaciones');
        await page.click('#dashNotifications');
        await new Promise(r => setTimeout(r, 2200));

        const panel = await page.evaluate(() => {
            const p = document.getElementById('dashNotifPanel');
            if (!p) return null;
            const r = p.getBoundingClientRect();
            return {
                visible: r.width > 100 && r.height > 50,
                inViewport: r.right <= window.innerWidth + 2 && r.left >= -2,
                hasBody: !!p.querySelector('#notifPanelBody'),
                hasContent: p.querySelector('#notifPanelBody')?.children.length > 0,
                loading: !!p.querySelector('.notif-spinner'),
                ariaExpanded: document.getElementById('dashNotifications').getAttribute('aria-expanded'),
            };
        });

        if (panel) ok('panel se creó en el DOM');
        else { fail('el panel no se creó al hacer clic'); }

        if (panel?.visible) ok('el panel es visible y tiene tamaño');
        else fail('el panel no es visible', panel ? `w=${panel.visible}` : 'no existe');

        if (panel?.inViewport) ok('el panel cabe en el viewport (no se sale a la derecha)');
        else fail('el panel se sale del viewport', JSON.stringify(panel));

        if (panel?.hasBody) ok('tiene cuerpo (#notifPanelBody)');
        else fail('falta el cuerpo del panel');

        if (panel?.hasContent && !panel?.loading) ok('el cuerpo tiene contenido (ya no está en loading)');
        else if (panel?.loading) fail('el panel sigue en loading tras 2.2s', 'revisar notificationsService');
        else fail('el cuerpo del panel está vacío');

        if (panel?.ariaExpanded === 'true') ok('aria-expanded = true al abrir');
        else fail(`aria-expanded debería ser "true", es "${panel?.ariaExpanded}"`);

        // ── Cerrar con Escape ────────────────────────────────
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 400));
        const closed = await page.evaluate(() => !document.getElementById('dashNotifPanel'));
        if (closed) ok('Escape cierra el panel');
        else fail('Escape no cierra el panel');

        // ── Calendario ───────────────────────────────────────
        section('4. Calendario');
        await page.click('#dashCalendar');
        await new Promise(r => setTimeout(r, 2200));

        const pop = await page.evaluate(() => {
            const p = document.getElementById('dashCalPop');
            if (!p) return null;
            const r = p.getBoundingClientRect();
            const body = p.querySelector('#calPopBody');
            return {
                visible: r.width > 100 && r.height > 50,
                inViewport: r.right <= window.innerWidth + 2 && r.left >= -2,
                hasContent: body?.children.length > 0,
                loading: !!p.querySelector('.notif-spinner'),
                hasFooter: !!p.querySelector('.cal-pop-foot'),
                hasNewBtn: !!p.querySelector('#calNewAppt'),
                hasFullBtn: !!p.querySelector('#calFullAgenda'),
                ariaExpanded: document.getElementById('dashCalendar').getAttribute('aria-expanded'),
                stillOnDashboard: location.hash.includes('dashboard'),
            };
        });

        if (pop) ok('popover se creó en el DOM');
        else fail('el popover no se creó al hacer clic');

        if (pop?.visible) ok('el popover es visible y tiene tamaño');
        else fail('el popover no es visible');

        if (pop?.inViewport) ok('el popover cabe en el viewport');
        else fail('el popover se sale del viewport');

        if (pop?.hasContent && !pop?.loading) ok('la agenda cargó contenido');
        else if (pop?.loading) fail('la agenda sigue en loading tras 2.2s');
        else fail('la agenda está vacía (puede ser correcto: hoy no hay citas)');

        if (pop?.hasFooter && pop?.hasNewBtn) ok('botón «Nueva cita» presente');
        else fail('falta el botón «Nueva cita»');

        if (pop?.hasFullBtn) ok('botón «agenda completa» presente');
        else fail('falta el botón de agenda completa');

        // El calendario NO debe sacar del dashboard.
        if (pop?.stillOnDashboard) ok('permanece en el dashboard (no navega)');
        else fail('el calendario navegó fuera del dashboard', `hash=${await page.evaluate(() => location.hash)}`);

        if (pop?.ariaExpanded === 'true') ok('aria-expanded = true al abrir');
        else fail(`aria-expanded debería ser "true", es "${pop?.ariaExpanded}"`);

        // ── Exclusion mutua entre paneles ──────────────────────────
        section('5. Mutuo cierre entre paneles');
        const mutual = await page.evaluate(() => {
            const hadCal = !!document.getElementById('dashCalPop');
            document.getElementById('dashCalendar')?.click();
            return { hadCal };
        });
        await new Promise(r => setTimeout(r, 300));
        await page.click('#dashNotifications');
        await new Promise(r => setTimeout(r, 1200));
        const exclusive = await page.evaluate(() => ({
            notif: !!document.getElementById('dashNotifPanel'),
            cal: !!document.getElementById('dashCalPop'),
        }));
        if (exclusive.notif && !exclusive.cal) ok('abrir la campana cierra el calendario (y viceversa)');
        else fail('ambos paneles abiertos a la vez', JSON.stringify(exclusive));

        // ── Errores de consola ───────────────────────────────
        section('6. Consola del navegador');
        const relevant = consoleErrors.filter(e =>
            !e.includes('favicon') && !e.includes('DevTools') && !e.includes('supabase.co')
        );
        if (!relevant.length) ok('sin errores de consola');
        else {
            fail(`${relevant.length} error(es) de consola`);
            relevant.slice(0, 5).forEach(e => console.log(`       ${e.slice(0, 140)}`));
        }

        // ── Screenshot ───────────────────────────────────────
        section('7. Evidencia');
        await page.evaluate(() => {
            document.getElementById('dashNotifPanel')?.remove();
            document.getElementById('dashCalPop')?.remove();
        });
        await new Promise(r => setTimeout(r, 200));
        await page.click('#dashNotifications');
        await new Promise(r => setTimeout(r, 2000));
        const out = require('path').join(require('os').tmpdir(), 'contexto-notif.png');
        await page.screenshot({ path: out });
        ok(`captura: ${out}`);

    } catch (e) {
        fail('excepción durante la prueba', e.message);
        try { await page.screenshot({ path: require('path').join(require('os').tmpdir(), 'contexto-error.png') }); } catch {}
    } finally {
        await browser.close();
    }

    console.log(`\n\x1b[1m═══ RESULTADO ═══\x1b[0m`);
    console.log(`  ${passed} OK · ${failed} FAIL`);
    process.exit(failed ? 1 : 0);
})();