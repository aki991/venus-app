// Stanja zuba (odgovara public.tooth_condition enum-u u bazi) + boje za prikaz.
export const TOOTH_CONDITIONS = [
  "zdrav",
  "karijes",
  "plomba",
  "kanal",
  "kruna",
  "most",
  "izvadjen",
  "implant",
  "za_vadjenje",
] as const;

export type ToothCondition = (typeof TOOTH_CONDITIONS)[number];

// Površine zuba prikazane kao 5 zona u ćeliji (DB enum ima i 'ceo_zub', ali to
// nije zona u gridu — koristi se za stanja koja pokrivaju ceo zub).
export const TOOTH_SURFACES = [
  "vestibularno",
  "lingvalno",
  "okluzalno",
  "mezijalno",
  "distalno",
] as const;

export type ToothSurface = (typeof TOOTH_SURFACES)[number];

// Anatomske zone klikabilnog zuba (kruna + koren) — odvojene od 5 zona kvadrata.
// Kruna nudi površinska stanja (kao kvadrat), koren endodontska (kanal/vađenje).
export const ANATOMY_SURFACES = ["kruna", "koren"] as const;
export type AnatomySurface = (typeof ANATOMY_SURFACES)[number];

// Sve zone koje nose stanje "po zoni" (5 kvadrat + 2 anatomske); bez 'ceo_zub'.
export type ToothZone = ToothSurface | AnatomySurface;

// DB površina: zona (kvadrat ili anatomska) ili 'ceo_zub' (strukturna stanja).
export type DbToothSurface = ToothZone | "ceo_zub";

// Površinska stanja — beleže se na konkretnu zonu (jednu od 5 površina ili krunu).
export const SURFACE_CONDITIONS = ["karijes", "plomba", "kanal"] as const;

// Endodontska stanja koja nudi KOREN (anatomska zona). 'za_vadjenje' ovde je
// oznaka NA KORENU — semantički različito od strukturnog 'za_vadjenje' (ceo_zub).
export const ROOT_CONDITIONS = ["kanal", "za_vadjenje"] as const;

// Strukturna stanja — beleže se na CEO zub (surface = 'ceo_zub').
export const STRUCTURAL_CONDITIONS = [
  "kruna",
  "most",
  "implant",
  "izvadjen",
  "za_vadjenje",
] as const;

export function isStructuralCondition(c: ToothCondition): boolean {
  return (STRUCTURAL_CONDITIONS as readonly string[]).includes(c);
}

export function isSurfaceCondition(c: ToothCondition): boolean {
  return (SURFACE_CONDITIONS as readonly string[]).includes(c);
}

const _SURFACE_SET = new Set<string>(SURFACE_CONDITIONS);
const _STRUCT_SET = new Set<string>(STRUCTURAL_CONDITIONS);
const _ROOT_SET = new Set<string>(ROOT_CONDITIONS);
const _ZONE_SET = new Set<string>(TOOTH_SURFACES); // 5 zona kvadrata (bez ceo_zub)

/**
 * Validacija (surface, condition) para — JEDAN izvor istine za auto-save i batch.
 * Ključna distinkcija: značenje stanja zavisi od SURFACE kolone, ne od condition-a:
 *  - 'ceo_zub'        → strukturno stanje celog zuba (kruna-nadoknada/most/implant/
 *                       izvadjen/za_vadjenje). Ovde 'kruna' = krunica (nadoknada).
 *  - 'kruna' (zona)   → površinsko stanje anatomske krune (karijes/plomba/kanal),
 *                       kao i kvadrat. NIJE isto što i strukturna 'kruna'-nadoknada.
 *  - 'koren' (zona)   → endodontsko stanje korena (kanal, za_vadjenje).
 *  - 5 zona kvadrata  → površinska stanja.
 */
export function isValidToothRecord(
  surface: DbToothSurface,
  condition: ToothCondition
): boolean {
  if (surface === "ceo_zub") return _STRUCT_SET.has(condition);
  if (surface === "koren") return _ROOT_SET.has(condition);
  if (surface === "kruna") return _SURFACE_SET.has(condition);
  if (_ZONE_SET.has(surface)) return _SURFACE_SET.has(condition);
  return false;
}

interface ToothConditionConfig {
  label: string;
  // Boja površine; 'zdrav' koristi token zuba (tema-svesno), ostalo hex.
  color: string;
}

// Jedan izvor istine: boja + labela po stanju. Dele ga Tooth (bojenje površina)
// i legenda.
export const TOOTH_CONDITION_CONFIG: Record<ToothCondition, ToothConditionConfig> =
  {
    zdrav: { label: "Zdrav", color: "var(--venus-tooth)" },
    karijes: { label: "Karijes", color: "#d65a4e" },
    plomba: { label: "Ispun / plomba", color: "#3a3a3e" },
    kanal: { label: "Kanal korena", color: "#c9a24b" },
    kruna: { label: "Kruna", color: "#7f9ea0" },
    most: { label: "Most", color: "#a07f9e" },
    implant: { label: "Implant", color: "#8a8f98" },
    izvadjen: { label: "Izvađen", color: "#5a5450" },
    za_vadjenje: { label: "Za vađenje", color: "#c98a5e" },
  };
