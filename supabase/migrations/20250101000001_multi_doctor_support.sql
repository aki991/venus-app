-- ============================================================================
-- Migracija: Multi-doctor support
-- ============================================================================
-- Ova migracija proširuje postojeću single-doctor šemu da podržava više
-- doktora u istoj ordinaciji. Web aplikacija zahteva ovu šemu da bi mogla da
-- prikaže Tim ordinacije, bojni kalendar po doktoru i Novi termin sa
-- izborom doktora.
--
-- Zavisnosti: zahteva da je baseline schema već primenjena
--             (00000000000000_baseline.sql).
--
-- Backward compatibility: postojeći termini iz mobilne app-a ostaju validni
--                         sa doctor_id = NULL. Mobilna app NE mora da se
--                         menja odmah.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Proširi profiles.role da podržava 'doctor' i 'assistant'
-- ----------------------------------------------------------------------------
-- Trenutno je role TEXT bez explicit constraint-a. Dodajemo CHECK constraint
-- da garantujemo validne vrednosti. Ako CHECK constraint već postoji, ovo
-- će failovati - tada treba DROP CONSTRAINT prvo.

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('patient', 'doctor', 'assistant', 'admin'));

-- ----------------------------------------------------------------------------
-- 2. Dodaj kolone za doktor UI atribute
-- ----------------------------------------------------------------------------
-- initials: 2-3 slova za prikaz u kalendar block-ovima i avatar-u (npr. 'DV', 'MI')
-- color_hex: HEX kod za kolor-koding kalendar block-ova i chip-ova
-- specialty: opciono, slobodan tekst za specijalizaciju ('Endodontija', 'Hirurg')

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS initials text,
  ADD COLUMN IF NOT EXISTS color_hex text,
  ADD COLUMN IF NOT EXISTS specialty text;

-- Constraint: color_hex mora biti validan HEX format ako je popunjen
ALTER TABLE profiles
  ADD CONSTRAINT profiles_color_hex_format
  CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9a-fA-F]{6}$');

-- ----------------------------------------------------------------------------
-- 3. Dodaj doctor_id u appointments
-- ----------------------------------------------------------------------------
-- NULLABLE jer:
--   a) postojeći termini iz mobilne nemaju ovaj podatak
--   b) walk-in termini ne moraju biti vezani za doktora odmah
--
-- Web aplikacija pri kreiranju novog termina ZAHTEVA doctor_id (validacija
-- na klijent strani sa zod schemom).

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Index za brze upite kalendara (filter po doktoru + sortiranje po vremenu)
CREATE INDEX IF NOT EXISTS appointments_doctor_starts_idx
  ON appointments (doctor_id, starts_at);

-- Index za bilo koji query po vremenu (kalendar pregled)
CREATE INDEX IF NOT EXISTS appointments_starts_at_idx
  ON appointments (starts_at);

-- ----------------------------------------------------------------------------
-- 4. Helper funkcija: is_staff()
-- ----------------------------------------------------------------------------
-- Olakšava pisanje RLS politika - sve gde je trebalo
-- (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
-- postaje is_staff().

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'doctor', 'assistant')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. Update RLS politike - dozvoli pristup za doctor/assistant
-- ----------------------------------------------------------------------------
-- Postojeće "Admins can ..." politike samo proveravaju role='admin'. Ovo ih
-- proširuje da prepoznaju i 'doctor' i 'assistant'.

-- appointments
DROP POLICY IF EXISTS "Admins can do everything on appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can do everything on appointments" ON appointments;

CREATE POLICY "Staff can do everything on appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can read all profiles" ON profiles;

CREATE POLICY "Staff can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_staff());

-- Pacijent i dalje vidi sopstveni profile (verovatno postoji "Users can read own profile"
-- policy iz baseline-a; ne diramo je). Ako se desi konflikt, treba proveriti
-- u Supabase Studio.

-- profiles UPDATE - dozvoli admin-u da menja sve profile (za promenu role,
-- dodavanje initials/color, itd.). Doctor/assistant ne mogu menjati profile.
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- services - staff vidi sve (i neaktivne, za admin reorder/disable)
DROP POLICY IF EXISTS "Admins can manage services" ON services;
DROP POLICY IF EXISTS "Staff can manage services" ON services;

CREATE POLICY "Staff can manage services"
  ON services
  FOR ALL
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- audit_log - staff može da čita (za audit pregled u web app-u)
DROP POLICY IF EXISTS "Staff can read audit log" ON audit_log;

CREATE POLICY "Staff can read audit log"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (is_staff());

-- ----------------------------------------------------------------------------
-- 6. Komentari (dokumentacija)
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN profiles.initials IS
  'Inicijali doktora za prikaz u kalendaru i avatar krugu (2-3 slova).';

COMMENT ON COLUMN profiles.color_hex IS
  'HEX kod boje za kolor-koding termina u kalendaru (format: #RRGGBB).';

COMMENT ON COLUMN profiles.specialty IS
  'Slobodan tekst za specijalizaciju doktora (npr. Endodontija, Hirurg).';

COMMENT ON COLUMN appointments.doctor_id IS
  'FK na profiles - doktor kome je termin dodeljen. NULL za walk-in ili '
  'termine kreirane kroz mobilnu (pacijent samostalno).';

COMMENT ON FUNCTION public.is_staff() IS
  'Vraca true ako je trenutno logovan korisnik osoblje ordinacije '
  '(admin/doctor/assistant). Koristi se u RLS politikama umesto inline subquery.';

COMMIT;
