"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin/guard";
import { patientSchema, type PatientFormInput } from "@/lib/validations/patient";
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
 * Kreira pacijenta. Sme svaki staff (requireStaff). Ako card_number nije zadat,
 * auto-generiše se preko next_card_number(). next_card_number nije atomičan, pa
 * na duplikat (UNIQUE 23505) jednom retry-ujemo sa svežim brojem.
 */
export async function createPatientAction(
  input: PatientFormInput
): Promise<CreatePatientResult> {
  try {
    const user = await requireStaff();

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
          notes: null, // opšte napomene se uređuju u kartonu (D1+), ne ovde
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

    revalidatePath("/dnevnik");
    return { success: true, patientId: row.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}

/** Izmena ličnih podataka pacijenta. Sme svaki staff. */
export async function updatePatientAction(
  id: string,
  input: PatientFormInput
): Promise<ActionResult> {
  try {
    await requireStaff();

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
    };
    // Broj kartona je trajni identifikator — ne sme da se obriše kroz izmenu.
    // Diramo ga samo ako je u input-u zadata nova ne-prazna vrednost.
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

    revalidatePath("/dnevnik");
    revalidatePath(`/dnevnik/${id}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška" };
  }
}
