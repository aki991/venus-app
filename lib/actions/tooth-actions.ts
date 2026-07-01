"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireStaffAction } from "@/lib/admin/guard";
import { createAutoProcedureAction } from "@/lib/actions/tooth-procedure-actions";
import {
  isValidToothRecord,
  type ToothCondition,
  type DbToothSurface,
} from "@/lib/constants/toothConditions";
import type { ToothRecordDraft } from "@/lib/odontogram/toothMap";
import type { ActionResult } from "@/lib/admin/types";

/**
 * Postavi stanje zuba/zone (auto-save). Rutiranje vodi SURFACE (ne condition),
 * preko isValidToothRecord — tako se razlikuje 'kruna' kao NADOKNADA (strukturno,
 * surface='ceo_zub') od 'kruna' kao ANATOMSKE ZONE (surface='kruna'):
 *  - surface 'ceo_zub' → strukturno stanje. Prvo BRIŠEMO sve zapise tog zuba
 *    (izvađen/krunisan zub nema zasebne zone), pa upsert ceo_zub red.
 *  - surface zona ('kruna'/'koren'/5 kvadrat) → upsert te zone; usput uklanjamo
 *    eventualni strukturni (ceo_zub) zapis (kontradiktoran sa zonom).
 */
export async function setToothSurfaceAction(
  patientId: string,
  toothNumber: number,
  surface: DbToothSurface,
  condition: ToothCondition
): Promise<ActionResult> {
  try {
    const user = await requireStaffAction();

    // 'zdrav' ide kroz removeToothConditionAction, ne ovde.
    if (!isValidToothRecord(surface, condition)) {
      return { error: "Nepoznato ili nedozvoljeno stanje za ovu zonu" };
    }

    const supabase = await createClient();
    const now = new Date().toISOString();

    if (surface === "ceo_zub") {
      // Strukturno → na ceo zub; očisti SVE zone tog zuba (kruna/koren/kvadrat).
      const del = await supabase
        .from("tooth_records")
        .delete()
        .eq("patient_id", patientId)
        .eq("tooth_number", toothNumber);
      if (del.error) return { error: del.error.message };
    } else {
      // Zonsko stanje → ukloni eventualni strukturni (ceo_zub) zapis.
      const delWhole = await supabase
        .from("tooth_records")
        .delete()
        .eq("patient_id", patientId)
        .eq("tooth_number", toothNumber)
        .eq("surface", "ceo_zub");
      if (delWhole.error) return { error: delWhole.error.message };
    }

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

    // Auto-protokol (BONUS): klinički relevantno stanje → red u tooth_procedures.
    // Sme da padne bez posledica — stanje je već sačuvano gore. Gost mod ovuda
    // ne prolazi (setToothSurfaceAction se zove samo za pravog pacijenta), a i
    // sama akcija tiho preskoči prazan patientId / 'zdrav'.
    try {
      await createAutoProcedureAction(patientId, toothNumber, condition, user.id);
    } catch {
      // ignore — čuvanje stanja mora da uspe svejedno
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
      if (!isValidToothRecord(r.surface, r.condition)) {
        return {
          error: `Nedozvoljeno stanje u skici (zub ${r.tooth_number})`,
        };
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
