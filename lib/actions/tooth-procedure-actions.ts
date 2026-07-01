"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireStaffAction } from "@/lib/admin/guard";
import {
  toothProcedureSchema,
  type ToothProcedureInput,
} from "@/lib/validations/toothProcedure";
import {
  TOOTH_CONDITION_CONFIG,
  type ToothCondition,
} from "@/lib/constants/toothConditions";
import type { ActionResult } from "@/lib/admin/types";

// ── Mapiranje stanja iz odontograma → dijagnoza ILI terapija ─────────────────
// DIJAGNOZA: karijes, za_vadjenje. TERAPIJA: plomba, kanal, kruna, most,
// implant, izvadjen. 'zdrav' (i sve van setova) → null: NE pravi protokol red.
const AUTO_DIAGNOSIS = new Set<ToothCondition>(["karijes", "za_vadjenje"]);
const AUTO_THERAPY = new Set<ToothCondition>([
  "plomba",
  "kanal",
  "kruna",
  "most",
  "implant",
  "izvadjen",
]);

function mapConditionToProcedure(
  condition: ToothCondition
): { diagnosis: string | null; therapy: string | null } | null {
  const label = TOOTH_CONDITION_CONFIG[condition]?.label ?? condition;
  if (AUTO_DIAGNOSIS.has(condition)) return { diagnosis: label, therapy: null };
  if (AUTO_THERAPY.has(condition)) return { diagnosis: null, therapy: label };
  return null; // zdrav / reset / nerelevantno
}

// ── Ručne akcije (protokol tabela u kartonu) ─────────────────────────────────

export async function createProcedureAction(
  patientId: string,
  input: ToothProcedureInput
): Promise<ActionResult> {
  try {
    const user = await requireStaffAction();

    const parsed = toothProcedureSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci" };
    }
    const d = parsed.data;

    const supabase = await createClient();
    const { error } = await supabase.from("tooth_procedures").insert({
      patient_id: patientId,
      tooth_number: d.tooth_number,
      performed_on: d.performed_on,
      diagnosis: d.diagnosis,
      therapy: d.therapy,
      doctor_id: d.doctor_id,
      note: d.note,
      source: "manual",
      created_by: user.id,
    });
    if (error) return { error: error.message };

    revalidatePath(`/pacijenti/${patientId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

export async function updateProcedureAction(
  id: string,
  input: ToothProcedureInput
): Promise<ActionResult> {
  try {
    await requireStaffAction();

    const parsed = toothProcedureSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci" };
    }
    const d = parsed.data;

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("tooth_procedures")
      .update({
        tooth_number: d.tooth_number,
        performed_on: d.performed_on,
        diagnosis: d.diagnosis,
        therapy: d.therapy,
        doctor_id: d.doctor_id,
        note: d.note,
      })
      .eq("id", id)
      .select("patient_id")
      .single();
    if (error) return { error: error.message };

    if (row?.patient_id) revalidatePath(`/pacijenti/${row.patient_id}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

export async function deleteProcedureAction(id: string): Promise<ActionResult> {
  try {
    await requireStaffAction();

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("tooth_procedures")
      .delete()
      .eq("id", id)
      .select("patient_id")
      .single();
    if (error) return { error: error.message };

    if (row?.patient_id) revalidatePath(`/pacijenti/${row.patient_id}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

// ── Auto-upis iz odontograma ─────────────────────────────────────────────────
/**
 * Auto-protokol iz odontograma (source='auto'). Zove se POSLE uspešnog čuvanja
 * stanja u tooth_records. „Bonus" je — NIKAD ne baca: na svaku grešku vrati
 * { error } (bez throw), da glavno čuvanje stanja ostane netaknuto. Tiho
 * preskače kad: nema pacijenta (gost mod) ili stanje nije klinički relevantno
 * (npr. 'zdrav'). performed_on ostaje na DB default (CURRENT_DATE = danas).
 */
export async function createAutoProcedureAction(
  patientId: string,
  toothNumber: number,
  condition: ToothCondition,
  doctorId: string | null
): Promise<ActionResult> {
  try {
    if (!patientId) return { success: true }; // gost mod → bez auto-upisa

    const mapped = mapConditionToProcedure(condition);
    if (!mapped) return { success: true }; // zdrav/reset/nerelevantno → bez reda

    const user = await requireStaffAction();
    const supabase = await createClient();
    const { error } = await supabase.from("tooth_procedures").insert({
      patient_id: patientId,
      tooth_number: toothNumber,
      diagnosis: mapped.diagnosis,
      therapy: mapped.therapy,
      doctor_id: doctorId,
      source: "auto",
      created_by: user.id,
    });
    if (error) return { error: error.message };

    // Bez revalidatePath ovde — poziva se usred setToothSurfaceAction (koji već
    // revalidira karton); protokol tabelu osvežava klijent (invalidacija keša).
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}
