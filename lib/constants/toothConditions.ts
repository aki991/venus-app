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
