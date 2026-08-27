-- ============================================
-- Setup: Usuario admin inicial
-- Email: admin@context.test | Password: 123456
-- ============================================
-- 1. Crear el usuario en Supabase Dashboard → Authentication → Users → Create user
--    Email: admin@context.test
--    Password: 123456
-- 2. Ejecutar este script en el SQL Editor
-- ============================================

-- Buscar el UUID del usuario creado en auth.users
-- y insertar/actualizar perfil + rol admin

DO $$
DECLARE
    admin_uuid UUID;
BEGIN
    -- Obtener el UUID del usuario por email
    SELECT id INTO admin_uuid
    FROM auth.users
    WHERE email = 'admin@context.test'
    LIMIT 1;

    IF admin_uuid IS NULL THEN
        RAISE EXCEPTION 'No se encontró usuario con email admin@context.test. Créalo primero en Authentication → Users.';
    END IF;

    -- 1. Insertar / actualizar el perfil del admin
    INSERT INTO public.profiles (id, email, full_name, dni, currency, language)
    VALUES (admin_uuid, 'admin@context.test', 'Context Demo', '00000000', 'PEN', 'es')
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        dni = EXCLUDED.dni,
        currency = EXCLUDED.currency,
        language = EXCLUDED.language;

    -- 2. Asignar rol admin al usuario
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT admin_uuid, id
    FROM public.roles
    WHERE name = 'admin'
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Admin configurado correctamente. UUID: %', admin_uuid;
END $$;

-- 3. Verificar
SELECT p.id, p.email, p.full_name, p.dni, p.currency, p.language, r.name AS role
FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
WHERE
    p.email = 'admin@context.test';