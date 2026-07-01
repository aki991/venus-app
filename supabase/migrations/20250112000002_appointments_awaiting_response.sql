-- "Čeka odgovor pacijenta" stanje na terminu (AI WhatsApp asistent).
-- Kad doktor u aplikaciji predloži nov termin pacijentu, AI-termin ostaje u
-- DA/NE režimu preko WhatsApp-a dok pacijent ne odgovori: awaiting_response = TRUE.
-- Doktorska akcija nad statusom (potvrda / otkazivanje) čisti flag u istom
-- upitu, da pacijent ne ostane "zaključan". Promena samo vremena termina NE dira
-- flag (namerno okida nov predlog pacijentu).
--
-- Obe kolone su bezbedne za postojeće redove:
--   - awaiting_response: NOT NULL DEFAULT false (postojeći termini nisu na čekanju).
--   - awaiting_since: nullable (postavlja se tek kad flag pređe u TRUE).
-- "add column if not exists" da migracija bude idempotentna i ako je kolona već
-- ranije dodata direktno u bazu.
alter table public.appointments
  add column if not exists awaiting_response boolean not null default false;

alter table public.appointments
  add column if not exists awaiting_since timestamptz;

comment on column public.appointments.awaiting_response is
  'TRUE dok AI-termin čeka da pacijent preko WhatsApp-a odgovori na predlog novog termina od doktora. Doktorska promena statusa (confirmed/cancelled/completed/no_show) čisti flag; promena samo vremena ga ne dira.';

comment on column public.appointments.awaiting_since is
  'Trenutak kad je awaiting_response postavljen na TRUE. NULL kad termin ne čeka odgovor.';
