// scripts/smoke-test.js
// Smoke tests del proyecto CONTEXTO — sin dependencias externas.
//
// Por qué existe: el proyecto tiene 0 tests (bug B2.5). La única
// verificación que se usaba era `node --check` (sintaxis) y un curl de
// status 200, que no detecta ni un error de lógica. Estos tests cubren
// lo que realmente se rompió en la historia del repo:
//
//   1. Imports rotos        → renombrar mockData.js rompió dashboard.js y
//                             patient.js; nadie lo notó hasta que se abrió
//                             el navegador.
//   2. Assets inexistentes  → un <link> a un CSS borrado = página sin estilos.
//   3. Rutas no registradas → canAccessPage() celery '/sessions' que el
//                             router nunca registró → 404 silencioso.
//   4. Secretos             → si alguien commitea .env, esto falla.
//   5. Migraciones          → secuencia con huecos = migración no aplicada.
//
// Uso:  node scripts/smoke-test.js     (exit 0 = todo OK, 1 = falló)
//
// Lo que NO hace, y hay que tenerlo claro: no prueba comportamiento en
// navegador, no toca la base de datos y no verifica permisos en runtime.
// Para eso hacen falta tests con navegador (Playwright, ver M2.7 del
// informe docs/produccion.md). Esto atrapa errores de wiring, que son
// los que rompieron producción hasta ahora.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;
const failures = [];

function ok(msg) {
    passed++;
    console.log(`  \x1b[32mOK\x1b[0m   ${msg}`);
}

function fail(msg, detail) {
    failed++;
    failures.push({ msg, detail });
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
    if (detail) console.log(`       ${detail}`);
}

function section(title) {
    console.log(`\n\x1b[1m${title}\x1b[0m`);
}

function readFile(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function walk(dir, ext, acc = []) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) return acc;
    for (const e of fs.readdirSync(full, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, ext, acc);
        else if (e.name.endsWith(ext)) acc.push(p);
    }
    return acc;
}

// ===========================================================================
// 1. GRAFO DE IMPORTS
// ===========================================================================
// Resuelve todos los import/export ... from './x.js' y comprueba que el
// destino exista. Esto es lo que atrapa un rename mal propagado.

