-- WhatsApp broj pošiljaoca na terminu (AI asistent).
-- AI WhatsApp asistent zakazuje termine kao 'pending'; kad doktor potvrdi
-- (pending -> confirmed), potvrda se šalje na ovaj broj. NULL za ne-AI termine.
-- Kolona je nullable, bez default-a, da ne pukne na postojećim redovima.
alter table public.appointments
  add column if not exists ai_chat_phone text;

comment on column public.appointments.ai_chat_phone is
  'WhatsApp broj pošiljaoca (E.164, npr. +381...) za termine zakazane preko AI asistenta. Koristi se za slanje potvrde kad status pređe pending -> confirmed. NULL za ne-AI termine.';
