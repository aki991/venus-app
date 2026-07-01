"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireStaffAction } from "@/lib/admin/guard";
import {
  minimalPatientInput,
  patientSchema,
  type PatientFormInput,
} from "@/lib/validations/patient";
import type { ActionResult } from "@/lib/admin/types";

export type CreatePatientResult =
  | { success: true; patientId: string }
  | { error: string };

// Postgres unique_violation (npr. duplikat card_number)
const UNIQUE_VIOLATION = "23505";

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

/** Sledeći slobodan broj kartona iz baze (next_card_number RPC). */
async function nextCardNumber(supabase: SupabaseLike): Promise<string> {
  const { data, error } = await supabase.rpc("next_card_number");
  if (error) throw new Error(error.message);
  return String(data);
}

/**
 * Dodaj pacijenta — INSERT u `patients` registar (NEMA više sintetičkog auth
 * naloga; pacijent je samo red u patients). card_number se auto-generiše preko
 * next_card_number() ako je prazan; na duplikat (23505) jednom retry-ujemo.
 */
export async function createPatientAction(
  input: PatientFormInput
): Promise<CreatePatientResult> {
  try {
    const user = await requireStaffAction();

    const parsed = patientSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci" };
    }
    const data = parsed.data;

    const supabase = await createClient();
    const manualCard = data.card_number !== null;

    async function attemptInsert(cardNumber: string) {
      return supabase
        .from("patients")
        .insert({
          card_number: cardNumber,
          first_name: data.first_name,
          last_name: data.last_name,
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          occupation: data.occupation,
          location: data.location,
          status: data.status,
          notes: data.notes,
          created_by: user.id,
        })
        .select("id")
        .single();
    }

    let cardNumber = data.card_number ?? (await nextCardNumber(supabase));
    let { data: row, error } = await attemptInsert(cardNumber);

    // Duplikat broja kartona: ako je bio auto-generisan, probaj još jednom sa
    // svežim brojem (race u next_card_number). Ručno unet broj → vrati grešku.
    if (error?.code === UNIQUE_VIOLATION) {
      if (manualCard) {
        return { error: `Broj kartona "${cardNumber}" već postoji` };
      }
      cardNumber = await nextCardNumber(supabase);
      ({ data: row, error } = await attemptInsert(cardNumber));
      if (error?.code === UNIQUE_VIOLATION) {
        return { error: "Greška pri dodeli broja kartona, pokušajte ponovo" };
      }
    }

    if (error) return { error: error.message };
    if (!row) return { error: "Pacijent nije kreiran" };

    revalidatePath("/pacijenti");
    return { success: true, patientId: row.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

export type ConvertWalkInResult =
  | { success: true; patientId: string }
  | { error: string };

/**
 * Konvertuje postojeći walk-in termin u pacijenta iz registra:
 *   1. kreira pacijenta (minimalan unos: ime/prezime/telefon)
 *   2. veže termin: patient_record_id = novi pacijent, briše walk_in polja
 * Posle ovoga termin se razrešava preko registra (resolvePatient), a karton
 * pacijenta dobija ovaj termin u istoriji (preko patient_record_id).
 */
export async function convertWalkInToPatientAction(
  appointmentId: string,
  input: { firstName: string; lastName: string; phone: string | null }
): Promise<ConvertWalkInResult> {
  try {
    await requireStaffAction();

    if (!input.firstName.trim() || !input.lastName.trim()) {
      return { error: "Unesite ime i prezime" };
    }

    const created = await createPatientAction(
      minimalPatientInput(input.firstName, input.lastName, input.phone)
    );
    if ("error" in created) return { error: created.error };

    const supabase = await createClient();
    const { error } = await supabase
      .from("appointments")
      .update({
        patient_record_id: created.patientId,
        walk_in_name: null,
        walk_in_phone: null,
      })
      .eq("id", appointmentId);
    if (error) return { error: error.message };

    revalidatePath("/kalendar");
    revalidatePath("/pacijenti");
    return { success: true, patientId: created.patientId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/** Izmena pacijenta. Broj kartona se NE briše kroz izmenu (trajni identifikator). */
export async function updatePatientAction(
  id: string,
  input: PatientFormInput
): Promise<ActionResult> {
  try {
    await requireStaffAction();

    const parsed = patientSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci" };
    }
    const data = parsed.data;

    const supabase = await createClient();

    const patch: Record<string, unknown> = {
      first_name: data.first_name,
      last_name: data.last_name,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      phone: data.phone,
      email: data.email,
      occupation: data.occupation,
      location: data.location,
      status: data.status,
      notes: data.notes,
    };
    // Broj kartona je trajni identifikator — diramo ga samo ako je zadata nova
    // ne-prazna vrednost; prazno polje u izmeni zadržava postojeći broj.
    if (data.card_number !== null) {
      patch.card_number = data.card_number;
    }

    const { error } = await supabase
      .from("patients")
      .update(patch)
      .eq("id", id);

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return { error: `Broj kartona "${data.card_number}" već postoji` };
      }
      return { error: error.message };
    }

    revalidatePath("/pacijenti");
    revalidatePath(`/pacijenti/${id}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/**
 * Brisanje pacijenta iz registra. Blokira ako ima buduće (neotkazane) termine
 * vezane preko patient_record_id — prvo ih otkazati. NE dira profiles ni mobilnu
 * vezu (patient_id). Termini ostaju (patient_record_id je ON DELETE SET NULL).
 */
export async function deletePatientAction(id: string): Promise<ActionResult> {
  try {
    await requireStaffAction();

    const supabase = await createClient();
    const { count, error: countErr } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("patient_record_id", id)
      .in("status", ["pending", "confirmed"])
      .gte("ends_at", new Date().toISOString());
    if (countErr) return { error: countErr.message };
    if ((count ?? 0) > 0) {
      return {
        error:
          "Pacijent ima zakazane (buduće) termine — prvo ih otkažite, pa obrišite pacijenta",
      };
    }

    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/pacijenti");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}
