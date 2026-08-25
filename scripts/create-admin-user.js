/**
 * scripts/create-admin-user.js
 *
 * Crea o actualiza el usuario admin (fmedina@gmail.com) en Supabase Auth
 * y asigna el rol 'admin' en user_roles.
 *
 * Uso:
 *   $env:SUPABASE_ACCESS_TOKEN="<your-token>"
 *   node scripts/create-admin-user.js
 */

const PROJECT_REF = 'bpfouoddrdelcqicdnor';
const SUPABASE_URL = 'https://' + PROJECT_REF + '.supabase.co';
const MANAGEMENT_API = 'https://api.supabase.com/v1';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const ANON_KEY = 'sb_publishable_TT386pKgfPIukn7QiqD3ZA_am0SsTKO';

const ADMIN_EMAIL = 'fmedina@gmail.com';
const ADMIN_PASSWORD = '123456';
const ADMIN_FULL_NAME = 'Frank Medina';
const ADMIN_DNI = '00000000';

if (!ACCESS_TOKEN) {
    console.error('❌  SUPABASE_ACCESS_TOKEN no está definida.');
    console.error('   $env:SUPABASE_ACCESS_TOKEN="sbp_..." ; node scripts/create-admin-user.js');
    process.exit(1);
}

function mgmtFetch(path, opts = {}) {
    return fetch(MANAGEMENT_API + path, {
        ...opts,
        headers: {
            'Authorization': 'Bearer ' + ACCESS_TOKEN,
            'Content-Type': 'application/json',
            ...opts.headers
        }
    });
}

