import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchToothProcedures } from "@/lib/db/toothProcedures";
import {
  createProcedureAction,
  updateProcedureAction,
  deleteProcedureAction,
} from "@/lib/actions/tooth-procedure-actions";
import type { ToothProcedureInput } from "@/lib/validations/toothProcedure";

export function proceduresKey(patientId: string) {
  return ["tooth-procedures", patientId] as const;
}

export function useToothProcedures(patientId: string) {
  return useQuery({
    queryKey: proceduresKey(patientId),
    queryFn: () => fetchToothProcedures(patientId),
    enabled: !!patientId,
  });
}

export function useProcedureMutations(patientId: string) {
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: proceduresKey(patientId) });

  const create = useMutation({
    mutationFn: async (input: ToothProcedureInput) => {
      const res = await createProcedureAction(patientId, input);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (vars: { id: string; input: ToothProcedureInput }) => {
      const res = await updateProcedureAction(vars.id, vars.input);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteProcedureAction(id);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
