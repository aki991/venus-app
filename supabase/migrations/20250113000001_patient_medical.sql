-- Medicinski karton pacijenta (1:1 sa patients)
CREATE TABLE IF NOT EXISTS public.patient_medical (
  patient_id uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  allergies text[] NOT NULL DEFAULT '{}',           -- alergije (lekovi, materijali)
  chronic_conditions text[] NOT NULL DEFAULT '{}',  -- hronična stanja
  medications text[] NOT NULL DEFAULT '{}',          -- lekovi koje uzima
  critical_warnings text[] NOT NULL DEFAULT '{}',    -- kritična upozorenja (ističu se)
  anamnesis text,                                    -- slobodna anamneza
  smoker boolean NOT NULL DEFAULT false,             -- pušač
  pregnant boolean NOT NULL DEFAULT false,           -- trudnoća
  notes text,                                        -- dodatne napomene
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS patient_medical_updated_at ON patient_medical;
CREATE TRIGGER patient_medical_updated_at BEFORE UPDATE ON patient_medical
  FOR EACH ROW WHEN (old.* IS DISTINCT FROM new.*)
  EXECUTE FUNCTION set_updated_at();

-- RLS: staff pun pristup (medicinski podaci - samo osoblje)
ALTER TABLE patient_medical ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_full_patient_medical" ON patient_medical;
CREATE POLICY "staff_full_patient_medical" ON patient_medical
  FOR ALL TO authenticated USING (is_staff()) WITH CHECK (is_staff());

COMMENT ON TABLE patient_medical IS 'Medicinski karton pacijenta (alergije, hronična stanja, anamneza).';
