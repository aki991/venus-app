-- Tabela stolica
CREATE TABLE IF NOT EXISTS chairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed: prva stolica (Venus trenutno ima jednu)
INSERT INTO chairs (name, display_order)
SELECT 'Stolica 1', 0
WHERE NOT EXISTS (SELECT 1 FROM chairs);

-- chair_id u appointments (NULLABLE prvo - postojeci termini nemaju)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS chair_id uuid REFERENCES chairs(id) ON DELETE RESTRICT;

-- Postojece termine (ako ih ima) veži za prvu stolicu
UPDATE appointments
SET chair_id = (SELECT id FROM chairs ORDER BY display_order LIMIT 1)
WHERE chair_id IS NULL;

-- Index za kalendar query po stolici
CREATE INDEX IF NOT EXISTS appointments_chair_starts_idx
  ON appointments (chair_id, starts_at);

-- DUAL OVERLAP CONSTRAINT
-- Postojeci appointments_no_overlap je per-doctor - zadržavamo ga.
-- Dodajemo NOVI per-chair constraint.
-- btree_gist vec postoji iz ranije migracije.

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_no_overlap_chair;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_overlap_chair
  EXCLUDE USING gist (
    chair_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status IN ('confirmed', 'pending') AND chair_id IS NOT NULL);

-- RLS za chairs
ALTER TABLE chairs ENABLE ROW LEVEL SECURITY;

-- Staff/admin čita sve stolice
DROP POLICY IF EXISTS "staff_read_chairs" ON chairs;
CREATE POLICY "staff_read_chairs"
  ON chairs FOR SELECT TO authenticated
  USING (is_staff());

-- Samo admin menja stolice (za Fazu B admin panel)
DROP POLICY IF EXISTS "admin_manage_chairs" ON chairs;
CREATE POLICY "admin_manage_chairs"
  ON chairs FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

COMMENT ON TABLE chairs IS 'Fizičke radne jedinice (stolice) ordinacije.';
COMMENT ON COLUMN appointments.chair_id IS 'Stolica na kojoj se termin obavlja.';
