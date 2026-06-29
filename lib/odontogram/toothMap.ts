import type { ToothMap } from "@/lib/db/toothRecords";
import type {
  ToothCondition,
  ToothZone,
  DbToothSurface,
} from "@/lib/constants/toothConditions";

// Čiste transformacije ToothMap-e. Dele ih:
//  - optimistic update u useToothRecords (pravi pacijent, baza)
//  - lokalni "gost" mod na /odontogram (skica, bez baze)
// → gost i pravi pacijent se ponašaju IDENTIČNO.

export function applySetCondition(
  map: ToothMap,
  toothNumber: number,
  surface: DbToothSurface,
  condition: ToothCondition
): ToothMap {
  const next: ToothMap = { ...map };
  const cur = next[toothNumber] ?? { surfaces: {}, wholeTooth: null };
  if (surface === "ceo_zub") {
    // Strukturno stanje gazi sve površine.
    next[toothNumber] = { surfaces: {}, wholeTooth: condition };
  } else {
    next[toothNumber] = {
      surfaces: { ...cur.surfaces, [surface]: condition },
      wholeTooth: null,
    };
  }
  return next;
}

// Jedan zapis za batch upis (prenos gost skice na novog pacijenta).
export interface ToothRecordDraft {
  tooth_number: number;
  surface: DbToothSurface;
  condition: ToothCondition;
}

/** ToothMap → ravna lista zapisa za batch upis (preskače 'zdrav'/prazno). */
export function toothMapToRecords(map: ToothMap): ToothRecordDraft[] {
  const out: ToothRecordDraft[] = [];
  for (const [numStr, state] of Object.entries(map)) {
    const tooth_number = Number(numStr);
    if (state.wholeTooth) {
      out.push({ tooth_number, surface: "ceo_zub", condition: state.wholeTooth });
    } else {
      for (const [surface, condition] of Object.entries(state.surfaces)) {
        if (condition) {
          out.push({
            tooth_number,
            surface: surface as DbToothSurface,
            condition,
          });
        }
      }
    }
  }
  return out;
}

export function applyRemoveCondition(
  map: ToothMap,
  toothNumber: number,
  surface: DbToothSurface
): ToothMap {
  const next: ToothMap = { ...map };
  const cur = next[toothNumber];
  if (!cur) return next;
  if (surface === "ceo_zub") {
    delete next[toothNumber]; // reset celog zuba
  } else {
    const surfaces = { ...cur.surfaces };
    delete surfaces[surface as ToothZone];
    next[toothNumber] = { surfaces, wholeTooth: cur.wholeTooth };
  }
  return next;
}
