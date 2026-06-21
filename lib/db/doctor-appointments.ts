import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { AppointmentStatus } from "@/lib/constants/appointmentStatus";

export interface DoctorAppointmentItem {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  walk_in_name: string | null;
  chair: { name: string } | null;
  patient: { first_name: string | null; last_name: string | null } | null;
}

/**
 * Svi termini jednog doktora — UKLJUČUJUĆI otkazane i protekle. Namerno bez
 * filtera po statusu/datumu, jer upravo ti "nevidljivi" termini (otkazani/prošli)
 * blokiraju brisanje doktora u deleteDoctorAction (koja broji sve po doctor_id).
 */
export async function fetchDoctorAppointments(
  doctorId: string
): Promise<DoctorAppointmentItem[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `id, starts_at, ends_at, status, walk_in_name,
       chair:chairs(name),
       patient:profiles!appointments_patient_id_fkey(first_name, last_name)`
    )
    .eq("doctor_id", doctorId)
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as DoctorAppointmentItem[]) ?? [];
}
