"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaffAction } from "@/lib/admin/guard";
import type { ActionResult } from "@/lib/admin/types";

interface PatientInput {
  firstName: string;
  lastName: string;
  phone: string;
  note: string;
}

/**
 * Update profila uz `note`, sa fallback-om ako `note` kolona još ne postoji
 * (migracija 20250108 nije pokrenuta) — tada se ime/prezime/telefon ipak sačuvaju,
 * a napomena se tiho preskoči.
 */
async function updateProfileFields(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  input: PatientInput
) {
  const baseFields = {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    phone: input.phone.trim() || null,
    updated_at: new Date().toISOString(),
  };

  let { error } = await admin
    .from("profiles")
    .update({ ...baseFields, note: input.note.trim() || null })
    .eq("id", id);
  if (error?.code === "42703") {
    ({ error } = await admin.from("profiles").update(baseFields).eq("id", id));
  }
  return error;
}

/**
 * Dodaj pacijenta. Pacijent je profiles red (role='patient'); profiles.id zahteva
 * auth.users red, pa (kao doktori, OPCIJA C) service-role pravi auth nalog sa
 * sintetičkim emailom (bez login-a), handle_new_user trigger napravi profil
 * role='patient', a mi dopunimo ime/prezime/telefon/napomenu.
 */
export async function createPatientAction(
  input: PatientInput
): Promise<ActionResult> {
  try {
    await requireStaffAction();
    if (!input.firstName.trim() || !input.lastName.trim()) {
      return { error: "Unesite ime i prezime" };
    }

    const admin = createAdminClient();
    const email = `pacijent-${crypto.randomUUID()}@venus.local`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser(
      {
        email,
        email_confirm: false,
        user_metadata: {
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
        },
      }
    );
    if (createErr || !created.user) {
      return { error: createErr?.message ?? "Greška pri kreiranju pacijenta" };
    }

    const updErr = await updateProfileFields(admin, created.user.id, input);
    if (updErr) {
      await admin.auth.admin.deleteUser(created.user.id); // rollback
      return { error: updErr.message };
    }

    revalidatePath("/pacijenti");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/** Izmena podataka pacijenta (ime/prezime/telefon/napomena). */
export async function updatePatientAction(
  id: string,
  input: PatientInput
): Promise<ActionResult> {
  try {
    await requireStaffAction();
    if (!input.firstName.trim() || !input.lastName.trim()) {
      return { error: "Unesite ime i prezime" };
    }

    const admin = createAdminClient();
    const updErr = await updateProfileFields(admin, id, input);
    if (updErr) return { error: updErr.message };

    revalidatePath("/pacijenti");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/**
 * Brisanje pacijenta. FK appointments.patient_id je ON DELETE CASCADE, pa brisanje
 * pacijenta briše i SVE njegove termine. Zato blokiramo ako ima AKTIVNE (buduće,
 * neotkazane) termine — prvo ih treba otkazati. Prošli/otkazani se brišu zajedno
 * sa pacijentom (UI to jasno upozorava).
 */
export async function deletePatientAction(id: string): Promise<ActionResult> {
  try {
    await requireStaffAction();

    const supabase = await createClient();
    const { count, error: countErr } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", id)
      .in("status", ["pending", "confirmed"])
      .gte("ends_at", new Date().toISOString());
    if (countErr) return { error: countErr.message };
    if ((count ?? 0) > 0) {
      return {
        error:
          "Pacijent ima zakazane (buduće) termine — prvo ih otkažite, pa obrišite pacijenta",
      };
    }

    // deleteUser → CASCADE briše profiles red (i prošle/otkazane termine).
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return { error: error.message };

    revalidatePath("/pacijenti");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}
