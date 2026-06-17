"use client";

import { startOfWeek, addDays, format } from "date-fns";
import { sr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useKalendarStore } from "@/stores/kalendarStore";

export function KalendarHeader({
  appointmentCount,
}: {
  appointmentCount: number;
}) {
  const selectedDate = useKalendarStore((s) => s.selectedDate);
  const layout = useKalendarStore((s) => s.layout);
  const setLayout = useKalendarStore((s) => s.setLayout);
  const goToPreviousWeek = useKalendarStore((s) => s.goToPreviousWeek);
  const goToNextWeek = useKalendarStore((s) => s.goToNextWeek);
  const goToToday = useKalendarStore((s) => s.goToToday);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const monthTitle = format(selectedDate, "LLLL yyyy", {
    locale: sr,
  }).toUpperCase();
  const range = `${format(weekStart, "d. LLL", { locale: sr })} – ${format(
    weekEnd,
    "d. LLL",
    { locale: sr }
  )} • ${appointmentCount} termina`;

  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-4xl font-bold text-venus-text">
          {monthTitle}
        </h1>
        <p className="mt-1 text-sm text-venus-text-dim">{range}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Standard / Fokus toggle */}
        <div className="flex items-center gap-1 rounded-full bg-venus-surface-2 p-1">
          {(["standard", "fokus"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setLayout(opt)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                layout === opt
                  ? "bg-venus-gold text-[#1a140a]"
                  : "text-venus-text-dim hover:text-venus-text"
              )}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Danas */}
        <button
          type="button"
          onClick={goToToday}
          className="rounded-lg border border-venus-border px-3 py-1.5 text-sm text-venus-text-dim transition-colors hover:bg-venus-surface-2"
        >
          Danas
        </button>

        {/* Prev / Next nedelja */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToPreviousWeek}
            aria-label="Prethodna nedelja"
            className="flex size-9 items-center justify-center rounded-lg border border-venus-border text-venus-text-dim transition-colors hover:bg-venus-surface-2"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={goToNextWeek}
            aria-label="Sledeća nedelja"
            className="flex size-9 items-center justify-center rounded-lg border border-venus-border text-venus-text-dim transition-colors hover:bg-venus-surface-2"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
