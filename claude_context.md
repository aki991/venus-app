# Venus Web — Kontekst projekta

Sažetak web aplikacije (admin/staff panel stomatološke ordinacije „Venus"). Dokument
ne sadrži nikakve ključeve ni tajne; svi sekreti su u `.env.local` (git-ignored).

---

## 1. Tech stack

- **Framework:** Next.js 16.2.9 (App Router, Turbopack), React 19, TypeScript 5.
- **Backend/DB:** Supabase (PostgreSQL + Auth + RLS). Klijenti:
  - `lib/supabase/client.ts` — browser (anon key, RLS).
  - `lib/supabase/server.ts` — server/cookie (anon key + sesija korisnika, RLS).
  - `lib/supabase/admin.ts` — service-role (zaobilazi RLS, samo server-side admin operacije).
- **State / data:** `@tanstack/react-query` (server data + cache), `zustand` (UI/kalendar state, `persist`).
- **Forme/validacija:** `react-hook-form` + `zod` (`@hookform/resolvers`).
- **UI:** Tailwind CSS v4, Radix UI / shadcn-style komponente (`components/ui/*`),
  `lucide-react` (ikone), `sonner` (toast), `next-themes`, `@dnd-kit/*` (drag-and-drop redosled).
- **Datumi:** `date-fns` (+ `sr` locale).

Crno-zlatna tema; ključne CSS varijable: `--venus-canvas` (#000 — kalendar, nav),
`--venus-surface` (#1c1c1c — kartice/modali), `--venus-gold` (#e5c45f).

---

## 2. Supabase šema

> Single source of truth = live baza; `supabase/migrations/00000000000000_baseline.sql`
> je pg_dump te baze. Ručno-pisane migracije se pokreću u Supabase SQL Editor-u.

### Enumi
- **`user_role`**: `patient` | `staff` | `admin`  → **doktor = `staff`** (admin je `admin`). Nema `doctor`.
- **`appointment_status`**: `pending` | `confirmed` | `cancelled` | `completed` | `no_show`.
- **`device_platform`**: `ios` | `android` | `web`.
- **`notification_type`**: `appointment_reminder` | `appointment_confirmed` | `appointment_cancelled` | `general`.

### Tabele

**`profiles`** (1:1 sa `auth.users`, `id` = `auth.users.id`)
| kolona | tip | napomena |
|---|---|---|
| id | uuid PK | FK→auth.users ON DELETE CASCADE |
| role | user_role | default `patient`; doktori = `staff`/`admin` |
| first_name, last_name | text | ime doktora/pacijenta |
| initials | text | inicijali (kalendar blok/avatar) |
| color_hex | text | boja doktora (`#RRGGBB`) |
| specialty | text | specijalnost |
| phone | text | |
| is_active | bool | default true; soft-delete doktora |
| display_order | int | redosled doktora (migr. 20250106/20250107; default 9999) |
| date_of_birth | date | |
| created_at, updated_at | timestamptz | |

**`appointments`**
| kolona | tip | napomena |
|---|---|---|
| id | uuid PK | |
| patient_id | uuid | FK→profiles ON DELETE CASCADE (nullable za walk-in) |
| doctor_id | uuid | **FK→profiles ON DELETE SET NULL** |
| chair_id | uuid | **FK→chairs ON DELETE RESTRICT** |
| service_id | uuid | FK→services ON DELETE RESTRICT (nullable) |
| starts_at, ends_at | timestamptz | CHECK `ends_at > starts_at` |
| status | appointment_status | default `pending` |
| notes, admin_notes | text | |
| walk_in_name, walk_in_phone | text | walk-in (kad nema patient_id) |
| created_by | uuid | FK→profiles ON DELETE SET NULL |
| cancelled_at, cancelled_by, cancellation_reason | | |
| created_at, updated_at | timestamptz | |

CHECK-ovi: `patient_or_walkin` (patient_id **ili** walk_in_name+walk_in_phone),
`check_cancellation_fields` (cancelled ⇒ cancelled_at+cancelled_by).
EXCLUDE (gist): `appointments_no_overlap` (po `doctor_id`, status confirmed/pending),
`appointments_no_overlap_chair` (po `chair_id` kad nije null, confirmed/pending).

**`chairs`**: id PK, name, display_order (default 0), is_active, created_at, updated_at.

**`services`**: id PK, name, description, category (default 'Ostalo'), duration_minutes
(CHECK >0), price numeric(10,2) (CHECK ≥0), is_active, display_order, created_at, updated_at.

**`working_hours`**: id PK, day_of_week (0–6), opens_at, closes_at, is_closed. (App trenutno
koristi hardkodovano 09:00–15:00, 15-min slotovi, Pon–Pet — `lib/constants/workingHours.ts`.)

**`time_off`**: id PK, title, start_date, end_date, start_time, end_time, reason.

**`notifications`**: id PK, user_id (FK→profiles CASCADE), type, title, body, data jsonb, read_at.

**`push_tokens`**: id PK, user_id (FK→profiles CASCADE), token, platform (device_platform).

**`audit_log`**: id PK, actor_id (FK→profiles SET NULL), action, entity_type, entity_id, old_data, new_data.

**`ai_conversations`**: id PK, user_phone, role (user/assistant/system), message, metadata jsonb.

**`app_settings`** (migr. 20250107): `key` text PK, `value` text, `updated_at`. Key-value
podešavanja; trenutno drži `ai_default_doctor_id`.

---

## 3. RPC funkcije (public)

| RPC | parametri | šta radi |
|---|---|---|
| **`get_ai_default_doctor()`** | — → uuid | **AI default doktor** za n8n. Vrati izabranog (`app_settings.ai_default_doctor_id`) ako je `is_active` staff/admin; inače prvog aktivnog doktora (`display_order`, pa `first_name`); NULL samo ako nema aktivnih. SECURITY DEFINER; grant `anon/authenticated/service_role`. |
| **`create_guest_appointment(p_walk_in_name, p_walk_in_phone, p_service_id, p_starts_at, p_ends_at)`** | → jsonb | Guest/walk-in booking (mobilna/anon). Validira ime/telefon/vreme, proverava da je usluga aktivna, odbija preklapanje (ERRCODE 23P01), upisuje termin kao `confirmed` bez patient_id. Vraća `{id, success}`. |
| `admin_upsert_doctor(p_id, p_first_name, p_last_name, p_initials, p_color_hex, p_specialty, p_phone)` | → uuid | Admin-gated upsert doktor-polja + `role=staff` (ne demote-uje admina). |
| `admin_set_doctor_active(p_id, p_active)` | → void | Admin-gated soft-delete/reaktivacija doktora. |
| `admin_reorder_doctors(items jsonb)` | → void | Admin-gated reorder doktora (`[{id, display_order}]`). (migr. 20250106) |
| `reorder_services(items jsonb)` | → void | Admin-gated reorder usluga (`[{id, display_order}]`). |
| `delete_service(service_uuid)` | → void | Admin-gated; odbija ako usluga ima buduće confirmed termine; inače NULL-uje service_id i briše. |
| `get_user_email(user_id)` | → text | Vrati email iz `auth.users` (admin za sve, korisnik samo za sebe). |
| `is_staff()` / `is_admin()` / `current_user_role()` | → bool/text | Helperi za RLS (role trenutnog `auth.uid()`). |
| `handle_new_user()` (trigger) | | Posle `auth.signUp` pravi `profiles` red (role `patient`). |
| `prevent_role_self_elevation()` (trigger) | | Brani korisniku da sam sebi podigne role. |
| `set_updated_at()` (trigger) | | Auto `updated_at = now()`. |

---

## 4. RLS politike (kratko, po tabeli)

- **appointments:** staff/admin pun CRUD (`Staff full access` / `appointments_staff_update|delete` via `is_staff()`); pacijent vidi/ažurira/otkazuje svoje (`appointments_select/insert/patient_cancel`); anon vidi samo zauzete slotove (confirmed/pending).
- **profiles:** korisnik vidi/ažurira svoj red; staff/admin čita sve (`staff_read_all_profiles`, `profiles_select/update` via `is_staff()`); admin update (`Admins can update all`).
- **services:** svi authenticated čitaju (`services_select`); staff/admin modifikuju (`services_modify`); anon vidi aktivne.
- **chairs:** staff čita (`staff_read_chairs`); admin menja (`admin_manage_chairs`).
- **app_settings:** samo admin (`Admin manages app_settings`); service_role zaobilazi RLS.
- **working_hours / time_off:** svi čitaju; staff modifikuje. Anon vidi (working: nezatvorene).
- **notifications / push_tokens:** korisnik vidi/menja svoje; staff dodatno za notifications.
- **audit_log:** samo admin čita (`audit_log_select_admin`).
- **ai_conversations:** `Service role full access` (samo service_role).

---

## 5. Feature: „AI zakazivanje" (n8n/WhatsApp)

Cilj: admin bira kog doktora AI agent koristi pri zakazivanju, umesto hardkodovanja.

- **Podešavanje:** `app_settings` red `key = 'ai_default_doctor_id'`, `value = <doctor uuid>`.
  Čita se u `lib/db/admin.ts → fetchAiDefaultDoctorId()`; upisuje preko admin-gated
  server akcije `lib/admin/settings-actions.ts → setAiDefaultDoctorAction(doctorId)` (upsert).
- **UI:** tab **„AI zakazivanje"** u `/podesavanja` (`components/admin/AiBookingTab.tsx`) —
  dropdown doktora + Sačuvaj. Lista ide preko **`useDoctors`** (`hooks/useDoctors.ts` →
  `lib/db/doctors.ts → fetchDoctors`), pa je **isti redosled kao „Tim ordinacije"** u
  sidebar-u: `display_order` (asc), fallback `first_name`.
- **Čitanje iz n8n:** RPC **`get_ai_default_doctor()`** (service-role POST na
  `/rest/v1/rpc/get_ai_default_doctor`) → vraća `doctor_id` koji n8n upisuje u
  `appointments.doctor_id`. Strog sa fallback-om (vidi RPC tabelu). Alternativa:
  `SELECT value FROM app_settings WHERE key='ai_default_doctor_id'`.
- n8n INSERT termina treba da postavi bar: `doctor_id`, `chair_id`, `starts_at`,
  `ends_at`, `status` (`confirmed`), i pacijenta (`patient_id` **ili** `walk_in_name`+`walk_in_phone`).

---

## 6. Ključni izvorni fajlovi

**Booking / kalendar**
- `app/(dashboard)/kalendar/page.tsx` — stranica kalendara; bira aktivnu stolicu, učitava termine za nedelju.
- `components/kalendar/WeekView.tsx` — nedeljni grid Pon–Pet (vikend se ne prikazuje).
- `components/kalendar/DayColumn.tsx` — kolona dana: slotovi, hover-indikator vremena, prošli slotovi neklikabilni.
- `components/kalendar/AppointmentBlock.tsx` — blok termina (boja doktora, status, izvedeni „Završen" za prošle).
- `components/kalendar/NewAppointmentModal.tsx` — modal „Novi termin" (status uklonjen, uvek `confirmed`).
- `components/kalendar/AppointmentDetailModal.tsx` — detalji/izmena/otkazivanje termina.
- `lib/db/appointments.ts` — fetch (po nedelji/stolici) + create/update/cancel; mapiranje overlap grešaka.
- `lib/validations/appointment.ts` — zod šema (radni dan/vreme, pacijent-ili-walkin).
- `lib/constants/workingHours.ts` — radno vreme/slotovi, `defaultCalendarDate` (vikend → sledeća nedelja).
- `lib/constants/appointmentStatus.ts` — STATUS_CONFIG + `effectiveStatus` (prošli confirmed → completed).
- `hooks/useAppointments.ts`, `hooks/useAppointmentMutations.ts` — react-query za termine.
- `stores/kalendarStore.ts`, `stores/appointmentModalStore.ts` — kalendar/modal state.

**Doktori / podešavanja**
- `app/(dashboard)/podesavanja/page.tsx` — admin-only; učitava doktore, stolice, ai_default_doctor.
- `components/admin/AdminPanel.tsx` — tabovi Doktori / Stolice / AI zakazivanje.
- `components/admin/DoctorsTab.tsx` — CRUD doktora, drag-and-drop redosled, dijalog „Termini doktora".
- `components/admin/ChairsTab.tsx` — CRUD stolica.
- `components/admin/AiBookingTab.tsx` — izbor AI default doktora.
- `lib/admin/doctor-actions.ts` — server akcije za doktore (create/update/invite/active/reorder/delete; delete dozvoljen ako nema aktivnih budućih termina).
- `lib/admin/chair-actions.ts` — server akcije za stolice (delete odvezuje prošle/otkazane pa briše).
- `lib/admin/settings-actions.ts` — `setAiDefaultDoctorAction`.
- `lib/db/admin.ts` — `fetchAllDoctors`, `fetchAllChairs`, `fetchAiDefaultDoctorId`.
- `lib/db/doctors.ts` — `fetchDoctors` (sidebar/dropdown, redosled `display_order`→`first_name`).
- `lib/db/doctor-appointments.ts` + `hooks/useDoctorAppointments.ts` — svi termini doktora (uklj. otkazane/prošle).
- `lib/admin/guard.ts` — `requireAdmin`; `lib/auth/get-user.ts` — `getCurrentUser`/`requireStaff`.
- `components/layout/Sidebar.tsx` — nav + „Tim ordinacije" (filter po doktoru), redosled iz `useDoctors`.

**Usluge (cenovnik)**
- `app/(dashboard)/usluge/page.tsx` + `components/usluge/ServiceList.tsx` — lista, filter po kategoriji, DnD redosled, admin CRUD.
- `components/usluge/ServiceFormDialog.tsx` — forma usluge.
- `lib/admin/service-actions.ts`, `lib/db/services.ts`, `hooks/useServices.ts`.

**Migracije:** `supabase/migrations/` (baseline + ručne: 20250106 redosled doktora, 20250107 AI default doktor; `_archive/` = već primenjene rane migracije).