async function mgmtSql(query) {
    const res = await mgmtFetch('/projects/' + PROJECT_REF + '/database/query', {
        method: 'POST',
        body: JSON.stringify({ query })
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text);
    return JSON.parse(text);
}

async function getServiceRoleKey() {
    const res = await mgmtFetch('/projects/' + PROJECT_REF + '/api-keys');
    const keys = JSON.parse(await res.text());
    return keys.find(k => k.name === 'service_role').api_key;
}

async function main() {
    // Get service role key for PostgREST calls
    const serviceKey = await getServiceRoleKey();
    const postgrestHeaders = {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge'
    };

    // 1. Try to find existing user via Management API Users endpoint
    console.log('🔄  Buscando usuario existente...');
    let userId = null;

    try {
        const usersRes = await mgmtFetch('/projects/' + PROJECT_REF + '/auth/users?email=' + encodeURIComponent(ADMIN_EMAIL));
        const usersText = await usersRes.text();
        if (usersRes.ok) {
            const usersData = JSON.parse(usersText);
            const users = usersData.users || [];
            if (users.length > 0) {
                userId = users[0].id;
                console.log('✅  Usuario existente:', userId, '(' + users[0].email + ')');
            }
        }
    } catch (e) {
        console.log('ℹ️  No se pudo buscar via API, usando SQL:', e.message);
    }

    // 2. If not found via API, try SQL
    if (!userId) {
        console.log('🔄  Buscando via SQL...');
        const sqlRes = await mgmtSql(
            `SELECT id, email FROM auth.users WHERE email = '${ADMIN_EMAIL}' LIMIT 1`
        );
        const rows = sqlRes.result || sqlRes;
        if (Array.isArray(rows) && rows.length > 0) {
            userId = rows[0].id;
            console.log('✅  Usuario encontrado via SQL:', userId);
        }
    }

    // 3. If still not found, create via GoTrue signup
    if (!userId) {
        console.log('🔄  Creando usuario via GoTrue signup...');
        const signupRes = await fetch(SUPABASE_URL + '/auth/v1/signup', {
            method: 'POST',
            headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                email_confirm: true,
                data: { full_name: ADMIN_FULL_NAME, dni: ADMIN_DNI, currency: 'PEN', language: 'es' }
            })
        });
        const signupData = JSON.parse(await signupRes.text());
        if (!signupRes.ok) {
            console.error('❌  Error en signup:', signupData.msg || signupData.message);

            // Fallback: try SQL to find the user (might exist but API query failed)
            const sqlRes = await mgmtSql(
                `SELECT id, email FROM auth.users WHERE email = '${ADMIN_EMAIL}' LIMIT 1`
            );
            const rows = sqlRes.result || sqlRes;
            if (Array.isArray(rows) && rows.length > 0) {
                userId = rows[0].id;
                console.log('✅  Usuario encontrado via SQL (signup duplicado):', userId);
            } else {
                process.exit(1);
            }
        } else {
            // Extract user_id from the JWT
            if (signupData.access_token) {
                const parts = signupData.access_token.split('.');
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                userId = payload.sub || payload.user_id;
                console.log('✅  Usuario creado:', userId);
            } else if (signupData.user?.id) {
                userId = signupData.user.id;
                console.log('✅  Usuario creado:', userId);
            } else {
                console.error('❌  No se pudo obtener user_id del signup');
                process.exit(1);
            }
        }
    }

    // 4. Ensure the password is correct and email is confirmed (via SQL)
    console.log('🔄  Asegurando password y confirmation...');
    await mgmtSql(
        `UPDATE auth.users SET encrypted_password = crypt('${ADMIN_PASSWORD}', gen_salt('bf')), email_confirmed_at = now() WHERE email = '${ADMIN_EMAIL}'`
    );
    console.log('✅  Password actualizado y email confirmado');

    // 5. Upsert profile (PATCH to update existing or POST to create)
    console.log('🔄  Actualizando perfil...');
    const profileRes = await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + userId, {
        method: 'PATCH',
        headers: postgrestHeaders,
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            full_name: ADMIN_FULL_NAME,
            dni: ADMIN_DNI,
            currency: 'PEN',
            language: 'es'
        })
    });
    if (!profileRes.ok) {
        const err = await profileRes.text();
        console.error('❌  Error en perfil:', err);
        process.exit(1);
    }
    console.log('✅  Perfil actualizado');

    // 6. Get role_id for 'admin'
    let roleId;
    const rolesSql = await mgmtSql(`SELECT id FROM roles WHERE name = 'admin'`);
    const roleRows = rolesSql.result || rolesSql;
    if (Array.isArray(roleRows) && roleRows.length > 0) {
        roleId = roleRows[0].id;
    } else {
        console.error('❌  Rol "admin" no encontrado. Ejecuta database/seed.sql');
        process.exit(1);
    }
    console.log('✅  Rol admin encontrado:', roleId);

    // 7. Assign admin role (delete existing, insert new)
    console.log('🔄  Asignando rol admin...');
    await fetch(SUPABASE_URL + '/rest/v1/user_roles?user_id=eq.' + userId, {
        method: 'DELETE',
        headers: postgrestHeaders
    });
    const roleRes = await fetch(SUPABASE_URL + '/rest/v1/user_roles', {
        method: 'POST',
        headers: postgrestHeaders,
        body: JSON.stringify({ user_id: userId, role_id: roleId })
    });
    if (!roleRes.ok) {
        const err = await roleRes.text();
        console.error('❌  Error asignando rol:', err);
        process.exit(1);
    }
    console.log('✅  Rol admin asignado');

    // 8. Verificar login
    console.log('🔄  Verificando login...');
    const loginRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    const loginData = JSON.parse(await loginRes.text());
    if (loginRes.ok && loginData.access_token) {
        console.log('✅  Login verificado correctamente\n');
    } else {
        console.error('❌  Login falló:', loginData.msg || loginData.message);
    }

    console.log('🎉  Usuario admin listo:');
    console.log('   Email:    ', ADMIN_EMAIL);
    console.log('   Password: ', ADMIN_PASSWORD);
    console.log('   UserID:   ', userId);
    console.log('   Nombre:   ', ADMIN_FULL_NAME);
    console.log('   Rol:      ', 'admin');
}

main().catch(err => {
    console.error('❌  Error inesperado:', err.message);
    process.exit(1);
});
