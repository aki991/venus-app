-- Protokol intervencija (hronološki zapis rada na zubima)
-- ODVOJENO od tooth_records (trenutno stanje). Ovde je istorija svega urađenog.
CREATE TABLE IF NOT EXISTS public.tooth_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tooth_number integer,                          -- FDI broj (nullable - neka
                                                 -- intervencija može biti opšta)
  performed_on date NOT NULL DEFAULT CURRENT_DATE, -- datum intervencije
  diagnosis text,                                -- dijagnoza (dg)
  therapy text,                                  -- terapija (th)
  doctor_id uuid REFERENCES profiles(id) ON DELETE SET NULL, -- doktor
  note text,                                     -- napomena
  source text NOT NULL DEFAULT 'manual',         -- 'auto' (iz odontograma) | 'manual'
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- FDI validacija (ako tooth_number nije NULL)
  CONSTRAINT tooth_procedures_tooth_valid CHECK (
    tooth_number IS NULL OR
    tooth_number BETWEEN 11 AND 18 OR tooth_number BETWEEN 21 AND 28 OR
    tooth_number BETWEEN 31 AND 38 OR tooth_number BETWEEN 41 AND 48
  ),
  -- izvor zapisa: samo 'auto' (iz odontograma) ili 'manual'
  CONSTRAINT tooth_procedures_source_valid CHECK (source IN ('auto', 'manual'))
);

CREATE INDEX IF NOT EXISTS tooth_procedures_patient_idx ON tooth_procedures (patient_id, performed_on DESC);

DROP TRIGGER IF EXISTS tooth_procedures_updated_at ON tooth_procedures;
CREATE TRIGGER tooth_procedures_updated_at BEFORE UPDATE ON tooth_procedures
  FOR EACH ROW WHEN (old.* IS DISTINCT FROM new.*)
  EXECUTE FUNCTION set_updated_at();

-- RLS: staff pun pristup
ALTER TABLE tooth_procedures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_full_tooth_procedures" ON tooth_procedures;
CREATE POLICY "staff_full_tooth_procedures" ON tooth_procedures
  FOR ALL TO authenticated USING (is_staff()) WITH CHECK (is_staff());

COMMENT ON TABLE tooth_procedures IS 'Protokol intervencija - hronoloska istorija rada na zubima pacijenta.';
