import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type {
  ToothCondition,
  ToothSurface,
  DbToothSurface,
} from "@/lib/constants/toothConditions";

export interface ToothRecord {
  id: string;
  tooth_number: number;
  surface: DbToothSurface;
  condition: ToothCondition;
  note: string | null;
}

// Stanje jednog zuba za render: površinska stanja po zoni + (opciono) strukturno
// stanje celog zuba.
export interface ToothState {
  surfaces: Partial<Record<ToothSurface, ToothCondition>>;
  wholeTooth: ToothCondition | null;
}

export type ToothMap = Record<number, ToothState>;

/**
 * Svi tooth_records pacijenta → mapa po tooth_number pogodna za render.
 * Browser klijent (RLS staff_full_tooth_records); troši ga useToothRecords hook.
 */
export async function fetchToothRecords(patientId: string): Promise<ToothMap> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("tooth_records")
    .select("id, tooth_number, surface, condition, note")
    .eq("patient_id", patientId);

  if (error) throw error;

  const map: ToothMap = {};
  for (const r of (data as unknown as ToothRecord[]) ?? []) {
    const entry = map[r.tooth_number] ?? { surfaces: {}, wholeTooth: null };
    if (r.surface === "ceo_zub") {
      entry.wholeTooth = r.condition;
    } else {
      entry.surfaces[r.surface as ToothSurface] = r.condition;
    }
    map[r.tooth_number] = entry;
  }
  return map;
}
