-- =============================================================================
-- Redosled doktora (display_order na profiles) + admin reorder RPC.
-- Isti princip kao services.display_order + reorder_services.
-- Pokreće se RUČNO u Supabase SQL Editor-u.
-- =============================================================================

-- 1. Kolona za redosled doktora (NOT NULL sa default-om da postojeći redovi prođu).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 9999;

-- 2. Backfill: postojeći staff/doktori dobijaju redosled po imenu (0,1,2,...),
--    tako da prvi prikaz ne bude proizvoljan. Patients ostaju na 9999.
WITH ordered AS (
  SELECT id, (row_number() OVER (ORDER BY first_name, last_name)) - 1 AS rn
  FROM profiles
  WHERE role IN ('staff', 'admin')
)
UPDATE profiles p
SET display_order = o.rn
FROM ordered o
WHERE p.id = o.id;

-- 3. Index za sortiranje liste doktora.
CREATE INDEX IF NOT EXISTS profiles_role_order_idx ON profiles (role, display_order);

-- 4. admin_reorder_doctors(items jsonb) — items = [{id, display_order}, ...].
--    Admin-gated (auth.uid() mora biti admin). Mirror reorder_services logike.
CREATE OR REPLACE FUNCTION public.admin_reorder_doctors(items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Samo admin može da menja redosled doktora';
  END IF;

  UPDATE profiles p
  SET display_order = (item->>'display_order')::int,
      updated_at = now()
  FROM jsonb_array_elements(items) AS item
  WHERE p.id = (item->>'id')::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reorder_doctors(jsonb) TO authenticated;

COMMENT ON COLUMN profiles.display_order IS
  'Redosled doktora u admin panelu i sidebar-u (Tim ordinacije). Manji broj = više gore.';
COMMENT ON FUNCTION public.admin_reorder_doctors(jsonb) IS
  'Admin-gated reorder doktora. items=[{id, display_order}].';
