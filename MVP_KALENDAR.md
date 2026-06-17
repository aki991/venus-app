# Venus Web — MVP: Kalendar

Specifikacija prve faze (MVP). Samo kalendar — bez dnevnika pacijenata,
računa, usluga. Cilj: lansiranje radne verzije za doktore i asistente koja
zamenjuje ad-hoc Google Calendar / papir / WhatsApp organizovanje termina.

> Dizajn za referenc: `Venus_raspored_dc_html.docx` u project knowledge.
> Slike: `01states.png`, `02states.png`.

---

## User stories

### Doktor / asistent
1. **Loguje se** sa email/password (isti credentials kao u mobilnoj)
2. **Vidi nedeljni kalendar** sa svim terminima ordinacije, kolor-kodirano po doktoru
3. **Klikne na slot** → otvara modal "Novi termin" → bira pacijenta (search + autocomplete), doktora, uslugu, vreme; sačuva
4. **Klikne na postojeći termin** → modal sa detaljima → može da edituje status, vreme, dodatne notes, da otkaže
5. **Filtrira kalendar po doktoru** preko chip-ova u sidebar-u ("Tim ordinacije")
6. **Menja prikaz**: Standard (kalendar + agenda) ili Fokus (samo kalendar, full-width)
7. **Prebacuje temu** dark/light
8. **Search bar u top-baru** — globalna pretraga pacijenata po imenu/telefonu (za brzo nalaženje pre kreiranja termina)

### Pacijent
- **Ne može se logovati u web app** — vidi poruku "Ova aplikacija je za zaposlene ordinacije. Preuzmite mobilnu Venus app." sa linkom na App Store / Google Play

### Admin
- Sve što i doktor/asistent
- **+ Kreiranje novih doktora/asistenata** (basic settings strana — ne mora biti deo MVP-a ako nemamo vremena; admin može ručno kroz Supabase Studio za sada)

---

## Funkcionalnosti (UI komponente)

### Layout
- **Sidebar** (262px expanded, 70px collapsed) sa Venus logom, navigacijom, "Tim ordinacije"
- **TopBar** sa search input, theme toggle, settings ikona, avatar trenutnog usera, "+ Novi termin" CTA
- **Main area** koji se menja po nav-u (za MVP samo `/kalendar` radi)

### Kalendar (`/kalendar`)
- **Mesečni mini-picker** u sidebar-u (klik na datum → skok na tu nedelju)
- **Nedeljni view** kao glavni prikaz:
  - 7 kolona (Pon–Ned)
  - Time grid 08:00–20:00 sa 30-min slotovima
  - Termini kao kartice u koloni dana, visina = trajanje, levo bojni bar = boja doktora
- **Agenda panel desno** (samo u Standard layout-u): "Dnevni pregled" za izabrani dan, lista termina sa vremenima i pacijentima
- **Toggle Standard / Fokus** u headeru
- **Layout switcher** za buduće: Day / Week / Month

### Modal "Novi termin"
- Pacijent: search + autocomplete iz `profiles` gde `role='patient'`
- Opcija "Walk-in / gost" → input `walk_in_name`, `walk_in_phone`
- Doktor: dropdown iz `profiles` gde `role IN ('doctor', 'admin')`
- Usluga: dropdown iz `services` (filtrirano `is_active=true`)
- Datum + vreme početka (date + time picker)
- Trajanje: auto-popuni iz `services.duration_minutes`, dozvoljeno menjanje
- Notes (opciono)
- Validacija: zod schema sa overlap check (klijent-side warning, server enforce-uje preko EXCLUDE constraint)

### Modal "Detalji termina" (klik na postojeći)
- Pun prikaz svih polja
- Tabovi: **Pregled**, **Edit**, **Otkazi**
- Status badge sa bojama (potvrđen, stigao, otkazan, završen, ne-pojavljivanje)
- Audit info: ko kreirao, kada, ko poslednji menjao
- Brz CTA za otkazivanje sa razlogom

---

## Data flow (kako se kreira termin)

```
[User klikne slot u kalendaru]
        ↓
[Otvara se NewAppointmentModal sa pre-popunjeni starts_at]
        ↓
[User popunjava formu (react-hook-form + zod)]
        ↓
[Submit → TanStack Query mutation]
        ↓
[supabase.from('appointments').insert({...})]
        ↓
[Ako EXCLUDE constraint baci error (23P01) → toast "Termin se preklapa sa drugim"]
        ↓
[Ako uspeh → TanStack Query invalidate('appointments') → kalendar refresh]
        ↓
[Toast "Termin zakazan"]
        ↓
[Modal se zatvara]
```

