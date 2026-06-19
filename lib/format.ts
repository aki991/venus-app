// Formatiranje vrednosti za prikaz (cena u RSD, trajanje termina).

const rsdFormatter = new Intl.NumberFormat("sr-RS", {
  maximumFractionDigits: 2,
});

/** 4500 → "4.500 RSD", 4500.5 → "4.500,5 RSD", null → "—". */
export function formatRSD(price: number | null | undefined): string {
  if (price == null) return "—";
  return `${rsdFormatter.format(price)} RSD`;
}

/** 45 → "45 min", 60 → "1 h", 90 → "1 h 30 min", 120 → "2 h". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
