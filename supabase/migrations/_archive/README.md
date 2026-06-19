# Arhivirane migracije

Ove migracije su tokom razvoja **primenjene ručno kroz Supabase SQL Editor**
(enum `staff`, `chair_id`, dual overlap constraint, `is_active`, admin funkcije,
enum cast fix, itd.). Nisu pouzdano odražavale stanje žive baze jer je dosta
toga menjano direktno u editoru van ovih fajlova.

Njihov **kumulativni efekat je u celosti uhvaćen** u
`../00000000000000_baseline.sql` — to je dump žive baze (`public` + `auth`
šeme) napravljen **2026-06-19**, posle svih ovih promena.

Zato:

- **NE pokreću se ponovo.** `supabase db reset` koristi isključivo baseline iz
  roditeljskog `migrations/` foldera; fajlovi u ovom `_archive/` podfolderu se
  ne učitavaju (CLI ne rekurzira u podfoldere).
- Čuvaju se **samo radi istorije** — da se vidi kojim koracima se došlo do
  trenutne šeme.

## Spisak (hronološki)

| Fajl | Šta je radio |
|---|---|
| `20250101000001_multi_doctor_support.sql` | Multi-doctor: `doctor_id` na `appointments`, doktor polja na `profiles` (`initials`/`color_hex`/`specialty`), per-doctor overlap |
| `20250102000001_staff_rls_policies.sql` | RLS politike za `staff` rolu |
| `20250103000001_cleanup_offhours_test_appointments.sql` | Čišćenje test termina van radnog vremena |
| `20250104000001_add_chairs.sql` | Tabela `chairs` + `chair_id` na `appointments` + per-chair overlap |
| `20250105000001_admin_panel.sql` | Admin panel: `is_active`, RPC funkcije (`admin_upsert_doctor`, `admin_set_doctor_active`), enum cast fix |

## Ubuduće

Nove promene šeme idu kao **nove migracije** u `migrations/` (timestamp format
`YYYYMMDDHHMMSS_naziv.sql`) povrh baseline-a — više se ništa ne menja ručno
kroz SQL Editor.
