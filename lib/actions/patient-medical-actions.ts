"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireStaffAction } from "@/lib/admin/guard";
import {
  patientMedicalSchema,
  type PatientMedicalInput,
} from "@/lib/validations/patientMedical";
import type { ActionResult } from "@/lib/admin/types";

/**
 * Upsert medicinskog kartona (staff-only). LAZY CREATE: red u patient_medical
 * ne postoji dok se karton prvi put ne sačuva — ON CONFLICT (patient_id) tada
 * pravi INSERT, a svaki naredni poziv radi UPDATE istog reda. updated_at održava
 * trigger (patient_medical_updated_at); updated_by upisujemo na trenutnog usera.
 */
export async function upsertPatientMedicalAction(
  patientId: string,
  input: PatientMedicalInput
): Promise<ActionResult> {
  try {
    const user = await requireStaffAction();

    const parsed = patientMedicalSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci" };
    }
    const data = parsed.data;

    const supabase = await createClient();
    const { error } = await supabase.from("patient_medical").upsert(
      {
        patient_id: patientId,
        allergies: data.allergies,
        chronic_conditions: data.chronic_conditions,
        medications: data.medications,
        critical_warnings: data.critical_warnings,
        anamnesis: data.anamnesis,
        notes: data.notes,
        smoker: data.smoker,
        pregnant: data.pregnant,
        updated_by: user.id,
      },
      { onConflict: "patient_id" }
    );
    if (error) return { error: error.message };

    revalidatePath(`/pacijenti/${patientId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}
