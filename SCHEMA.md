# Venus Web — Supabase Schema

**Single source of truth = živa baza.** Ovaj dokument odražava tačno stanje
uhvaćeno u `supabase/migrations/00000000000000_baseline.sql` (dump `public` +
`auth` šeme od **2026-06-19**).

Stare međumigracije (multi-doctor, staff RLS, chairs, admin panel) su ugrađene u
baseline i premeštene u `supabase/migrations/_archive/` (vidi README tamo).

---

## Enumi (`public`)

| Enum | Vrednosti |
|---|---|
| `user_role` | `patient`, `staff`, `admin` |
| `appointment_status` | `pending`, `confirmed`, `cancelled`, `completed`, `no_show` |
| `device_platform` | `ios`, `android`, `web` |
| `notification_type` | `appointment_reminder`, `appointment_confirmed`, `appointment_cancelled`, `general` |

> Ranija dokumentacija je navodila `doctor`/`assistant` role — **to je bila
> greška**. Živa baza ima samo `patient` / `staff` / `admin`. Razlika
> doktor-vs-asistent se izražava kroz `profiles.specialty`, ne kroz rolu.

---

## Tabele (`public`) — 10

### `profiles` (1:1 sa `auth.users`)
| Kolona | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `role` | `user_role` | NOT NULL, default `patient` |
| `phone` | text | |
| `date_of_birth` | date | |
| `first_name` | text | |
| `last_name` | text | |
| `initials` | text | inicijali doktora (UI) |
| `color_hex` | text | boja doktora u kalendaru |
| `specialty` | text | specijalnost (razlikuje doktora od asistenta) |
| `is_active` | boolean | NOT NULL default true — soft delete u admin panelu |
| `created_at` / `updated_at` | timestamptz | NOT NULL default now() |

### `appointments`
| Kolona | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | default `uuid_generate_v4()` |
| `patient_id` | uuid | FK → profiles, nullable (walk-in) |
| `service_id` | uuid | FK → services, nullable |
| `doctor_id` | uuid | FK → profiles, nullable |
| `chair_id` | uuid | FK → chairs, nullable |
| `starts_at` / `ends_at` | timestamptz | NOT NULL |
| `status` | `appointment_status` | NOT NULL default `pending` |
| `notes` / `admin_notes` | text | |
| `created_by` | uuid | FK → profiles |
| `cancelled_at` | timestamptz | |
| `cancelled_by` | uuid | |
| `cancellation_reason` | text | |
| `walk_in_name` / `walk_in_phone` | text | za walk-in (bez patient_id) |
| `created_at` / `updated_at` | timestamptz | NOT NULL default now() |

**CHECK constraint-i:**
- `appointments_check`: `ends_at > starts_at`
- `check_cancellation_fields`: ako je `status = 'cancelled'` → `cancelled_at` i `cancelled_by` moraju biti popunjeni
- `patient_or_walkin`: `patient_id` NOT NULL **ili** (`walk_in_name` i `walk_in_phone` NOT NULL)

**Dual overlap constraint (EXCLUDE USING gist, zahteva `btree_gist`):**
- `appointments_no_overlap` — po **doktoru**: `COALESCE(doctor_id, '0000…') WITH =`, `tstzrange(starts_at, ends_at, '[)') WITH &&`, `WHERE status IN ('confirmed','pending')`
- `appointments_no_overlap_chair` — po **stolici**: `chair_id WITH =`, isti tstzrange, `WHERE status IN ('confirmed','pending') AND chair_id IS NOT NULL`

### `chairs`
Fizičke radne jedinice (stolice) ordinacije.
| Kolona | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `name` | text | NOT NULL |
| `display_order` | integer | NOT NULL default 0 |
| `is_active` | boolean | NOT NULL default true |
| `created_at` / `updated_at` | timestamptz | NOT NULL default now() |

### `services`
| Kolona | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | NOT NULL |
| `description` | text | |
| `category` | text | NOT NULL default `Ostalo` |
| `duration_minutes` | integer | NOT NULL, CHECK `> 0` |
| `price` | numeric(10,2) | CHECK NULL ili `>= 0` |
| `is_active` | boolean | NOT NULL default true |
| `display_order` | integer | NOT NULL default 0 |
| `created_at` / `updated_at` | timestamptz | NOT NULL default now() |

### `working_hours`
| Kolona | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | |
| `day_of_week` | smallint | NOT NULL UNIQUE, CHECK 0–6 |
| `opens_at` / `closes_at` | time | |
| `is_closed` | boolean | NOT NULL default false |
| `created_at` / `updated_at` | timestamptz | |

CHECK `working_hours_check`: `is_closed = true` **ili** (`opens_at` < `closes_at`, oba NOT NULL).

### `time_off`
| Kolona | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | |
| `title` | text | NOT NULL |
| `start_date` / `end_date` | date | NOT NULL, CHECK `start_date <= end_date` |
| `start_time` / `end_time` | time | CHECK: oba NULL ili oba NOT NULL sa `start_time < end_time` |
| `reason` | text | |
| `created_at` / `updated_at` | timestamptz | |

