# Venus Web — Arhitektura

Web aplikacija za internu upotrebu u stomatološkoj ordinaciji Venus. Koriste je
doktori, asistenti i administratori. Pacijenti koriste **mobilnu aplikaciju**
(`stomatoloska-app`, Expo + React Native) koja deli istu Supabase bazu.

> Ako te zanima MVP scope ili šema baze, vidi `MVP_KALENDAR.md` i `SCHEMA.md`.

---

## Tech Stack

### Frontend
- **Next.js 15** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS v4** (zero-config, CSS-only)
- **shadcn/ui** za primitive (Button, Dialog, Input, Select, Popover, Tabs)
- **TanStack Query v5** za server state (isti kao mobilna — deljiv kod kasnije)
- **Zustand v5** za client state (sidebar, tema, modali)
- **react-hook-form v7** + **zod v4** za forme (isti kao mobilna)
- **date-fns v4** + `date-fns/locale/sr` za datume (isti kao mobilna)
- **Lucide React** za ikone (mobilna koristi Expo vector-icons, ali na web-u Lucide je standard za shadcn)

### Backend
- **Supabase** — PostgreSQL, Auth (cookies sesion), Storage (kasnije za RTG), Realtime, Edge Functions
- **`@supabase/ssr`** za Next.js integraciju (server/client komponente, middleware)
- Migracije: timestamp format `YYYYMMDDHHMMSS_name.sql` u `supabase/migrations/`

### Hosting & infra
- **Vercel** za web (auto-deploy iz `main` branch-a, preview-ovi iz PR-ova)
- **Supabase** je već konfigurisan
- **Sentry** za error tracking (dodajemo u Fazi 2)

---

## Folder struktura

```
venus-web/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── reset-password/page.tsx     # landing za reset link iz emaila
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # sidebar + topbar + auth guard
│   │   ├── page.tsx                    # redirect na /kalendar
│   │   ├── kalendar/page.tsx
│   │   ├── dnevnik/page.tsx            # Faza 2
│   │   ├── dnevnik/[id]/page.tsx       # Faza 2
│   │   ├── racuni/page.tsx             # Faza 3
│   │   └── usluge/page.tsx             # Faza 3
│   ├── api/                            # samo za webhooks (Stripe, Twilio kasnije)
│   ├── layout.tsx
│   └── globals.css                     # Tailwind direktive + dizajn tokeni
├── components/
│   ├── ui/                             # shadcn primitives
│   ├── kalendar/
│   │   ├── KalendarHeader.tsx
│   │   ├── WeekView.tsx
│   │   ├── DayColumn.tsx
│   │   ├── AppointmentBlock.tsx
│   │   ├── MiniMonthPicker.tsx
│   │   ├── DoctorChipList.tsx
│   │   ├── DailyAgenda.tsx
│   │   └── NewAppointmentModal.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── ThemeToggle.tsx
│   └── shared/
│       ├── PatientAvatar.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # createBrowserClient
│   │   ├── server.ts                   # createServerClient
│   │   └── middleware.ts               # session refresh
│   ├── db/
│   │   ├── types.ts                    # auto-gen: supabase gen types typescript
│   │   ├── appointments.ts             # queries (TanStack Query)
│   │   ├── doctors.ts
│   │   ├── patients.ts
│   │   └── services.ts
│   ├── validations/                    # Zod schemas
│   │   ├── appointment.ts
│   │   └── auth.ts
│   └── utils/
│       ├── cn.ts                       # clsx + tailwind-merge
│       ├── date.ts                     # srpska formatiranja
│       └── colors.ts                   # dizajn tokeni helper
├── hooks/
│   ├── useAppointments.ts
│   ├── useDoctors.ts
│   └── useTheme.ts
├── stores/
│   ├── uiStore.ts                      # sidebar collapsed, tema, layout
│   └── kalendarStore.ts                # selected date, view mode, filter
├── middleware.ts                       # Next.js middleware (auth check)
├── supabase/
│   ├── migrations/                     # SVE nove migracije idu ovde
│   └── seed.sql                        # test podaci za lokalni dev
├── PROJECT_CONTEXT/                    # ovi dokumenti — CC ih čita kao kontekst
│   ├── ARCHITECTURE.md
│   ├── SCHEMA.md
│   └── MVP_KALENDAR.md
└── package.json
```

