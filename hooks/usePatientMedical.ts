import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchPatientMedical } from "@/lib/db/patientMedical";
import { upsertPatientMedicalAction } from "@/lib/actions/patient-medical-actions";
import type { PatientMedicalInput } from "@/lib/validations/patientMedical";

function key(patientId: string) {
  return ["patient-medical", patientId] as const;
}

export function usePatientMedical(patientId: string) {
  return useQuery({
    queryKey: key(patientId),
    queryFn: () => fetchPatientMedical(patientId),
    enabled: !!patientId,
  });
}

export function usePatientMedicalMutation(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PatientMedicalInput) => {
      const res = await upsertPatientMedicalAction(patientId, input);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(patientId) });
    },
  });
}