### `push_tokens`
`id`, `user_id` (FK→profiles CASCADE), `token` (UNIQUE), `platform` (`device_platform`), `created_at`/`updated_at`.

### `notifications`
`id`, `user_id` (FK→profiles CASCADE), `type` (`notification_type` default `general`), `title`, `body`, `data` jsonb, `read_at`, `created_at`.

### `audit_log`
`id`, `actor_id` (FK→profiles SET NULL), `action`, `entity_type`, `entity_id`, `old_data`/`new_data` jsonb, `created_at`.

### `ai_conversations`
`id`, `user_phone`, `role` (CHECK `user`/`assistant`/`system`), `message`, `metadata` jsonb, `created_at`. (Nije aktivno u web app-u.)

---

## Foreign keys (`public`) — ON DELETE ponašanje

| FK | Referencira | ON DELETE |
|---|---|---|
| `appointments.chair_id` | chairs | RESTRICT |
| `appointments.created_by` | profiles | SET NULL |
| `appointments.doctor_id` | profiles | SET NULL |
| `appointments.patient_id` | profiles | CASCADE |
| `appointments.service_id` | services | RESTRICT |
| `audit_log.actor_id` | profiles | SET NULL |
| `notifications.user_id` | profiles | CASCADE |
| `profiles.id` | auth.users | CASCADE |
| `push_tokens.user_id` | profiles | CASCADE |

---

## Funkcije (`public`)

| Funkcija | Tip | Svrha |
|---|---|---|
| `current_user_role()` | sql STABLE, SECDEF | vraća `role::text` za `auth.uid()` |
| `is_staff()` | sql STABLE, SECDEF | true ako je role ∈ {admin, staff} |
| `is_admin()` | sql STABLE, SECDEF | true ako je role = admin |
| `handle_new_user()` | trigger, SECDEF | auto-kreira `profiles` red posle `auth.signUp` (čita raw_user_meta_data) |
| `prevent_role_self_elevation()` | trigger, SECDEF | blokira promenu `role` osim ako je pozivalac admin |
| `set_updated_at()` | trigger | postavlja `updated_at = now()` |
| `admin_upsert_doctor(...)` | plpgsql, SECDEF | admin-gated upsert doktor-polja; kastuje rolu u `user_role` (enum cast fix) |
| `admin_set_doctor_active(p_id, p_active)` | plpgsql, SECDEF | admin-gated soft delete/reaktivacija doktora |
| `create_guest_appointment(...)` | plpgsql, SECDEF | guest/walk-in booking (validacija + overlap check) |
| `delete_service(uuid)` | plpgsql, SECDEF | admin-gated brisanje usluge (blokira ako ima budućih termina) |
| `reorder_services(jsonb)` | plpgsql, SECDEF | admin-gated reorder `display_order` |
| `get_user_email(uuid)` | plpgsql STABLE, SECDEF | email iz `auth.users` (admin za sve, ostali samo za sebe) |

---

## RLS politike — NAPOMENA o dupliranju

RLS je uključen na svim `public` tabelama. **Politike imaju duplikate iz ručnog
razvoja** — više preklapajućih politika za istu operaciju na `appointments`,
`services` i `profiles` (npr. „Staff full access appointments" + `appointments_*`
set; više SELECT politika na `profiles`; više read politika na `services`).

Ovo **radi ispravno** — PostgreSQL OR-uje sve permisivne politike za istu
operaciju, pa pristup nije pogrešan, samo je redundantno. **Planiran je poseban
`security-cleanup` task** da se konsoliduju u jedan koherentan set.

Sažetak po tabeli (pristup je korektan, imenovanje neuredno):
- **appointments**: staff/admin pun pristup; pacijent vidi/menja svoje; anon vidi confirmed/pending slotove (guest booking).
- **services**: staff/admin menja; svi authenticated čitaju; anon vidi aktivne.
- **profiles**: svako vidi/menja svoj red; staff/admin vide sve.
- **chairs**: admin menja, staff čita.
- **notifications / push_tokens**: vlasnik (`user_id = auth.uid()`); staff dodatno na notifications.
- **working_hours / time_off**: staff menja, svi čitaju (+ anon read).
- **audit_log**: samo admin SELECT.
- **ai_conversations**: samo service_role.

---

## Radni tok migracija ubuduće

1. Promene šeme = **nove migracije** u `supabase/migrations/` (timestamp
   `YYYYMMDDHHMMSS_naziv.sql`), povrh baseline-a. Nema više ručnih izmena kroz
   SQL Editor.
2. Posle promene šeme regeneriši tipove:
   ```bash
   npx supabase gen types typescript --linked > lib/db/types.ts
   ```
3. Nove kolone prvo kao **NULLABLE** (mobilna app deli istu bazu — izbegavaj
   breaking promene).
4. **Service role key** je samo web/server-side (admin operacije), nikad u
   klijentu ni u mobilnoj.