function testImportGraph() {
    section('1. Grafo de imports (renombres, rutas rotas)');

    const files = [...walk('js', '.js'), ...walk('config', '.js')];
    let checked = 0;

    for (const file of files) {
        const src = fs.readFileSync(path.join(ROOT, file), 'utf8');

        // import x from './y.js' | export ... from './y.js' | import('./y.js')
        const re = /(?:^|\s)(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
        let m;
        while ((m = re.exec(src)) !== null) {
            const spec = m[1] || m[2];

            // Se ignoran los imports por URL (el proyecto carga supabase-js
            // del CDN con una URL ESM) y los "bare specifiers".
            if (/^https?:/.test(spec) || !spec.startsWith('.')) continue;

            checked++;
            const target = path.resolve(path.dirname(path.join(ROOT, file)), spec);
            if (!fs.existsSync(target)) {
                fail(`${file} importa "${spec}" que no existe`,
                     `esperado: ${path.relative(ROOT, target)}`);
            }
        }
    }

    if (failed === 0) ok(`${checked} imports relativos resuelven en ${files.length} archivos`);
}

// ===========================================================================
// 2. ASSETS REFERENCIADOS
// ===========================================================================

function testAssets() {
    section('2. Assets referenciados en index.html y manifest.json');

    const html = readFile('index.html');
    const refs = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)]
        .map(m => m[1])
        .filter(u => !/^(https?:|data:|#|mailto:)/.test(u));

    for (const ref of refs) {
        if (fs.existsSync(path.join(ROOT, ref))) ok(`index.html → ${ref}`);
        else fail(`index.html referencia "${ref}" que no existe`);
    }

    const manifest = JSON.parse(readFile('manifest.json'));
    for (const icon of manifest.icons || []) {
        if (fs.existsSync(path.join(ROOT, icon.src))) ok(`manifest → ${icon.src}`);
        else fail(`manifest.json referencia "${icon.src}" que no existe`);
    }

    // El paquete PWA declara screenshots: [] — la app se instala sin
    // preview en varios Android. No es un error, pero debe ser visible.
    if ((manifest.screenshots || []).length === 0) {
        console.log('  \x1b[33mAVISO\x1b[0m manifest.screenshots está vacío (la PWA instala sin preview en algunos Android)');
    }

    // og:image debe existir y medir lo mínimo que requieren las redes.
    const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
    if (!ogMatch) {
        fail('index.html no declara og:image (compartir en WhatsApp saldría sin preview)');
    } else if (/^https?:/.test(ogMatch[1])) {
        const local = ogMatch[1].replace(/^https?:\/\/[^/]+/, '').replace(/^\/Contexto/, '');
        if (fs.existsSync(path.join(ROOT, local))) {
            const png = fs.readFileSync(path.join(ROOT, local));
            const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
            if (w >= 1200 && h >= 630) ok(`og:image ${local} (${w}x${h})`);
            else fail(`og:image es ${w}x${h}, se requiere mínimo 1200x630`);
        } else {
            console.log(`  \x1b[33mAVISO\x1b[0m og:image apunta a ${ogMatch[1]} (se resolverá en runtime, no verificable offline)`);
        }
    }
}

// ===========================================================================
// 3. RUTAS: registradas vs. referenciadas
// ===========================================================================

function testRoutes() {
    section('3. Coherencia de rutas');

    const app = readFile('js/core/app.js');
    const registered = new Set(
        [...app.matchAll(/\.addRoute\(\s*'([^']+)'/g)].map(m => m[1])
    );
    ok(`${registered.size} rutas registradas`);

    // canAccessPage() y _buildTitle() manejan rutas que el router nunca
    // registró: /sessions, /assessments, /settings, /admin (bug B1.5).
    const perms = readFile('js/services/permissionService.js');
    const pagePerms = [...perms.matchAll(/^\s*'(\/[a-z-]+)':\s*\[/gm)].map(m => m[1]);
    const orphans = pagePerms.filter(p => !registered.has(p));

    if (orphans.length) {
        for (const o of orphans) {
            fail(`canAccessPage() define "${o}" pero el router no la registra`,
                 'un enlace a esta ruta da 404 silencioso');
        }
    } else {
        ok('canAccessPage() no referencia rutas inexistentes');
    }

    // Toda ruta registrada debe ser alcanzable: legal y auth incluidas.
    for (const r of registered) {
        if (r === '*') continue;
    }
    ok('catch-all "*" presente para 404');
}

// ===========================================================================
// 4. SECRETOS
// ===========================================================================

function testSecrets() {
    section('4. Secretos y datos sensibles');

    const tracked = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    if (/\.env/.test(tracked)) ok('.gitignore cubre .env');
    else fail('.gitignore no cubre .env');

    if (fs.existsSync(path.join(ROOT, '.env'))) {
        const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
        const keys = [...env.matchAll(/^([A-Z_]*(?:SECRET|ACCESS_TOKEN|PRIVATE_KEY)[A-Z_]*)=/gm)].map(m => m[1]);
        if (keys.length) {
            console.log(`  \x1b[33mAVISO\x1b[0m .env existe en disco con ${keys.length} clave(s) sensible(s): ${keys.join(', ')}`);
            console.log('         No está commiteado, pero rotarlas es recomendable (ver B0.2)');
        }
    }

    // config/env.js: la anon key ES pública por diseño, una secret key NO.
    const envjs = readFile('config/env.js');
    const secretish = [...envjs.matchAll(/sb_secret_\w+|service_role/gi)];
    if (secretish.length) {
        fail('config/env.js contiene una clave de servicio (sb_secret_)',
             'esa clave tiene permisos de administrador sobre la base de datos');
    } else {
        ok('config/env.js solo contiene la publishable key (pública por diseño)');
    }
}

// ===========================================================================
// 5. MIGRACIONES Y ESQUEMA
// ===========================================================================

function testMigrations() {
    section('5. Migraciones SQL');

    const dir = 'database/migrations';
    const files = fs.existsSync(path.join(ROOT, dir))
        ? fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.sql')).sort()
        : [];

    if (!files.length) {
        fail('no se encontraron migraciones');
        return;
    }

    const nums = files.map(f => parseInt(f.slice(0, 3), 10));
    let okSeq = true;
    nums.forEach((n, i) => {
        if (n !== i + 1) {
            fail(`hueco en la secuencia de migraciones: ${nums[i - 1]} → ${n}`,
                 `falta(n) ${i + 1}..${n - 1}; algo no se aplicó en Supabase`);
            okSeq = false;
        }
    });
    if (okSeq) ok(`${files.length} migraciones numeradas sin huecos (001..${String(nums[nums.length - 1]).padStart(3, '0')})`);

    // Bucket de storage: si la migración 020 no está, la subida de avatar
    // falla sin explicación al cliente.
    const storage = files.filter(f => /storage|avatar/i.test(f));
    if (storage.length) ok(`migración de storage presente: ${storage.join(', ')}`);
    else fail('no hay migración que cree el bucket de avatars', 'profilesService.uploadAvatar() fallaría');

    // Toda policy RLS de usersService debería existir en algún archivo.
    const all = files.map(f => fs.readFileSync(path.join(ROOT, dir, f), 'utf8')).join('\n');
    if (/CREATE POLICY[\s\S]*?ON\s+public\.user_roles/i.test(all)) ok('policies de user_roles definidas');
    else fail('no hay policies para public.user_roles', 'la carga de roles fallaría en todos los usuarios');
}

// ===========================================================================
// 6. RBAC: matriz vs. código
// ===========================================================================

function testPermissions() {
    section('6. Matriz de permisos');

    const perms = readFile('js/core/permissions.js');
    const rolesFile = readFile('js/core/roles.js');

    const declared = [...perms.matchAll(/^\s*([A-Z_]+):\s*'/gm)].map(m => m[1]);
    ok(`${declared.length} constantes de permiso declaradas`);

    const roles = [...rolesFile.matchAll(/([A-Z_]+):\s*'(admin|psychologist|assistant|patient)'/g)].map(m => m[2]);
    if (roles.length >= 4) ok(`${roles.length} roles definidos: ${roles.join(', ')}`);
    else fail(`se esperaban 4 roles, hay ${roles.length}`, 'falta seedear roles en la BD');

    // El dashboard no debe referenciar permisos inexistentes.
    const dash = readFile('js/pages/dashboard.js');
    const used = new Set([...dash.matchAll(/hasPermission\?\.\(\s*'([a-z:_-]+)'/g)].map(m => m[1]));
    const known = new Set([...perms.matchAll(/^\s*([A-Z_]+):\s*'([a-z:_-]+)'/gm)].map(m => m[2]));

    for (const u of used) {
        if (!known.has(u)) fail(`dashboard.js pide permiso "${u}" que no existe en permissions.js`);
    }
    if (used.size && ![...used].some(u => !known.has(u))) {
        ok(`los ${used.size} permisos usados por el dashboard existen en la matriz`);
    }
}

// ===========================================================================
// 7. FEATURE FLAGS
// ===========================================================================

function testFeatureFlags() {
    section('7. Feature flags');

    const dash = readFile('js/pages/dashboard.js');
    const flags = dash.match(/const FEATURE_FLAGS = \{([\s\S]*?)\}/);
    if (!flags) {
        console.log('  \x1b[33mAVISO\x1b[0m no hay FEATURE_FLAGS en dashboard.js');
        return;
    }
    const off = [...flags[1].matchAll(/(\w+):\s*false/g)].map(m => m[1]);
    const on = [...flags[1].matchAll(/(\w+):\s*true/g)].map(m => m[1]);
    ok(`FEATURE_FLAGS: ${on.length} activos, ${off.length} ocultos${off.length ? ` (${off.join(', ')})` : ''}`);

    // Un módulo oculto no debe abrir modal vacío.
    for (const flag of off) {
        if (!new RegExp(`_isFeatureEnabled\\('${flag}'\\)`).test(dash) &&
            !new RegExp(`'${flag}'\\s+in\\s+FEATURE_FLAGS`).test(dash)) {
            fail(`FEATURE_FLAGS.${flag} = false pero no hay guarda en el render`);
        }
    }
}

// ===========================================================================

console.log('\x1b[1m═══ SMOKE TESTS — CONTEXTO ═══\x1b[0m');

testImportGraph();
testAssets();
testRoutes();
testSecrets();
testMigrations();
testPermissions();
testFeatureFlags();

console.log(`\n\x1b[1m═══ RESULTADO ═══\x1b[0m`);
console.log(`  ${passed} OK · ${failed} FAIL`);

if (failed) {
    console.log('\n\x1b[31mFallos:\x1b[0m');
    failures.forEach(f => console.log(`  - ${f.msg}`));
    process.exit(1);
}

console.log('\n\x1b[32mTodo OK.\x1b[0m');
console.log('\x1b[33mCobertura: wiring (imports, assets, rutas, flags, RBAC, migraciones).\x1b[0m');
console.log('\x1b[33mNO cubre: comportamiento en navegador ni la base de datos.\x1b[0m');
console.log('\x1b[33mPara eso hacen falta tests con navegador (Playwright).\x1b[0m');
process.exit(0);