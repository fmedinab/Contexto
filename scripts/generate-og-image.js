// scripts/generate-og-image.js
// Genera assets/og-image.png (1200x630) sin dependencias externas.
//
// Por que existe: los previews de Open Graph / WhatsApp necesitan un PNG
// de al menos 1200x630. El repo solo tiene iconos SVG y los SVG no se
// renderizan en los previews de redes sociales.
//
// Uso:  node scripts/generate-og-image.js
//
// NOTA DE MARCA: este script dibuja el fondo y el motivo geometrico
// (anillos + glow, igual que el "core" del dashboard). NO dibuja texto,
// porque rasterizar tipografia sin librerias no es viable. Antes de la
// entrega final al cliente, un disenador debe exportar un OG con el
// logotipo y el nombre ya compuestos encima.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 1200;
const H = 630;

// --- Paleta (css/themes/dark.css) ---
const BG = [0x0a, 0x0a, 0x14];
const ACCENT = [0x63, 0x66, 0xf1];
const ACCENT_LIGHT = [0x81, 0x8c, 0xf8];
const SURFACE = [0x1a, 0x1a, 0x30];

const buf = Buffer.alloc(W * H * 3);

function setPx(x, y, r, g, b, alpha = 1) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    buf[i] = Math.round(buf[i] * (1 - alpha) + r * alpha);
    buf[i + 1] = Math.round(buf[i + 1] * (1 - alpha) + g * alpha);
    buf[i + 2] = Math.round(buf[i + 2] * (1 - alpha) + b * alpha);
}

function lerp(a, b, t) {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ];
}

// --- Fondo: gradiente diagonal sutil ---
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const t = (x / W * 0.6 + y / H * 0.4);
        const c = lerp(BG, SURFACE, t * 0.85);
        setPx(x, y, c[0], c[1], c[2]);
    }
}

// --- Glow radial centrado ---
const cx = W / 2;
const cy = H / 2;
const maxR = 470;
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > maxR) continue;
        const a = Math.pow(1 - d / maxR, 2.6) * 0.42;
        setPx(x, y, ACCENT[0], ACCENT[1], ACCENT[2], a);
    }
}

// --- Anillos concentricos ---
function ring(radius, width, color, alpha) {
    const inner = radius - width / 2;
    const outer = radius + width / 2;
    for (let y = Math.max(0, Math.floor(cy - outer)); y < Math.min(H, Math.ceil(cy + outer)); y++) {
        for (let x = Math.max(0, Math.floor(cx - outer)); x < Math.min(W, Math.ceil(cx + outer)); x++) {
            const d = Math.hypot(x - cx, y - cy);
            if (d < inner || d > outer) continue;
            const edge = 1 - Math.abs(d - radius) / (width / 2);
            setPx(x, y, color[0], color[1], color[2], alpha * Math.max(0, edge));
        }
    }
}

ring(210, 2.5, ACCENT, 0.30);
ring(150, 1.8, ACCENT_LIGHT, 0.22);
ring(88, 1.4, ACCENT_LIGHT, 0.16);

// --- Nucleo ---
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > 30) continue;
        const a = Math.pow(1 - d / 30, 1.4) * 0.95;
        setPx(x, y, ACCENT_LIGHT[0], ACCENT_LIGHT[1], ACCENT_LIGHT[2], a);
    }
}

// --- Nodos en el anillo exterior ---
const nodes = 8;
for (let i = 0; i < nodes; i++) {
    const ang = (i / nodes) * Math.PI * 2 - Math.PI / 2;
    const nx = cx + Math.cos(ang) * 210;
    const ny = cy + Math.sin(ang) * 210;
    for (let y = Math.floor(ny - 9); y <= Math.ceil(ny + 9); y++) {
        for (let x = Math.floor(nx - 9); x <= Math.ceil(nx + 9); x++) {
            const d = Math.hypot(x - nx, y - ny);
            if (d > 9) continue;
            setPx(x, y, ACCENT_LIGHT[0], ACCENT_LIGHT[1], ACCENT_LIGHT[2], (1 - d / 9) * 0.9);
        }
    }
}

// --- Marco inferior para texto (deja la zona libre para el logo) ---
for (let y = H - 132; y < H - 128; y++) {
    for (let x = 80; x < W - 80; x++) {
        setPx(x, y, ACCENT[0], ACCENT[1], ACCENT[2], 0.5);
    }
}

// --- PNG ---
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

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 2;  // color type: truecolor RGB
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// Cada scanline lleva delante su byte de filtro (0 = none).
const raw = Buffer.alloc(H * (W * 3 + 1));
for (let y = 0; y < H; y++) {
    const src = y * W * 3;
    const dst = y * (W * 3 + 1);
    raw[dst] = 0;
    buf.copy(raw, dst + 1, src, src + W * 3);
}

const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'assets', 'og-image.png');
fs.writeFileSync(out, png);
console.log(`OK  ${out}  ${W}x${H}  ${(png.length / 1024).toFixed(1)} KB`);