---

## Coding conventions

- **Server Components** su default. Klijent komponente (`'use client'`) samo gde treba (forme, modali, interaktivni delovi).
- **Data fetching:**
  - Initial load → Server Components sa `createServerClient`
  - Mutacije + invalidacija → TanStack Query u klijent komponentama
- **Forme:** uvek `react-hook-form` + `zod` resolver, **nikad kontrolisani `useState`** za form polja
- **Datumi u DB su `timestamptz`** → uvek raditi sa `Date` objektima u kodu, formatirati za prikaz tek u UI sloju
- **Imports:** apsolutni paths sa `@/` prefix-om (npr. `@/lib/db/appointments`)
- **Naming:** komponente PascalCase, funkcije/hooks camelCase, fajlovi po sadržaju (komponenta = PascalCase.tsx, ostalo kebab-case.ts)
- **Komentari na srpskom** za business logiku, **na engleskom** za tehničke obrasce

---

## Security model

### Role i pristup

| Role | Mobile app | Web app |
|---|---|---|
| `patient` | Pun pristup (svoj karton, svoji termini) | **Blokiran**, redirect na "Ova app je za zaposlene" |
| `assistant` | (trenutno N/A — još ne postoji) | Pun kalendar, pacijenti, termini. **Bez** finansija. |
| `doctor` | (trenutno N/A — još ne postoji) | Pun kalendar, kartoni svojih pacijenata, finansije. |
| `admin` | Postojeći AdminNavigator | Sve što i doctor + user management + cenovnik. |

### Auth strategija
- **Cookies-based session** (`@supabase/ssr`), ne localStorage
- **Middleware** (`middleware.ts`) refresh-uje sesiju na svakom navigation event-u
- **Server Component-i** dobijaju autentifikovanog korisnika preko `createServerClient(cookies())`
- **Login** kroz Server Action — direktan poziv `signInWithPassword`, no API route
- **Role check** se radi u layout-u (`app/(dashboard)/layout.tsx`) i dodatno enforce-uje preko RLS

### RLS politike (vidi `SCHEMA.md` za detalje)
Postojeće RLS u bazi tretira `admin` kao super-user. Mi proširujemo da `doctor`
i `assistant` imaju iste privilegije za sve operacije osim user management-a.

---

## Environment varijable

```
# .env.local (gitignore!)

NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Service role samo za seriozne admin operacije (kreiranje doktora, ne za UI)
# NIKAD ne expose-uj ovo preko klijenta
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Vercel automatski popunjava ova:
# VERCEL_URL, VERCEL_ENV
```

### Production na Vercel-u
- Iste varijable se podese u Vercel project settings → Environment Variables
- `NEXT_PUBLIC_*` ide u sve environments, `SERVICE_ROLE_KEY` samo Production

---

## Build & deploy

```bash
# Lokalno
npm install
npm run dev                              # http://localhost:3000

# Type check
npm run type-check                       # bez build-a, samo tsc --noEmit

# Lint
npm run lint

# Generisanje DB tipova (kada se menja schema)
npx supabase gen types typescript \
  --project-id <YOUR_PROJECT_ID> \
  > lib/db/types.ts

# Production build (Vercel ga radi automatski)
npm run build
npm run start
```

---

## Šta NIJE u scope-u za web app (a jeste za mobilnu)

- Push notifikacije pacijentima — ostaje na mobilnoj (`expo-notifications`)
- Guest booking — ostaje na mobilnoj
- Patient self-service (zakazivanje, otkazivanje sopstvenih) — ostaje na mobilnoj
- Reset password landing **se preuzima** u web app (mobilna ne radi `detectSessionInUrl`)

---

## Plan po fazama

| Faza | Sadržaj | Status |
|---|---|---|
| **0** | Setup, auth, dump postojeće schema, multi-doctor migracija | ⏳ |
| **1 (MVP)** | Kalendar — pregled, kreiranje, edit, cancel termina, doctor filter | ⏳ |
| **2** | Dnevnik pacijenata + Odontogram + Protokol Dg/Th | — |
| **3** | Računi + Usluge (cenovnik admin) | — |
| **4** | Realtime sync, Storage za RTG, PDF računi, audit log UI | — |
| **5** | Notifikacije za zaposlene, izveštaji, multi-ordinacija (ako bude trebalo) | — |
