"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import type { ActionResult, ServiceInput } from "@/lib/admin/types";

/**
 * Dodaj uslugu. display_order = max + 1 (na kraj liste).
 * requireAdmin() na početku; upis ide preko COOKIE klijenta (RLS services_modify
 * dozvoljava staff, ali mi gejtujemo na admina u ovoj akciji).
 */
export async function createServiceAction(
  input: ServiceInput
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: last } = await supabase
      .from("services")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (last?.display_order ?? -1) + 1;

    const { error } = await supabase.from("services").insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category.trim(),
      duration_minutes: input.durationMinutes,
      price: input.price,
      display_order: nextOrder,
    });
    if (error) return { error: error.message };

    revalidatePath("/usluge");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/** Izmena postojeće usluge. */
export async function updateServiceAction(
  id: string,
  input: ServiceInput
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("services")
      .update({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        category: input.category.trim(),
        duration_minutes: input.durationMinutes,
        price: input.price,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/usluge");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/** Deaktivacija / reaktivacija usluge (soft delete). */
export async function setServiceActiveAction(
  id: string,
  active: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("services")
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/usluge");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/**
 * Pravi delete preko delete_service(service_uuid uuid) RPC. RPC interno:
 *  - proverava da je pozivalac admin (auth.uid() → zato COOKIE klijent),
 *  - odbija ako usluga ima BUDUĆE 'confirmed' termine,
 *  - inače NULL-uje service_id na terminima i briše uslugu.
 * Grešku iz RPC-a prosleđujemo korisniku.
 */
export async function deleteServiceAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase.rpc("delete_service", {
      service_uuid: id,
    });
    if (error) return { error: error.message };

    revalidatePath("/usluge");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/**
 * Reorder preko reorder_services(items jsonb) RPC. items = [{id, display_order}].
 * orderedIds je NOVI globalni redosled (ceo spisak), pa display_order = index.
 * RPC interno proverava admina (auth.uid() → COOKIE klijent).
 */
export async function reorderServicesAction(
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const items = orderedIds.map((id, index) => ({
      id,
      display_order: index,
    }));

    const { error } = await supabase.rpc("reorder_services", { items });
    if (error) return { error: error.message };

    revalidatePath("/usluge");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}
