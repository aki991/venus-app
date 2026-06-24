// Anatomija zuba — deljeni helperi za okluzalni kvadrat (Tooth) i anatomski
// prikaz krune+korena (ToothAnatomy). Jedan izvor za širine → poklapanje.

export const TOOTH_WIDE = 40; // molari (6,7,8)
export const TOOTH_MEDIUM = 32; // premolari (4,5)
export const TOOTH_NARROW = 26; // očnjak + sekutići (1,2,3)

/** Širina zuba po poslednjoj cifri FDI broja (molari najširi, sekutići najuži). */
export function toothWidth(toothNumber: number): number {
  const d = toothNumber % 10;
  return d >= 6 ? TOOTH_WIDE : d >= 4 ? TOOTH_MEDIUM : TOOTH_NARROW;
}

export type CrownType = "incisor" | "canine" | "premolar" | "molar";

/** Tip krune po poslednjoj cifri: sekutić / očnjak / premolar / molar. */
export function getCrownType(toothNumber: number): CrownType {
  const d = toothNumber % 10;
  if (d <= 2) return "incisor";
  if (d === 3) return "canine";
  if (d <= 5) return "premolar";
  return "molar";
}

/**
 * Broj korena po FDI:
 *  - 1,2,3,4,5 (sekutići, očnjak, premolari): 1 koren
 *  - 6,7,8 (molari): GORNJI (1x,2x) 3, DONJI (3x,4x) 2
 * Kvadrant: prva cifra 1,2 = gornja vilica; 3,4 = donja.
 */
export function getRootCount(toothNumber: number): number {
  const quadrant = Math.floor(toothNumber / 10);
  const upper = quadrant === 1 || quadrant === 2;
  const d = toothNumber % 10;
  if (d <= 5) return 1; // sekutići, očnjak, premolari (uklj. 14/24)
  return upper ? 3 : 2; // molari 6,7,8
}
