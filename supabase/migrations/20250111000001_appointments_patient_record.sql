-- Proširi patient_or_walkin CHECK: termin je validan ako ima
-- patient_id (mobilni/profiles) ILI patient_record_id (registar) ILI walk-in
-- Ovo je LABAVLJENJE postojećeg constraint-a (dodaje OR opciju) -
-- svi postojeći redovi ostaju validni.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS patient_or_walkin;
ALTER TABLE appointments ADD CONSTRAINT patient_or_walkin CHECK (
  patient_id IS NOT NULL
  OR patient_record_id IS NOT NULL
  OR (walk_in_name IS NOT NULL AND walk_in_phone IS NOT NULL)
);
