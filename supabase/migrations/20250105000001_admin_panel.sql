-- =============================================================================
-- FAZA B — Admin panel: upravljanje doktorima
-- Model: OPCIJA C — svaki doktor ima auth.users nalog (kreira ga Server Action
-- preko service-role auth.admin.createUser). "Bez login-a" = nalog napravljen
-- ali pozivnica nije poslata. Zato profiles.id ↔ auth.users invarijanta ostaje
-- netaknuta i NEMA p_id IS NULL grane — uvek imamo pravi id iz createUser.
-- Pokreće se RUČNO u Supabase SQL Editor-u.
-- =============================================================================

-- profiles dobija is_active (za deaktivaciju doktora)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Index za aktivne staff/doktore
CREATE INDEX IF NOT EXISTS profiles_role_active_idx ON profiles (role, is_active);

-- -----------------------------------------------------------------------------
-- admin_upsert_doctor — SECURITY DEFINER, admin-gated.
-- p_id = postojeci profile id (= auth.users id koji je napravio createUser +
-- handle_new_user trigger). Funkcija samo popunjava doktor-polja i postavlja
-- role='staff'. NE dira is_active (to radi admin_set_doctor_active).
-- prevent_role_self_elevation prolazi jer je pozivalac admin (is_admin()).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_doctor(
  p_id uuid,             -- postojeci profile id (uvek pravi auth.users id)
  p_first_name text,
  p_last_name text,
  p_initials text,
  p_color_hex text,
  p_specialty text,
  p_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Provera: pozivalac MORA biti admin
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Samo admin može da upravlja doktorima';
  END IF;

  IF p_id IS NULL THEN
    RAISE EXCEPTION 'p_id je obavezan (doktor mora imati auth nalog — OPCIJA C)';
  END IF;

  UPDATE profiles SET
    first_name = p_first_name,
    last_name  = p_last_name,
    initials   = p_initials,
    color_hex  = p_color_hex,
    specialty  = p_specialty,
    phone      = p_phone,
    -- Guard: nikad ne demote-uj admina. Doktor-polja sme da menja, role NE.
    role       = CASE WHEN role = 'admin' THEN 'admin' ELSE 'staff' END,
    updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil % ne postoji', p_id;
  END IF;

  RETURN p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_doctor TO authenticated;

-- -----------------------------------------------------------------------------
-- admin_set_doctor_active — deaktivacija / reaktivacija doktora (soft delete).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_doctor_active(p_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Samo admin';
  END IF;

  UPDATE profiles SET is_active = p_active, updated_at = now() WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil % ne postoji', p_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_doctor_active TO authenticated;

COMMENT ON COLUMN profiles.is_active IS 'Aktivnost doktora/staff-a (soft delete u admin panelu).';
COMMENT ON FUNCTION public.admin_upsert_doctor IS 'Admin-gated upsert doktor-polja + role=staff. p_id = postojeci auth/profile id (OPCIJA C).';
COMMENT ON FUNCTION public.admin_set_doctor_active IS 'Admin-gated soft delete/reaktivacija doktora.';
