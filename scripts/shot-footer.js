// scripts/shot-footer.js
// Captura solo el footer de la landing, en el viewport pedido.
// Ajusta el scroll al pie de la página antes de disparar.

const puppeteer = require('puppeteer-core');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME_PATH
    || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const [, , url, out, w = '1600', h = '900'] = process.argv;

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 2 });

    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // El contenido del CMS llega por red; dar tiempo a que pinte.
    await new Promise(r => setTimeout(r, 2500));

    // El banner de cookies es fixed y tapa el pie en pantallas cortas.
    // Se acepta para poder ver el footer de verdad.
    await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')]
            .find(b => /aceptar todas/i.test(b.textContent || ''));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 700));

    await page.evaluate(() => {
        // Ir al final real del documento: scrollIntoView sobre el footer
        // no alcanza cuando hay secciones con reveal que aún no han
        // cambiado de alto.
        window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 900));

    await page.evaluate(() => {
        document.getElementById('lpFooter')?.scrollIntoView({ block: 'end' });
    });
    await new Promise(r => setTimeout(r, 600));

    const dest = out || path.join(os.tmpdir(), 'footer.png');
    await page.screenshot({ path: dest });

    // Métricas útiles: si el copyright y el crédito caben en una línea.
    const info = await page.evaluate(() => {
        const bottom = document.querySelector('.lp-footer-bottom');
        if (!bottom) return null;
        const kids = [...bottom.children].map(k => {
            const r = k.getBoundingClientRect();
            return { cls: k.className, x: Math.round(r.x), w: Math.round(r.width) };
        });
        return { h: Math.round(bottom.getBoundingClientRect().height), kids };
    });

    console.log('OK  ' + dest);
    if (info) console.log('footer-bottom: ' + JSON.stringify(info));
    if (errs.length) {
        console.log('errores:');
        errs.slice(0, 6).forEach(e => console.log('  ' + e.slice(0, 140)));
    }
    await browser.close();
})();