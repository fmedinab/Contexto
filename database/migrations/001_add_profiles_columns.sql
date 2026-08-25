-- ============================================
-- Migración 001: Agregar columnas a profiles
-- Schema: public | Tabla: profiles
-- ============================================
-- Campos nuevos:
--   dni      — DNI o pasaporte del usuario
--   currency — Moneda preferida (default: PEN)
--   language — Idioma preferido (default: es)
-- ============================================

-- 1. Agregar columnas faltantes (idempotente)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS dni TEXT,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PEN' NOT NULL,
    ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es' NOT NULL;

-- 2. Actualizar trigger de creación automática de perfil
--    para poblar los nuevos campos desde user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, dni, currency, language)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'dni',
        COALESCE(NEW.raw_user_meta_data->>'currency', 'PEN'),
        COALESCE(NEW.raw_user_meta_data->>'language', 'es')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