**Realtime sync (postavimo u MVP, ali full implementation u Fazi 4):**
- `supabase.channel('appointments-changes').on('postgres_changes', ...)` → kad neko drugi kreira/menja, automatski osveži lokalni cache

---

## Što NIJE u MVP-u (prebacujemo u Fazu 2+)

- ❌ Dnevnik pacijenata (kartoni, anamneza)
- ❌ Odontogram
- ❌ Protokol Dg/Th
- ❌ Snimci / RTG
- ❌ Računi i fakturisanje
- ❌ Cenovnik admin (edit usluga) — može da se radi kroz Supabase Studio za sad
- ❌ User management (kreiranje doktora) — ručno kroz Supabase za sad
- ❌ Push notifikacije za zaposlene
- ❌ Izveštaji i analitika
- ❌ Drag & drop termina između slotova
- ❌ Multi-resource view (kalendar po stolicama / sobama)
- ❌ Bulk operacije (premeštanje svih termina jednog dana)

---

## Acceptance criteria za MVP

1. ✅ Doktor može da se loguje sa svojim Supabase nalogom (admin već postoji; nove doktore se ručno dodaje)
2. ✅ Pacijent koji se loguje vidi error stranicu "Aplikacija je za zaposlene"
3. ✅ Nedeljni kalendar se učitava sa svim terminima trenutnog perioda u <2s
4. ✅ Klik na slobodan slot otvara modal za novi termin sa pre-popunjenim datumom/vremenom
5. ✅ Kreiranje termina radi end-to-end, novi termin se pojavljuje u kalendaru bez refresh-a
6. ✅ Pokušaj preklapajućeg termina daje user-friendly grešku
7. ✅ Otkazivanje termina postavlja status='cancelled' i popunjava cancellation polja
8. ✅ Filtriranje po doktoru radi (chip-ovi u sidebar-u)
9. ✅ Theme toggle radi i pamti se u localStorage
10. ✅ Standard ↔ Fokus layout switch radi
11. ✅ Termin kreiran kroz mobilnu app se odmah vidi u web kalendaru (test: ručno kreirati u DB, refresh web)
12. ✅ Build prolazi `npm run type-check` i `npm run lint` bez warning-a
13. ✅ Production deploy na Vercel-u radi

---

## UI dizajn tokeni (iz Venus_raspored_dc_html.docx)

```css
/* CSS varijable - dodaj u app/globals.css */

:root {
  --gold: #c9a24b;
  --gold-bright: #d4b465;
  --gold-dim: rgba(201, 162, 75, 0.4);

  /* Dark theme (default) */
  --bg: #15130c;
  --surface: #1c1a13;
  --surface-2: #232017;
  --border: #2e2a20;
  --line: rgba(255, 255, 255, 0.05);

  --text: #f3efe7;
  --text-dim: #b8b09e;
  --text-faint: #6b6557;

  --danger: #c84545;
  --header-bg: rgba(28, 26, 19, 0.8);
}

[data-theme='light'] {
  --bg: #faf8f3;
  --surface: #ffffff;
  --surface-2: #f5f1e8;
  --border: #e8e2d2;
  --line: rgba(0, 0, 0, 0.05);

  --text: #1a1612;
  --text-dim: #5a5448;
  --text-faint: #8a8474;

  --danger: #b8392e;
  --header-bg: rgba(255, 255, 255, 0.85);
}
```

### Fontovi
- **Cormorant Garamond** (serif) — naslovi, brendiranje VENUS, sekcijski headeri
- **Manrope** (sans-serif) — body, UI, brojevi (tabular-nums)

Učitati preko Next.js `next/font`:

```typescript
// app/layout.tsx
import { Cormorant_Garamond, Manrope } from 'next/font/google';

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  variable: '--font-serif',
});

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});
```

---

## Sledeći koraci posle MVP-a

Kad MVP bude live i ordinacija ga koristi par nedelja, prikupljamo feedback
i prelazimo na **Fazu 2 — Dnevnik pacijenata + Odontogram**. To je značajno
veći scope (medicinski kartoni, snimci u Storage-u, GDPR audit), pa će
zahtevati posebnu specifikaciju kao `MVP_DNEVNIK.md`.
