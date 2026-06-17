# Venus Web — Supabase Schema

Kompletna referenca za stanje baze, plus migracije koje moramo dodati za
multi-doctor support i web aplikaciju.

> **Single source of truth** za schemu treba da bude live baza. Pre nego što
> krenemo bilo šta, **dump-uj baseline** (vidi sekciju "Baseline schema dump").

---

## TL;DR — šta postoji, šta nedostaje

### ✅ Postoji
- Tabele: `profiles`, `services`, `appointments`, `working_hours`, `time_off`, `push_tokens`, `notifications`, `audit_log`, `ai_conversations`
- RLS za `patient` i `admin` role
- RPC funkcije: `get_user_email`, `reorder_services`, `delete_service`, `create_guest_appointment`
- Trigger `handle_new_user` (auto-create profile posle `auth.signUp`) — postoji u bazi, **NIJE u repu**
- CHECK constraints: `check_cancellation_fields`, `patient_or_walkin`

### ❌ Nedostaje za web app
- `doctor_id` u `appointments` (single-doctor model)
- `doctor` i `assistant` u `profiles.role`
- Polja za doktor UI: `initials`, `color_hex`, `specialty`
- RLS politike za `doctor`/`assistant` role
- Tabela za **dnevnik pacijenata** (kartoni, anamneza, alergije) — Faza 2
- Tabela za **odontogram stanje** — Faza 2
- Tabela za **protokol Dg/Th** (intervencije) — Faza 2
- Tabela za **invoices** — Faza 3
- Storage bucket za **RTG snimke** — Faza 4

### 🐛 Bugovi koje treba popraviti
- **EXCLUDE constraint za anti-overlap je zakomentarisan** — double-booking je moguć za authenticated pacijente
- **RLS konflikt 005 vs 007** — `patient` ne vidi tuđe slotove → mobilna app može da dozvoli rezervaciju zauzetog termina (klijent zavisi od `error.code === '23P01'` koji se nikad ne aktivira)
- **`profiles.email` možda nije sinhronizovan** sa `auth.users.email` (zato i postoji RPC `get_user_email`)

---

## Baseline schema dump (URADI PRVO)

Migracije 001 i 002 ne postoje u mobilnom repu. Pre svega ostalog, dump-uj
postojeće stanje iz live baze:

```bash
# Iz root-a postojećeg mobilnog repa, ili bilo gde gde imaš supabase CLI:
npx supabase db dump \
  --project-id <YOUR_PROJECT_ID> \
  --schema public,auth \
  --schema-only \
  > schema_baseline.sql

# Ako tražiš i podatke (samo za lokalni dev):
npx supabase db dump \
  --project-id <YOUR_PROJECT_ID> \
  --schema public \
  --data-only \
  > seed_baseline.sql
```

Ovaj `schema_baseline.sql` ide u **`supabase/migrations/00000000000000_baseline.sql`**
u web repu — postaje prva migracija koja odražava trenutno stanje.

---

## Postojeće tabele (rekonstrukcija iz audit-a)

### `profiles` (1:1 sa `auth.users`)

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,                           -- nepouzdano, prava vrednost u auth.users
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,
  role text NOT NULL DEFAULT 'patient', -- 'patient' | 'admin' (TEXT, ne enum)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Trigger (u bazi, NIJE u repu):**
```sql
CREATE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    'patient'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### `appointments`

```sql
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id),     -- nullable za walk-in
  service_id uuid REFERENCES services(id),     -- nullable da bi se očuvala istorija ako se servis obriše
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL,                        -- 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES profiles(id),
  cancellation_reason text,
  walk_in_name text,
  walk_in_phone text,
  admin_notes text,

  CONSTRAINT check_cancellation_fields CHECK (
    status != 'cancelled' OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)
  ),
  CONSTRAINT patient_or_walkin CHECK (
    patient_id IS NOT NULL OR (walk_in_name IS NOT NULL AND walk_in_phone IS NOT NULL)
  )
);
```

**⚠️ EXCLUDE constraint za anti-overlap je ZAKOMENTARISAN** u
`004_booking_seed_and_rls.sql`. Treba aktivirati (vidi migraciju
`20250101_add_appointment_overlap_constraint.sql` u sledećoj sekciji).

### `services`

```sql
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Ostalo',
  duration_minutes integer NOT NULL,
  price numeric,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 9999,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### `working_hours`

```sql
CREATE TABLE working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week smallint NOT NULL UNIQUE,       -- 0=ned, 6=sub
  opens_at time,
  closes_at time,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Trenutni seed: Pon–Pet 09:00–15:00, Sub i Ned zatvoreno. **Globalno radno
vreme (ne per-doktor)** — zadržavamo to za sada.

### `time_off`

```sql
CREATE TABLE time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### `push_tokens`

```sql
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL,                     -- 'ios' | 'android'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);
```

### `notifications`

```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  type text NOT NULL,                         -- 'booking_confirmed' | 'appointment_reminder' | ...
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}',
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `audit_log`

```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id),
  action text NOT NULL,                       -- 'create' | 'update' | 'delete'
  entity_type text NOT NULL,                  -- 'appointment' | 'patient' | ...
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `ai_conversations`

