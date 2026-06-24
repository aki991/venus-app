"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireStaffAction } from "@/lib/admin/guard";
import {
  SURFACE_CONDITIONS,
  STRUCTURAL_CONDITIONS,
  TOOTH_SURFACES,
  type ToothCondition,
  type DbToothSurface,
} from "@/lib/constants/toothConditions";
import type { ToothRecordDraft } from "@/lib/odontogram/toothMap";
import type { ActionResult } from "@/lib/admin/types";

const SURFACE_SET = new Set<string>(SURFACE_CONDITIONS);
const STRUCT_SET = new Set<string>(STRUCTURAL_CONDITIONS);
const ZONE_SET = new Set<string>(TOOTH_SURFACES); // 5 zona (bez 'ceo_zub')

/**
 * Postavi stanje zuba/površine (auto-save). Validira pravilo:
 *  - STRUKTURNA stanja (kruna/most/implant/izvadjen/za_vadjenje) → surface
 *    'ceo_zub'. Prvo BRIŠEMO sve površinske zapise tog zuba (izvađen zub nema
 *    površinski karijes), pa upsert ceo_zub red.
 *  - POVRŠINSKA stanja (karijes/plomba/kanal) → konkretna zona (jedna od 5).
 *    Upsert te zone; usput uklanjamo eventualni strukturni (ceo_zub) zapis
 *    (zub više nije izvađen/krunisan ako mu beležimo površinu).
 */
export async function setToothSurfaceAction(
  patientId: string,
  toothNumber: number,
  surface: DbToothSurface,
  condition: ToothCondition
): Promise<ActionResult> {
  try {
    const user = await requireStaffAction();
    const supabase = await createClient();
    const now = new Date().toISOString();

    if (STRUCT_SET.has(condition)) {
      // Strukturno → uvek na ceo zub; očisti površinske zapise tog zuba.
      const del = await supabase
        .from("tooth_records")
        .delete()
        .eq("patient_id", patientId)
        .eq("tooth_number", toothNumber);
      if (del.error) return { error: del.error.message };

      const up = await supabase.from("tooth_records").upsert(
        {
          patient_id: patientId,
          tooth_number: toothNumber,
          surface: "ceo_zub",
          condition,
          recorded_by: user.id,
          recorded_at: now,
        },
        { onConflict: "patient_id,tooth_number,surface" }
      );
      if (up.error) return { error: up.error.message };
    } else if (SURFACE_SET.has(condition)) {
      // Površinsko → mora konkretna zona, ne 'ceo_zub'.
      if (!ZONE_SET.has(surface)) {
        return { error: "Površinsko stanje zahteva konkretnu zonu zuba" };
      }
      // Ako je zub bio strukturno označen, ukloni taj zapis (kontradiktorno).
      const delWhole = await supabase
        .from("tooth_records")
        .delete()
        .eq("patient_id", patientId)
        .eq("tooth_number", toothNumber)
        .eq("surface", "ceo_zub");
      if (delWhole.error) return { error: delWhole.error.message };

      const up = await supabase.from("tooth_records").upsert(
        {
          patient_id: patientId,
          tooth_number: toothNumber,
          surface,
          condition,
          recorded_by: user.id,
          recorded_at: now,
        },
        { onConflict: "patient_id,tooth_number,surface" }
      );
      if (up.error) return { error: up.error.message };
    } else {
      // 'zdrav' ide kroz removeToothConditionAction, ne ovde.
      return { error: "Nepoznato ili nedozvoljeno stanje" };
    }

    revalidatePath(`/pacijenti/${patientId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/**
 * Batch upis skice na (obično novog) pacijenta. Validira svaki zapis (površina
 * vs ceo_zub) i upiše sve odjednom (upsert). Koristi /odontogram „Dodaj" tok:
 * gost skica → tooth_records novog pacijenta.
 */
export async function saveToothRecordsBatchAction(
  patientId: string,
  records: ToothRecordDraft[]
): Promise<ActionResult> {
  try {
    const user = await requireStaffAction();
    if (records.length === 0) return { success: true }; // prazna skica → OK

    for (const r of records) {
      if (STRUCT_SET.has(r.condition)) {
        if (r.surface !== "ceo_zub") {
          return {
            error: `Strukturno stanje mora na ceo zub (zub ${r.tooth_number})`,
          };
        }
      } else if (SURFACE_SET.has(r.condition)) {
        if (!ZONE_SET.has(r.surface)) {
          return {
            error: `Površinsko stanje zahteva zonu (zub ${r.tooth_number})`,
          };
        }
      } else {
        return { error: "Nedozvoljeno stanje u skici" };
      }
    }

    const supabase = await createClient();
    const now = new Date().toISOString();
    const rows = records.map((r) => ({
      patient_id: patientId,
      tooth_number: r.tooth_number,
      surface: r.surface,
      condition: r.condition,
      recorded_by: user.id,
      recorded_at: now,
    }));

    const { error } = await supabase
      .from("tooth_records")
      .upsert(rows, { onConflict: "patient_id,tooth_number,surface" });
    if (error) return { error: error.message };

    revalidatePath(`/pacijenti/${patientId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/**
 * "Zdrav / obriši". Ako je surface 'ceo_zub' → reset CELOG zuba (briše sve
 * njegove zapise). Inače → briše samo tu zonu.
 */
export async function removeToothConditionAction(
  patientId: string,
  toothNumber: number,
  surface: DbToothSurface
): Promise<ActionResult> {
  try {
    await requireStaffAction();
    const supabase = await createClient();

    let query = supabase
      .from("tooth_records")
      .delete()
      .eq("patient_id", patientId)
      .eq("tooth_number", toothNumber);

    // Reset zone: precizno tu zonu. Reset celog zuba ('ceo_zub'): sve zapise.
    if (surface !== "ceo_zub") {
      query = query.eq("surface", surface);
    }

    const { error } = await query;
    if (error) return { error: error.message };

    revalidatePath(`/pacijenti/${patientId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}
