-- =============================================================================
-- RLS politike za staff/admin pristup terminima, profilima i uslugama
-- =============================================================================
-- VAŽNO: Ova migracija se pokreće RUČNO u Supabase SQL Editor-u.
-- Pretpostavlja da funkcija is_staff() već postoji u bazi.
-- Sve je idempotentno (DROP POLICY IF EXISTS pre CREATE) — može se pokrenuti
-- više puta bez greške.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) APPOINTMENTS: staff/admin ima pun CRUD nad svim terminima
-- -----------------------------------------------------------------------------
drop policy if exists "Staff full access appointments" on public.appointments;

create policy "Staff full access appointments"
  on public.appointments
  for all
  to authenticated
  using (is_staff())
  with check (is_staff());

-- -----------------------------------------------------------------------------
-- 2) PROFILES: staff/admin može da čita SVE profile (uklj. pacijente)
--    Koristimo novo ime "staff_read_all_profiles" da ne diramo eventualnu
--    postojeću admin politiku.
-- -----------------------------------------------------------------------------
drop policy if exists "staff_read_all_profiles" on public.profiles;

create policy "staff_read_all_profiles"
  on public.profiles
  for select
  to authenticated
  using (is_staff());

-- -----------------------------------------------------------------------------
-- 3) SERVICES: staff/admin vidi sve usluge (i aktivne i neaktivne)
-- -----------------------------------------------------------------------------
drop policy if exists "Staff read services" on public.services;

create policy "Staff read services"
  on public.services
  for select
  to authenticated
  using (is_staff());
