-- =============================================================================
-- Napomena o pacijentu (slobodan tekst da se doktor podseti ko je pacijent).
-- Pokreće se RUČNO u Supabase SQL Editor-u (projekat ozocfexzgmoiyjabmhwn).
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS note text;

COMMENT ON COLUMN profiles.note IS
  'Slobodna napomena o pacijentu (da se doktor podseti ko je). Prikazuje se na stranici Pacijenti.';
