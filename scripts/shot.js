// scripts/shot.js
// Captura una URL en el viewport pedido. Herramienta de desarrollo.
//
// Uso: node scripts/shot.js <url> <salida.png> [ancho] [alto] [--full]

const puppeteer = require('puppeteer-core');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME_PATH
    || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const [, , url, out, w = '1600', h = '1000', ...rest] = process.argv;
const full = rest.includes('--full');

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
    await new Promise(r => setTimeout(r, 1200));

    const dest = out || path.join(os.tmpdir(), 'shot.png');
    await page.screenshot({ path: dest, fullPage: full });

    console.log('OK  ' + dest);
    if (errs.length) {
        console.log('errores de consola:');
        errs.slice(0, 8).forEach(e => console.log('  ' + e.slice(0, 160)));
    }
    await browser.close();
})();