```sql
CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text NOT NULL,
  role text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

> Audit kaže da AI integracija nije aktivna u mobilnoj. Tabela postoji, ali se
> ne piše u nju iz mobilne app-a. Za web — ignorišemo dok ne shvatimo namenu.

---

## Postojeće RLS politike

Postavljene su za **`patient`** i **`admin`** role. Pacijent vidi/menja samo
svoje, admin može sve. Anon vidi `services` (aktivne), `working_hours`,
`time_off` i confirmed/pending `appointments` (za guest booking).

Sve detaljno u `migrations/` foldera mobilnog repa, ali ključne za web:

```sql
-- appointments
CREATE POLICY "Admins can do everything on appointments"
  ON appointments FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
```

**⚠️ Problem:** ove politike koriste `role = 'admin'` literal. Kada dodamo
`doctor` i `assistant`, moramo ažurirati sve ove politike da prepoznaju i njih.
Vidi migracije u sledećoj sekciji.

---

## Nove migracije koje moramo dodati

Sve migracije idu u **`supabase/migrations/`** (NE `migrations/` kao u mobilnoj!)
sa **timestamp format** imenima.

### 1. `20250101000001_multi_doctor_support.sql`

**Sadržaj fajla je u repu — kreira ga prva sesija Claude Code-a.**

Šta radi:
- Dodaje `'doctor'` i `'assistant'` kao validne vrednosti u `profiles.role` (CHECK constraint)
- Dodaje kolone u `profiles`: `initials text`, `color_hex text`, `specialty text`
- Dodaje `doctor_id uuid REFERENCES profiles(id)` u `appointments` (NULLABLE)
- Dodaje `appointments_doctor_starts_idx` index
- Ažurira sve RLS politike sa `role = 'admin'` da prepoznaju i `doctor`/`assistant`:
  - `appointments`: novi policy "Staff can do everything"
  - `profiles`: novi policy "Staff can read all profiles"
  - `services`: dozvoli `doctor`/`assistant` da čitaju sve (ne samo aktivne)
  - `audit_log`: novi policy da staff vidi sve

### 2. `20250101000002_appointment_overlap_constraint.sql`

- Aktivira **EXCLUDE USING gist** constraint za anti-double-booking
- Ali samo za `status IN ('confirmed', 'pending')` (otkazani termini smeju da se preklapaju)
- Treba `btree_gist` extension: `CREATE EXTENSION IF NOT EXISTS btree_gist;`

```sql
ALTER TABLE appointments
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status IN ('confirmed', 'pending'));
```

> **Pažnja:** kada se ovo aktivira, mobilna app će početi da dobija greške na
> double-booking pokušajima — što je željeno ponašanje. Kod u
> `ConfirmationScreen.tsx` već handluje `error.code === '23P01'`.

### 3. `20250101000003_fix_patient_select_appointments.sql`

Rešava bug iz audit-a tačka 1 — pacijent treba da vidi **zauzete slotove**
drugih pacijenata (samo `starts_at`/`ends_at`/`status`, ne sve podatke) da bi
mogao da bira slobodne termine.

Strategija: napraviti **VIEW** `appointment_slots` koji vraća samo nužne
kolone i RLS za anonimni read pristup, ili koristiti SECURITY DEFINER funkciju
`get_taken_slots(date)`. **Treba diskutovati pre nego što kodiramo** — može
da utiče na mobilnu performansu.

### 4. `20250101000004_audit_log_triggers.sql` (kasnije, ne MVP)

Trigger-i za auto-popunjavanje `audit_log` na `INSERT/UPDATE/DELETE` po
tabelama: `appointments`, `profiles`, `services`. Ne MVP, ali važno za GDPR.

---

## TypeScript tipovi — strategija

```bash
# Treba pokrenuti svaki put kada se menja schema:
npx supabase gen types typescript \
  --project-id <YOUR_PROJECT_ID> \
  > lib/db/types.ts
```

Onda u Supabase klijent kodu:

```typescript
import type { Database } from '@/lib/db/types';
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sad supabase.from('appointments').select('*') vraća pravilno tipovan red.
type Appointment = Database['public']['Tables']['appointments']['Row'];
```

**Akcija za mobilnu app:** preporuka da i oni dodaju ovo. Manje hack-ova,
manje `as any` cast-ova. Ali to je njihov problem za posle — za sad ih ne
diramo.

---

## Sync sa mobilnom app — pravila

1. **Pre svake nove migracije**: razmisli da li je breaking za mobilnu
2. **Nullable je tvoj prijatelj** — uvek dodaj novu kolonu kao NULLABLE prvo, pa je popuni vrednostima, pa tek onda razmisli o NOT NULL
3. **Mobilna NE dira** `doctor_id` u terminima koje pacijent kreira — uvek NULL → web kalendar ih prikazuje u "Bez doktora" koloni ili automatski dodeljuje default doktoru
4. **Service role key se NIKAD ne deli sa mobilnom** — samo web ima taj key, samo za server-side admin operacije
5. **RPC funkcije** su shared resource — ne modifikuj postojeće `create_guest_appointment`, `reorder_services`, `delete_service`. Dodaj nove ako trebaju (npr. `bulk_reassign_doctor`)
