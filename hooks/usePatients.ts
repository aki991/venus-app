import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchPatients,
  fetchPatientById,
  fetchPatientAppointments,
} from "@/lib/db/patients";
import {
  createPatientAction,
  updatePatientAction,
} from "@/lib/actions/patient-actions";
import type { PatientFormInput } from "@/lib/validations/patient";

/** Lista pacijenata + reaktivna pretraga (>= 2 znaka filtrira). */
export function usePatients(search: string) {
  return useQuery({
    queryKey: ["patients", "list", search.trim()],
    queryFn: () => fetchPatients(search),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patients", "detail", id],
    queryFn: () => fetchPatientById(id),
    enabled: !!id,
  });
}

export function usePatientAppointments(id: string) {
  return useQuery({
    queryKey: ["patients", "appointments", id],
    queryFn: () => fetchPatientAppointments(id),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientFormInput) => createPatientAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PatientFormInput }) =>
      updatePatientAction(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
