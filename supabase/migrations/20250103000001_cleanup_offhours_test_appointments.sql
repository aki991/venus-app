-- =============================================================================
-- Čišćenje fantomskih test termina van radnog vremena (09:00–15:00)
-- =============================================================================
-- VAŽNO: Pokreće se RUČNO u Supabase SQL Editor-u.
-- Briše SAMO walk-in test termine van radnog vremena (09–15) — to su fantomi
-- iz testiranja koji se ne prikazuju u gridu, ali ih overlap constraint vidi.
-- NE dira prave pacijent termine (walk_in_name IS NULL).
-- Vreme se poredi u lokalnoj zoni ordinacije (Europe/Belgrade), jer je
-- starts_at sačuvan kao timestamptz (UTC).
-- =============================================================================

DELETE FROM appointments
WHERE walk_in_name IS NOT NULL
  AND (
    EXTRACT(HOUR FROM starts_at AT TIME ZONE 'Europe/Belgrade') < 9
    OR EXTRACT(HOUR FROM starts_at AT TIME ZONE 'Europe/Belgrade') >= 15
  );
