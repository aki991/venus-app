"use client";

import { useAppointmentModalStore } from "@/stores/appointmentModalStore";
import { NewAppointmentModal } from "./NewAppointmentModal";
import { AppointmentDetailModal } from "./AppointmentDetailModal";

/**
 * Renderuje se na DASHBOARD LAYOUT nivou (uvek montirano) da bi "Novi termin"
 * CTA i detalji termina radili sa SVAKE dashboard stranice, ne samo /kalendar.
 * Trigeri (openNew/openDetail) žive u appointmentModalStore.
 */
export function AppointmentModals() {
  const newOpen = useAppointmentModalStore((s) => s.newOpen);
  const newDefaults = useAppointmentModalStore((s) => s.newDefaults);
  const closeNew = useAppointmentModalStore((s) => s.closeNew);
  const detailOpen = useAppointmentModalStore((s) => s.detailOpen);
  const selected = useAppointmentModalStore((s) => s.selected);
  const closeDetail = useAppointmentModalStore((s) => s.closeDetail);

  return (
    <>
      <NewAppointmentModal
        isOpen={newOpen}
        onClose={closeNew}
        defaultValues={newDefaults}
      />
      <AppointmentDetailModal
        appointment={selected}
        isOpen={detailOpen}
        onClose={closeDetail}
      />
    </>
  );
}
