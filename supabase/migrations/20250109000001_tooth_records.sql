-- Stanja zuba/površina enum
DO $$ BEGIN
  CREATE TYPE public.tooth_condition AS ENUM (
    'zdrav', 'karijes', 'plomba', 'kanal', 'kruna', 'most',
    'izvadjen', 'implant', 'za_vadjenje'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Površine zuba enum
DO $$ BEGIN
  CREATE TYPE public.tooth_surface AS ENUM (
    'mezijalno', 'distalno', 'okluzalno', 'vestibularno', 'lingvalno', 'ceo_zub'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Zapis stanja zuba/površine za pacijenta
CREATE TABLE IF NOT EXISTS public.tooth_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tooth_number integer NOT NULL,        -- FDI broj (11-48)
  surface public.tooth_surface NOT NULL DEFAULT 'ceo_zub',
  condition public.tooth_condition NOT NULL,
  note text,
  recorded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Jedan zapis po (pacijent, zub, površina) - update umesto duplikata
  CONSTRAINT tooth_records_unique UNIQUE (patient_id, tooth_number, surface),
  -- FDI validacija: brojevi 11-18, 21-28, 31-38, 41-48
  CONSTRAINT tooth_number_valid CHECK (
    tooth_number BETWEEN 11 AND 18 OR tooth_number BETWEEN 21 AND 28 OR
    tooth_number BETWEEN 31 AND 38 OR tooth_number BETWEEN 41 AND 48
  )
);

CREATE INDEX IF NOT EXISTS tooth_records_patient_idx ON tooth_records (patient_id);

DROP TRIGGER IF EXISTS tooth_records_updated_at ON tooth_records;
CREATE TRIGGER tooth_records_updated_at BEFORE UPDATE ON tooth_records
  FOR EACH ROW WHEN (old.* IS DISTINCT FROM new.*)
  EXECUTE FUNCTION set_updated_at();

-- RLS: staff pun pristup
ALTER TABLE tooth_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_full_tooth_records" ON tooth_records;
CREATE POLICY "staff_full_tooth_records" ON tooth_records
  FOR ALL TO authenticated USING (is_staff()) WITH CHECK (is_staff());

COMMENT ON TABLE tooth_records IS 'Stanje zuba/površina pacijenta (odontogram).';
