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
