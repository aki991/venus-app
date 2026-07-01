import { createClient as createBrowserClient } from "@/lib/supabase/client";

export interface AppointmentWithRelations {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  notes: string | null;
  // TRUE dok AI-termin čeka da pacijent preko WhatsApp-a odgovori na predlog
  // novog termina. Doktorska akcija nad statusom (potvrda/otkazivanje) ga čisti.
  awaiting_response: boolean | null;
  doctor_id: string | null;
  patient_id: string | null;
  patient_record_id: string | null;
  chair_id: string | null;
  walk_in_name: string | null;
  walk_in_phone: string | null;
  service: { id: string; name: string; duration_minutes: number } | null;
  chair: { id: string; name: string } | null;
  doctor: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    initials: string | null;
    color_hex: string | null;
  } | null;
  // Legacy mobilni pacijent (profiles preko patient_id)
  patient: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
  // Pacijent iz registra (patients preko patient_record_id) — primarni izvor imena
  patient_record: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    card_number: string | null;
  } | null;
}

/**
 * Razrešava identitet pacijenta na terminu iz 3 izvora, po prioritetu:
 *   1. patient_record (registar, patient_record_id)
 *   2. patient (legacy mobilni nalog, patient_id → profiles)
 *   3. walk-in (walk_in_name / walk_in_phone)
 * `name` je "" kad nema nijednog izvora — pozivalac bira svoj fallback ("—" / "Walk-in").
 */
export interface ResolvedPatient {
  name: string;
  phone: string | null;
  cardNumber: string | null;
  source: "record" | "profile" | "walk_in" | "none";
}

export function resolvePatient(appt: {
  patient_record?: AppointmentWithRelations["patient_record"];
  patient?: AppointmentWithRelations["patient"];
  walk_in_name?: string | null;
  walk_in_phone?: string | null;
}): ResolvedPatient {
  const join = (
    first: string | null,
    last: string | null
  ): string => [first, last].filter(Boolean).join(" ") || "Bez imena";

  if (appt.patient_record) {
    return {
      name: join(appt.patient_record.first_name, appt.patient_record.last_name),
      phone: appt.patient_record.phone,
      cardNumber: appt.patient_record.card_number,
      source: "record",
    };
  }
  if (appt.patient) {
    return {
      name: join(appt.patient.first_name, appt.patient.last_name),
      phone: appt.patient.phone,
      cardNumber: null,
      source: "profile",
    };
  }
  if (appt.walk_in_name) {
    return {
      name: appt.walk_in_name,
      phone: appt.walk_in_phone ?? null,
      cardNumber: null,
      source: "walk_in",
    };
  }
  return { name: "", phone: null, cardNumber: null, source: "none" };
}

/** Skraćenica kad treba samo ime. */
export function resolvePatientName(
  appt: Parameters<typeof resolvePatient>[0]
): string {
  return resolvePatient(appt).name;
}

export async function fetchAppointmentsForWeek(
  weekStart: Date,
  weekEnd: Date,
  chairId: string | null // null = sve stolice (fallback)
): Promise<AppointmentWithRelations[]> {
  const supabase = createBrowserClient();

  let query = supabase
    .from("appointments")
    .select(
      `
      id, starts_at, ends_at, status, notes, awaiting_response, doctor_id, patient_id, patient_record_id, chair_id,
      walk_in_name, walk_in_phone,
      service:services(id, name, duration_minutes),
      chair:chairs(id, name),
      doctor:profiles!appointments_doctor_id_fkey(id, first_name, last_name, initials, color_hex),
      patient:profiles!appointments_patient_id_fkey(id, first_name, last_name, phone),
      patient_record:patients!patient_record_id(id, first_name, last_name, phone, card_number)
    `
    )
    .gte("starts_at", weekStart.toISOString())
    .lt("starts_at", weekEnd.toISOString())
    .neq("status", "cancelled");

  if (chairId) {
    query = query.eq("chair_id", chairId);
  }

  const { data, error } = await query.order("starts_at", { ascending: true });

  if (error) throw error;
  return (data as unknown as AppointmentWithRelations[]) ?? [];
}

export interface CreateAppointmentInput {
  doctor_id: string;
  service_id: string | null;
  chair_id: string;
  starts_at: string; // ISO
  ends_at: string; // ISO
  status: "pending" | "confirmed";
  notes: string | null;
  // pacijent — identitet (CHECK patient_or_walkin: patient_id ILI
  // patient_record_id ILI walk-in). Za registar: patient_record_id = patients.id,
  // patient_id = patients.profile_id (ako pacijent ima mobilni nalog, inače null).
  patient_id: string | null;
  patient_record_id: string | null;
  walk_in_name: string | null;
  walk_in_phone: string | null;
}

// 23P01 = exclusion constraint. Sad postoje DVA: per-doctor (appointments_no_overlap)
// i per-chair (appointments_no_overlap_chair). Razlikujemo po imenu u poruci da bismo
// u UI-u prikazali precizniju poruku. Vrati null ako nije overlap greška.
function overlapError(error: { code?: string; message?: string }): Error | null {
  if (error.code !== "23P01") return null;
  if ((error.message ?? "").includes("chair")) return new Error("OVERLAP_CHAIR");
  return new Error("OVERLAP_DOCTOR");
}

// Mapira grešku zakazivanja u srpsku poruku za toast (precizno za overlap, inače fallback).
export function appointmentErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    if (err.message === "OVERLAP_CHAIR")
      return "Stolica je već zauzeta u tom periodu";
    if (err.message === "OVERLAP_DOCTOR")
      return "Doktor je već zauzet u tom periodu";
  }
  return fallback;
}

export async function createAppointment(input: CreateAppointmentInput) {
  const supabase = createBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("appointments")
    .insert({ ...input, created_by: user?.id })
    .select("id")
    .single();

  if (error) {
    const overlap = overlapError(error);
    if (overlap) throw overlap;
    throw error;
  }
  return data;
}

export interface UpdateAppointmentInput {
  starts_at?: string;
  ends_at?: string;
  status?: "pending" | "confirmed" | "completed" | "no_show";
  notes?: string | null;
  admin_notes?: string | null;
  doctor_id?: string;
  service_id?: string | null;
  chair_id?: string;
}

export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput
) {
  const supabase = createBrowserClient();

  // Kad doktor menja STATUS termina (npr. pending -> confirmed / completed /
  // no_show), zajedno sa statusom čistimo "čeka odgovor" flag — pacijent više
  // nije zaključan u DA/NE režimu preko WhatsApp-a. Promena samo vremena
  // (starts_at/ends_at bez status-a) NE dira flag: to namerno okida novi predlog
  // pacijentu.
  const clearAwaiting =
    input.status !== undefined
      ? { awaiting_response: false, awaiting_since: null }
      : {};

  const { data, error } = await supabase
    .from("appointments")
    .update({ ...input, ...clearAwaiting, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    const overlap = overlapError(error);
    if (overlap) throw overlap;
    throw error;
  }
  return data;
}

export async function cancelAppointment(id: string, reason: string | null) {
  const supabase = createBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user?.id,
      cancellation_reason: reason,
      // Otkazivanje je doktorska odluka nad terminom → oslobodi pacijenta iz
      // DA/NE režima preko WhatsApp-a.
      awaiting_response: false,
      awaiting_since: null,
    })
    .eq("id", id);

  if (error) throw error;
}
