"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import type { ActionResult } from "@/lib/admin/types";

/** Dodaj stolicu (RLS admin_manage_chairs dozvoljava INSERT adminu). */
export async function createChairAction(name: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const trimmed = name.trim();
    if (!trimmed) return { error: "Unesite naziv stolice" };

    const supabase = await createClient();

    // Sledeći display_order = max + 1
    const { data: last } = await supabase
      .from("chairs")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (last?.display_order ?? -1) + 1;

    const { error } = await supabase
      .from("chairs")
      .insert({ name: trimmed, display_order: nextOrder });
    if (error) return { error: error.message };

    revalidatePath("/podesavanja");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

export async function updateChairAction(
  id: string,
  name: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const trimmed = name.trim();
    if (!trimmed) return { error: "Unesite naziv stolice" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("chairs")
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/podesavanja");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

export async function setChairActiveAction(
  id: string,
  active: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("chairs")
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/podesavanja");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/**
 * Pravi delete. Blokira SAMO ako stolica ima AKTIVNE termine: budući (kraj još
 * nije prošao) i neotkazani (pending/confirmed). Prošli i otkazani ne smetaju.
 *
 * FK appointments.chair_id je ON DELETE RESTRICT, pa bi i prošli/otkazani termini
 * koji referenciraju stolicu blokirali DELETE na nivou baze. Zato ih prvo
 * odvezujemo (chair_id = NULL) — ostaju u istoriji bez stolice — pa tek onda
 * brišemo stolicu.
 */
export async function deleteChairAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { count, error: countErr } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("chair_id", id)
      .in("status", ["pending", "confirmed"])
      .gte("ends_at", new Date().toISOString());
    if (countErr) return { error: countErr.message };
    if ((count ?? 0) > 0) {
      return {
        error:
          "Stolica ima aktivne (buduće) termine, deaktivirajte je umesto brisanja",
      };
    }

    // Odveži preostale (prošle/otkazane) termine sa ove stolice da RESTRICT ne
    // blokira brisanje.
    const { error: detachErr } = await supabase
      .from("appointments")
      .update({ chair_id: null, updated_at: new Date().toISOString() })
      .eq("chair_id", id);
    if (detachErr) return { error: detachErr.message };

    const { error } = await supabase.from("chairs").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/podesavanja");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}
