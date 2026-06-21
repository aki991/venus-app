import { useQuery } from "@tanstack/react-query";
import { fetchDoctorAppointments } from "@/lib/db/doctor-appointments";

/** Termini jednog doktora; `enabled` da fetch ide tek kad se dijalog otvori. */
export function useDoctorAppointments(
  doctorId: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["doctor-appointments", doctorId],
    queryFn: () => fetchDoctorAppointments(doctorId!),
    enabled: enabled && !!doctorId,
  });
}
