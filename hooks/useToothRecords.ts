import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchToothRecords, type ToothMap } from "@/lib/db/toothRecords";
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
      qc.setQueryData<ToothMap>(key(patientId), (old) => {
        const next: ToothMap = { ...(old ?? {}) };
        const cur = next[vars.toothNumber] ?? { surfaces: {}, wholeTooth: null };
        if (vars.surface === "ceo_zub") {
          // Strukturno gazi sve površine.
          next[vars.toothNumber] = { surfaces: {}, wholeTooth: vars.condition };
        } else {
          next[vars.toothNumber] = {
            surfaces: { ...cur.surfaces, [vars.surface]: vars.condition },
            wholeTooth: null,
          };
        }
        return next;
      });
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
      qc.setQueryData<ToothMap>(key(patientId), (old) => {
        const next: ToothMap = { ...(old ?? {}) };
        const cur = next[vars.toothNumber];
        if (!cur) return next;
        if (vars.surface === "ceo_zub") {
          delete next[vars.toothNumber]; // reset celog zuba
        } else {
          const surfaces = { ...cur.surfaces };
          delete surfaces[vars.surface];
          next[vars.toothNumber] = { surfaces, wholeTooth: cur.wholeTooth };
        }
        return next;
      });
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
