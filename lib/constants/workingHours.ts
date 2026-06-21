// Radno vreme ordinacije. Kasnije može da se čita iz working_hours tabele,
// za sad hardkodirano na jednom mestu.
export const WORKING_HOURS = {
  start: 9, // 09:00
  end: 15, // 15:00
  slotMinutes: 15, // granularnost slotova
} as const;

// Generiše listu time stringova za dropdown: ['09:00', '09:15', ..., '14:45']
// (poslednji slot počinje pre end-a da bi termin mogao da se završi do 15:00)
export function getTimeSlots(
  slotMin: number = WORKING_HOURS.slotMinutes
): string[] {
  const slots: string[] = [];
  for (let h = WORKING_HOURS.start; h < WORKING_HOURS.end; h++) {
    for (let m = 0; m < 60; m += slotMin) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

// Sklapa lokalni datum (YYYY-MM-DD) + vreme (HH:mm) u Date u LOKALNOJ zoni.
// Komponente parsiramo ručno da izbegnemo UTC pomeranje koje pravi
// new Date("YYYY-MM-DDTHH:mm") u nekim okruženjima.
export function combineDateTime(dateStr: string, time: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

// Današnji datum kao YYYY-MM-DD (lokalno) — za min= na date inputu i poređenja.
export function todayDateStr(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Datum koji kalendar treba da prikaže "po defaultu".
// Ordinacija ne radi vikendom (Pon–Pet), pa subotom/nedeljom vraćamo
// ponedeljak SLEDEĆE nedelje — prvi dan kada se može zakazati termin.
// Radnim danom vraća prosleđeni datum (default = danas).
export function defaultCalendarDate(now: Date = new Date()): Date {
  const day = now.getDay(); // 0 = nedelja, 6 = subota
  const addDays = day === 6 ? 2 : day === 0 ? 1 : 0;
  const d = new Date(now);
  d.setDate(d.getDate() + addDays);
  return d;
}

// Da li je dati datum (YYYY-MM-DD) radni dan (Pon–Pet)?
// Parsiramo komponente ručno da izbegnemo UTC pomeranje iz new Date("YYYY-MM-DD").
export function isWorkingDay(dateStr: string): boolean {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return false;
  const day = new Date(y, m - 1, d).getDay(); // 0 = nedelja, 6 = subota
  return day !== 0 && day !== 6;
}

// Da li se termin koji počinje u `time` (HH:mm) i traje `durationMin` minuta
// uklapa u radno vreme (start:00 – end:00)?
export function fitsWithinWorkingHours(
  time: string,
  durationMin: number
): boolean {
  if (!time) return false;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const startMin = h * 60 + m;
  const endMin = startMin + durationMin;
  return (
    startMin >= WORKING_HOURS.start * 60 && endMin <= WORKING_HOURS.end * 60
  );
}
