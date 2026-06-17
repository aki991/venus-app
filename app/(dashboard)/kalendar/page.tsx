"use client";

import { useKalendarStore } from "@/stores/kalendarStore";
import { useAppointmentModalStore } from "@/stores/appointmentModalStore";
import { useAppointmentsForWeek } from "@/hooks/useAppointments";
import { KalendarHeader } from "@/components/kalendar/KalendarHeader";
import { WeekView } from "@/components/kalendar/WeekView";
import { NewAppointmentModal } from "@/components/kalendar/NewAppointmentModal";
import { AppointmentDetailModal } from "@/components/kalendar/AppointmentDetailModal";

export default function KalendarPage() {
  const selectedDate = useKalendarStore((s) => s.selectedDate);
  const {
    data: appointments,
    isLoading,
    error,
  } = useAppointmentsForWeek(selectedDate);

  const newOpen = useAppointmentModalStore((s) => s.newOpen);
  const newDefaults = useAppointmentModalStore((s) => s.newDefaults);
  const closeNew = useAppointmentModalStore((s) => s.closeNew);
  const detailOpen = useAppointmentModalStore((s) => s.detailOpen);
  const selected = useAppointmentModalStore((s) => s.selected);
  const closeDetail = useAppointmentModalStore((s) => s.closeDetail);

  return (
    <div className="flex h-full flex-col p-6">
      <KalendarHeader appointmentCount={appointments?.length ?? 0} />
      <div className="mt-6 flex-1 overflow-auto">
        {error ? (
          <div className="text-venus-danger">Greška: {String(error)}</div>
        ) : isLoading ? (
          <div className="text-venus-text-dim">Učitavam termine...</div>
        ) : (
          <WeekView appointments={appointments ?? []} />
        )}
      </div>

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
    </div>
  );
}
