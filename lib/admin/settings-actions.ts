"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import type { ActionResult } from "@/lib/admin/types";

/**
 * Postavi/promeni doktora kog AI agent (n8n) koristi za zakazivanje.
 * Upsert reda app_settings(key='ai_default_doctor_id'). Admin-gated.
 */
export async function setAiDefaultDoctorAction(
  doctorId: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!doctorId) return { error: "Izaberite doktora" };

    const supabase = await createClient();
    const { error } = await supabase.from("app_settings").upsert(
      {
        key: "ai_default_doctor_id",
        value: doctorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
    if (error) return { error: error.message };

    revalidatePath("/podesavanja");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}
