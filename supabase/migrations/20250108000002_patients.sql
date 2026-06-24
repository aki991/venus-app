-- Status pacijenta enum
DO $$ BEGIN
  CREATE TYPE public.patient_status AS ENUM ('nov', 'aktivan', 'na_terapiji', 'zavrseno', 'neaktivan');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Centralni registar pacijenata
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number text UNIQUE,                    -- karton broj, auto ili ručno
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  gender text,                                -- 'M' | 'Ž' | NULL
  phone text,
  email text,
  occupation text,                            -- zanimanje
  location text,                              -- mesto
  status public.patient_status NOT NULL DEFAULT 'nov',
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- veza ka mobilnom nalogu (NULL ako nema)
  notes text,                                 -- opšte napomene (NE medicinske - to je D2)
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indeksi za pretragu
CREATE INDEX IF NOT EXISTS patients_name_idx ON patients (last_name, first_name);
CREATE INDEX IF NOT EXISTS patients_phone_idx ON patients (phone);
CREATE INDEX IF NOT EXISTS patients_profile_idx ON patients (profile_id);
CREATE INDEX IF NOT EXISTS patients_card_idx ON patients (card_number);

-- Veza termina ka kartonu (NOVO polje, nullable, ne dira postojeće)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS patient_record_id uuid REFERENCES patients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS appointments_patient_record_idx ON appointments (patient_record_id);

-- updated_at trigger (set_updated_at funkcija već postoji u bazi)
DROP TRIGGER IF EXISTS patients_updated_at ON patients;
CREATE TRIGGER patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW
  WHEN (old.* IS DISTINCT FROM new.*)
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Staff/admin pun pristup (medicinski podaci - samo osoblje)
DROP POLICY IF EXISTS "staff_full_patients" ON patients;
CREATE POLICY "staff_full_patients" ON patients
  FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- Auto-generisanje card_number: sekvencijalni broj
-- Funkcija koja vraća sledeći slobodan broj (npr. najveći + 1, format kao text)
CREATE OR REPLACE FUNCTION public.next_card_number()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(MAX(card_number::int), 100)::int + 1 || ''
  FROM patients
  WHERE card_number ~ '^[0-9]+$';
$$;
GRANT EXECUTE ON FUNCTION public.next_card_number() TO authenticated;

COMMENT ON TABLE patients IS 'Centralni registar pacijenata ordinacije (sa nalogom i bez).';
COMMENT ON COLUMN appointments.patient_record_id IS 'Veza termina ka kartonu pacijenta (patients tabela).';
