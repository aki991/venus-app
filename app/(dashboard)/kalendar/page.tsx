"use client";

import { useKalendarStore } from "@/stores/kalendarStore";
import { useAppointmentsForWeek } from "@/hooks/useAppointments";
import { KalendarHeader } from "@/components/kalendar/KalendarHeader";
import { WeekView } from "@/components/kalendar/WeekView";

export default function KalendarPage() {
  const selectedDate = useKalendarStore((s) => s.selectedDate);
  const {
    data: appointments,
    isLoading,
    error,
  } = useAppointmentsForWeek(selectedDate);

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
    </div>
  );
}
