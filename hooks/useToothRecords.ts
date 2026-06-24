import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchToothRecords, type ToothMap } from "@/lib/db/toothRecords";
import {
  applySetCondition,
  applyRemoveCondition,
} from "@/lib/odontogram/toothMap";
import {
  setToothSurfaceAction,
  removeToothConditionAction,
} from "@/lib/actions/tooth-actions";
import type {
  ToothCondition,
  DbToothSurface,
} from "@/lib/constants/toothConditions";

function key(patientId: string) {
  return ["tooth-records", patientId] as const;
}

export function useToothRecords(patientId: string) {
  return useQuery({
    queryKey: key(patientId),
    queryFn: () => fetchToothRecords(patientId),
    enabled: !!patientId,
  });
}

interface SetVars {
  toothNumber: number;
  surface: DbToothSurface;
  condition: ToothCondition;
}

export function useSetToothSurface(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: SetVars) => {
      const res = await setToothSurfaceAction(
        patientId,
        vars.toothNumber,
        vars.surface,
        vars.condition
      );
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onMutate: async (vars: SetVars) => {
      await qc.cancelQueries({ queryKey: key(patientId) });
      const prev = qc.getQueryData<ToothMap>(key(patientId));
      qc.setQueryData<ToothMap>(key(patientId), (old) =>
        applySetCondition(
          old ?? {},
          vars.toothNumber,
          vars.surface,
          vars.condition
        )
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(patientId), ctx.prev);
      toast.error(err instanceof Error ? err.message : "Greška pri čuvanju");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key(patientId) });
    },
  });
}

interface RemoveVars {
  toothNumber: number;
  surface: DbToothSurface;
}

export function useRemoveToothCondition(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: RemoveVars) => {
      const res = await removeToothConditionAction(
        patientId,
        vars.toothNumber,
        vars.surface
      );
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onMutate: async (vars: RemoveVars) => {
      await qc.cancelQueries({ queryKey: key(patientId) });
      const prev = qc.getQueryData<ToothMap>(key(patientId));
      qc.setQueryData<ToothMap>(key(patientId), (old) =>
        applyRemoveCondition(old ?? {}, vars.toothNumber, vars.surface)
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(patientId), ctx.prev);
      toast.error(err instanceof Error ? err.message : "Greška pri brisanju");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key(patientId) });
    },
  });
}
