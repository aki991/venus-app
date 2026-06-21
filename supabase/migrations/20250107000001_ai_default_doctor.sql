-- =============================================================================
-- AI default doktor: app_settings (key-value) + get_ai_default_doctor() RPC.
-- Pokreće se RUČNO u Supabase SQL Editor-u (projekat ozocfexzgmoiyjabmhwn).
-- =============================================================================

-- 0. Zaštitno: get_ai_default_doctor sortira po display_order. Ako migracija
--    20250106 (redosled doktora) još nije pokrenuta, dodaj kolonu ovde
--    (IF NOT EXISTS → no-op ako već postoji).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 9999;

-- 1. Generička key-value tabela podešavanja.
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Samo admin čita/menja podešavanja preko aplikacije (auth.uid() = admin).
-- service_role (n8n) zaobilazi RLS, pa može direktno da čita ako zatreba.
DROP POLICY IF EXISTS "Admin manages app_settings" ON public.app_settings;
CREATE POLICY "Admin manages app_settings"
  ON public.app_settings FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 2. get_ai_default_doctor(): strog sa fallback-om.
--    (1) ako je 'ai_default_doctor_id' postavljen I taj doktor je aktivan
--        staff/admin → vrati njega
--    (2) inače → prvi aktivni doktor (display_order, pa first_name)
--    (3) ako nema aktivnih doktora → NULL
CREATE OR REPLACE FUNCTION public.get_ai_default_doctor()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_selected uuid;
  v_result uuid;
BEGIN
  -- pročitaj izabrani (NULL ako nije postavljen ili nije validan uuid)
  BEGIN
    SELECT value::uuid INTO v_selected
    FROM app_settings WHERE key = 'ai_default_doctor_id';
  EXCEPTION WHEN others THEN
    v_selected := NULL;
  END;

  -- (1) izabrani, ako je aktivan staff/admin
  IF v_selected IS NOT NULL THEN
    SELECT id INTO v_result
    FROM profiles
    WHERE id = v_selected
      AND is_active = true
      AND role IN ('staff', 'admin');
    IF v_result IS NOT NULL THEN
      RETURN v_result;
    END IF;
  END IF;

  -- (2) fallback: prvi aktivni doktor
  SELECT id INTO v_result
  FROM profiles
  WHERE is_active = true AND role IN ('staff', 'admin')
  ORDER BY display_order NULLS LAST, first_name NULLS LAST
  LIMIT 1;

  RETURN v_result; -- (3) NULL ako nema aktivnih
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_default_doctor() TO anon, authenticated, service_role;

COMMENT ON TABLE public.app_settings IS 'Generička key-value podešavanja aplikacije.';
COMMENT ON FUNCTION public.get_ai_default_doctor() IS
  'Vraća doctor_id za AI zakazivanje: izabrani (ako je aktivan), inače prvi aktivni doktor, inače NULL.';
