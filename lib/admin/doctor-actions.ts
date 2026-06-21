"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import type {
  ActionResult,
  CreateDoctorInput,
  UpdateDoctorInput,
} from "@/lib/admin/types";

/**
 * Kreira doktora po modelu OPCIJA C:
 *  1) admin check
 *  2) auth user (service-role) — handle_new_user trigger pravi profil role=patient
 *  3) admin_upsert_doctor RPC preko COOKIE klijenta (auth.uid() = admin!) →
 *     postavlja doktor-polja + role=staff
 *  4) opciono inviteUserByEmail (ako ima pravi email i traženo)
 */
export async function createDoctorAction(
  input: CreateDoctorInput
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const email = input.noEmail
      ? `nologin-${crypto.randomUUID()}@venus.local`
      : input.email.trim();
    if (!email) {
      return { error: "Unesite email ili označite da doktor nema email" };
    }

    const admin = createAdminClient();

    // 2) Kreiraj auth nalog (mirno — email_confirm:false, bez pozivnice).
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({ email, email_confirm: false });
    if (createErr || !created.user) {
      return { error: createErr?.message ?? "Greška pri kreiranju naloga" };
    }
    const newId = created.user.id;

    // 3) Doktor-polja + role=staff preko COOKIE klijenta (RPC čita auth.uid()
    //    koji MORA biti admin, ne novi doktor → zato NE admin klijent).
    const supabase = await createClient();
    const { error: rpcErr } = await supabase.rpc("admin_upsert_doctor", {
      p_id: newId,
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_initials: input.initials,
      p_color_hex: input.colorHex,
      p_specialty: input.specialty,
      p_phone: input.phone,
    });
    if (rpcErr) {
      // Rollback: ne ostavljamo "patient" siroče-nalog ako upsert padne.
      await admin.auth.admin.deleteUser(newId);
      return { error: rpcErr.message };
    }

    // 4) Pozivnica — samo ako ima pravi email i admin je tako tražio.
    if (input.sendInvite && !input.noEmail) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
      const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
        email,
        { redirectTo: `${siteUrl}/reset-password` }
      );
      if (inviteErr) {
        return {
          error: `Doktor je kreiran, ali pozivnica nije poslata: ${inviteErr.message}`,
        };
      }
    }

    revalidatePath("/podesavanja");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/** "Aktiviraj login kasnije" — pošalji pozivnicu postojećem doktoru. */
export async function inviteDoctorAction(
  profileId: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const { data, error } = await admin.auth.admin.getUserById(profileId);
    if (error || !data.user) return { error: "Korisnik nije pronađen" };

    const email = data.user.email;
    if (!email || email.endsWith("@venus.local")) {
      return {
        error:
          "Doktor nema pravi email — pozivnica nije moguća za sintetički nalog",
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: `${siteUrl}/reset-password` }
    );
    if (inviteErr) return { error: inviteErr.message };

    revalidatePath("/podesavanja");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/** Izmena doktor-polja (email se NE menja). */
export async function updateDoctorAction(
  profileId: string,
  input: UpdateDoctorInput
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_upsert_doctor", {
      p_id: profileId,
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_initials: input.initials,
      p_color_hex: input.colorHex,
      p_specialty: input.specialty,
      p_phone: input.phone,
    });
    if (error) return { error: error.message };

    revalidatePath("/podesavanja");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/**
 * Reorder doktora preko admin_reorder_doctors(items jsonb) RPC.
 * orderedIds = NOVI redosled (ceo spisak), pa display_order = index.
 * RPC interno proverava admina (auth.uid() → COOKIE klijent).
 */
export async function reorderDoctorsAction(
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const items = orderedIds.map((id, index) => ({
      id,
      display_order: index,
    }));

    const { error } = await supabase.rpc("admin_reorder_doctors", { items });
    if (error) return { error: error.message };

    revalidatePath("/podesavanja");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/** Deaktivacija / reaktivacija (soft delete). */
export async function setDoctorActiveAction(
  profileId: string,
  active: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_set_doctor_active", {
      p_id: profileId,
      p_active: active,
    });
    if (error) return { error: error.message };

    revalidatePath("/podesavanja");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/** Pravi delete — dozvoljen SAMO ako doktor nema nijedan termin. */
export async function deleteDoctorAction(
  profileId: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // Blokira brisanje SAMO ako doktor ima AKTIVNE termine: budući (kraj još
    // nije prošao) i neotkazani (pending/confirmed). Prošli i otkazani termini
    // ne smetaju — oni postaju "bez doktora" (appointments.doctor_id ON DELETE
    // SET NULL) i ostaju u istoriji.
    const { count, error: countErr } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("doctor_id", profileId)
      .in("status", ["pending", "confirmed"])
      .gte("ends_at", new Date().toISOString());
    if (countErr) return { error: countErr.message };
    if ((count ?? 0) > 0) {
      return {
        error:
          "Doktor ima aktivne (buduće) termine, deaktivirajte ga umesto brisanja",
      };
    }

    // deleteUser → CASCADE briše i profiles zapis (profiles_id_fkey ON DELETE CASCADE)
    const admin = createAdminClient();
    const { error: delErr } = await admin.auth.admin.deleteUser(profileId);
    if (delErr) return { error: delErr.message };

    revalidatePath("/podesavanja");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}
