import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchServices, fetchAllServices } from "@/lib/db/services";
import type { ActionResult, ServiceInput } from "@/lib/admin/types";
import {
  createServiceAction,
  updateServiceAction,
  setServiceActiveAction,
  deleteServiceAction,
  reorderServicesAction,
} from "@/lib/admin/service-actions";

/** Aktivne usluge (NewAppointmentModal). queryKey ['services']. */
export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
  });
}

/**
 * SVE usluge za admin cenovnik. queryKey ['services','admin'] — prefiks
 * ['services'] znači da invalidacija ['services'] osvežava i ovaj i modal query.
 */
export function useAdminServices() {
  return useQuery({
    queryKey: ["services", "admin"],
    queryFn: fetchAllServices,
  });
}

/** Pretvara ActionResult u throw da TanStack mutacije hvataju grešku. */
async function unwrap(p: Promise<ActionResult>): Promise<void> {
  const res = await p;
  if ("error" in res) throw new Error(res.error);
}

/**
 * Mutacije za cenovnik. Sve invalidiraju ['services'] posle uspeha → osvežava
 * i admin listu i dropdown u NewAppointmentModal-u.
 */
export function useServiceMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["services"] });

  const create = useMutation({
    mutationFn: (input: ServiceInput) => unwrap(createServiceAction(input)),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServiceInput }) =>
      unwrap(updateServiceAction(id, input)),
    onSuccess: invalidate,
  });

  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      unwrap(setServiceActiveAction(id, active)),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => unwrap(deleteServiceAction(id)),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) =>
      unwrap(reorderServicesAction(orderedIds)),
    // Reorder radi optimistic update u komponenti; ovde samo reconcile sa serverom.
    onSettled: invalidate,
  });

  return { create, update, setActive, remove, reorder };
}
