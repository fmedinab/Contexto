-- ============================================
-- Setup: Usuario admin inicial
-- Email: fmedina@gmail.com | Password: 123456
-- ============================================
-- ⚠️  El usuario AUTH debe crearse primero en:
--     Supabase Dashboard → Authentication → Users → Create user
--     Email: fmedina@gmail.com
--     Password: 123456
-- ============================================
-- Una vez creado, copiar el UUID generado y reemplazar <UUID> en los inserts.
-- ============================================

-- 1. Insertar / actualizar el perfil del admin
--    Se usa ON CONFLICT DO UPDATE para poblar dni, currency, language
--    incluso cuando el trigger handle_new_user ya creó un perfil básico.
INSERT INTO public.profiles (id, email, full_name, dni, currency, language)
VALUES ('<UUID>', 'fmedina@gmail.com', 'Frank Medina', '00000000', 'PEN', 'es')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    dni = EXCLUDED.dni,
    currency = EXCLUDED.currency,
    language = EXCLUDED.language;

-- 2. Asignar rol admin al usuario
INSERT INTO public.user_roles (user_id, role_id)
SELECT '<UUID>', id
FROM public.roles
WHERE name = 'admin'
ON CONFLICT DO NOTHING;

-- 3. Verificar
SELECT p.id, p.email, p.full_name, p.dni, p.currency, p.language, r.name AS role
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
JOIN public.roles r ON r.id = ur.role_id
WHERE p.email = 'fmedina@gmail.com';
