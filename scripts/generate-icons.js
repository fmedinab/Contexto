// scripts/generate-icons.js
// Genera los iconos PNG de la PWA a partir de la geometría del logo,
// sin dependencias externas.
//
// Por qué: assets/icons/*.svg usan <text> con la fuente Inter, que
// Android/Chrome NO rasteriza al instalar la PWA. El manifiesto declaraba
// solo SVG, y en varios Android "Añadir a pantalla de inicio" falla o
// instala sin icono (bug B2.8). Los PNG se genan geométricamente.
//
// Uso:  node scripts/generate-icons.js
//
// Rasteriza: rectángulo redondeado de acento + marca "C" construida con
// arcos (misma silueta que el SVG, sin depender de la fuente).

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ACCENT = [0x63, 0x66, 0xf1];
const WHITE = [0xff, 0xff, 0xff];

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
// Los maskable necesitan el contenido dentro de un círculo de 80% del
// lado: si el logo toca el borde, Android lo recorta.
const MASKABLE = new Set([192, 384, 512]);

const OUT_DIR = path.join(__dirname, '..', 'assets', 'icons');

// ---------- encoder PNG (RGB, sin filtro) ----------
const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return t;
})();

function crc32(b) {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td), 0);
    return Buffer.concat([len, td, crc]);
}

function encodePNG(rgb, w, h) {
    const raw = Buffer.alloc(h * (w * 3 + 1));
    for (let y = 0; y < h; y++) {
        const dst = y * (w * 3 + 1);
        raw[dst] = 0;
        rgb.copy(raw, dst + 1, y * w * 3, (y + 1) * w * 3);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

// ---------- raster ----------
function drawIcon(size, maskable) {
    const px = Buffer.alloc(size * size * 3);

    // El contenido se encoge al 80% en maskable para respetar el safe zone.
    const scale = maskable ? 0.8 : 1;
    const box = size * scale;
    const ox = (size - box) / 2;
    const oy = (size - box) / 2;
    const radius = maskable ? box * 0.5 : box * 0.1; // full-bleed vs redondeado
    const cx = size / 2;
    const cy = size / 2;

    const inRounded = (x, y) => {
        const l = ox, t = oy, r = ox + box, b = oy + box;
        if (x < l || x > r || y < t || y > b) return false;
        const qx = Math.max(l + radius - x, 0, x - (r - radius));
        const qy = Math.max(t + radius - y, 0, y - (b - radius));
        return qx * qx + qy * qy <= radius * radius;
    };

    // Marca "C": anillo abierto a la derecha, mismo gesto que el SVG.
    const ringOuter = box * 0.30;
    const ringInner = box * 0.205;
    const gapStart = -0.62;  // radianes desde el eje +X
    const gapEnd = 0.62;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 3;
            if (!inRounded(x + 0.5, y + 0.5)) {
                // Fuera: transparente no se puede en RGB -> fondo oscuro
                // (coincide con --bg-primary de la app).
                px[i] = 0x0a; px[i + 1] = 0x0a; px[i + 2] = 0x14;
                continue;
            }
            let r = ACCENT[0], g = ACCENT[1], b = ACCENT[2];

            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            const d = Math.hypot(dx, dy);
            let ang = Math.atan2(dy, dx);
            // Normalizar a (-PI, PI]
            if (ang > Math.PI) ang -= 2 * Math.PI;

            const inGap = ang > gapStart && ang < gapEnd;
            if (!inGap && d >= ringInner && d <= ringOuter) {
                r = WHITE[0]; g = WHITE[1]; b = WHITE[2];
            }
            px[i] = r; px[i + 1] = g; px[i + 2] = b;
        }
    }

    return encodePNG(px, size, size);
}

let total = 0;
for (const size of SIZES) {
    const maskable = MASKABLE.has(size);
    const png = drawIcon(size, maskable);
    const file = path.join(OUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(file, png);
    total += png.length;
    console.log(`OK  icon-${size}.png  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB  ${maskable ? '(maskable)' : ''}`);
}
console.log(`\nTotal: ${(total / 1024).toFixed(1)} KB en ${SIZES.length} archivos`);
console.log('Recordar: añadir las entradas PNG a manifest.json (dejando las SVG para navegadores que las soportan).');