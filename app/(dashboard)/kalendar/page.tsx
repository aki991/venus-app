"use client";

import { useEffect } from "react";

import { useKalendarStore } from "@/stores/kalendarStore";
import { useAppointmentsForWeek } from "@/hooks/useAppointments";
import { useChairs } from "@/hooks/useChairs";
import { KalendarHeader } from "@/components/kalendar/KalendarHeader";
import { WeekView } from "@/components/kalendar/WeekView";
import { DailyAgenda } from "@/components/kalendar/DailyAgenda";

export default function KalendarPage() {
  const selectedDate = useKalendarStore((s) => s.selectedDate);
  const layout = useKalendarStore((s) => s.layout);
  const selectedChairId = useKalendarStore((s) => s.selectedChairId);
  const setSelectedChairId = useKalendarStore((s) => s.setSelectedChairId);

  const { data: chairs } = useChairs();

  // Auto-selekcija stolice: ako ništa nije izabrano ILI izabrana stolica više
  // ne postoji (deaktivirana/obrisana), selektuj prvu aktivnu stolicu.
  useEffect(() => {
    if (!chairs || chairs.length === 0) return;
    const valid = selectedChairId && chairs.some((c) => c.id === selectedChairId);
    if (!valid) setSelectedChairId(chairs[0].id);
  }, [chairs, selectedChairId, setSelectedChairId]);

  const {
    data: appointments,
    isLoading,
    error,
  } = useAppointmentsForWeek(selectedDate, selectedChairId);

  const appts = appointments ?? [];

  return (
    <div className="flex h-full flex-col p-6">
      <KalendarHeader appointmentCount={appts.length} />

      <div className="mt-6 min-h-0 flex-1">
        {error ? (
          <div className="text-venus-danger">Greška: {String(error)}</div>
        ) : isLoading ? (
          <div className="text-venus-text-dim">Učitavam termine...</div>
        ) : layout === "split" ? (
          // Podeljeni: kalendar (flex-1) + Dnevni pregled agenda (308px)
          <div className="flex h-full">
            <div className="min-w-0 flex-1 overflow-auto">
              <WeekView appointments={appts} />
            </div>
            <DailyAgenda appointments={appts} />
          </div>
        ) : (
          // Standard / Fokus: samo kalendar
          <div className="h-full overflow-auto">
            <WeekView appointments={appts} />
          </div>
        )}
      </div>
    </div>
  );
}
