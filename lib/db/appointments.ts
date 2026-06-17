import { createClient as createBrowserClient } from "@/lib/supabase/client";

export interface AppointmentWithRelations {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  notes: string | null;
  doctor_id: string | null;
  patient_id: string | null;
  walk_in_name: string | null;
  walk_in_phone: string | null;
  service: { id: string; name: string; duration_minutes: number } | null;
  doctor: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    initials: string | null;
    color_hex: string | null;
  } | null;
  patient: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export async function fetchAppointmentsForWeek(
  weekStart: Date,
  weekEnd: Date
): Promise<AppointmentWithRelations[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id, starts_at, ends_at, status, notes, doctor_id, patient_id,
      walk_in_name, walk_in_phone,
      service:services(id, name, duration_minutes),
      doctor:profiles!appointments_doctor_id_fkey(id, first_name, last_name, initials, color_hex),
      patient:profiles!appointments_patient_id_fkey(id, first_name, last_name)
    `
    )
    .gte("starts_at", weekStart.toISOString())
    .lt("starts_at", weekEnd.toISOString())
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data as unknown as AppointmentWithRelations[]) ?? [];
}

export interface CreateAppointmentInput {
  doctor_id: string;
  service_id: string | null;
  starts_at: string; // ISO
  ends_at: string; // ISO
  status: "pending" | "confirmed";
  notes: string | null;
  // pacijent — JEDNO od ova dva mora biti popunjeno (CHECK patient_or_walkin)
  patient_id: string | null;
  walk_in_name: string | null;
  walk_in_phone: string | null;
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
    // 23P01 = exclusion constraint (preklapanje termina za istog doktora)
    if (error.code === "23P01") {
      throw new Error("OVERLAP"); // hvatamo u UI-u sa user-friendly porukom
    }
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
}

export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput
) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from("appointments")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23P01") throw new Error("OVERLAP");
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
    })
    .eq("id", id);

  if (error) throw error;
}
