"use client";

import { useState } from "react";
import { startOfWeek, addDays, format } from "date-fns";
import { sr } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useKalendarStore } from "@/stores/kalendarStore";
import { MonthDropdown } from "./MonthDropdown";
import { ChairSelector } from "./ChairSelector";

const LAYOUTS = [
  { value: "standard", label: "Standard" },
  { value: "fokus", label: "Fokus" },
  { value: "split", label: "Podeljeni" },
] as const;

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

  const [pickerOpen, setPickerOpen] = useState(false);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  // Range = prikazana nedelja (Pon–Ned), npr. "15. jun – 21. jun"
  const range = `${format(weekStart, "d. LLL", { locale: sr })} – ${format(
    weekEnd,
    "d. LLL",
    { locale: sr }
  )}`;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="relative flex items-center gap-3">
        {/* Prethodna nedelja */}
        <button
          type="button"
          onClick={goToPreviousWeek}
          aria-label="Prethodna nedelja"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-venus-border text-venus-text-dim transition-colors hover:bg-venus-surface-2"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Range = naslov nedelje; klik otvara mesečni picker */}
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="font-serif text-3xl font-bold capitalize text-venus-text transition-colors hover:text-venus-gold"
        >
          {range}
        </button>

        {/* Sledeća nedelja */}
        <button
          type="button"
          onClick={goToNextWeek}
          aria-label="Sledeća nedelja"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-venus-border text-venus-text-dim transition-colors hover:bg-venus-surface-2"
        >
          <ChevronRight size={18} />
        </button>

        {/* Strelica za padajući (mesečni) kalendar */}
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Otvori kalendar"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-venus-text-dim transition-colors hover:bg-venus-surface-2"
        >
          <ChevronDown
            size={20}
            className={cn(
              "transition-transform duration-200",
              pickerOpen && "rotate-180"
            )}
          />
        </button>

        {/* Broj termina — desno od kalendara, veći font */}
        <span className="ml-2 shrink-0 text-lg font-semibold text-venus-text-dim">
          {appointmentCount} termina
        </span>

        {/* Selektor stolice */}
        <ChairSelector />

        {pickerOpen && (
          <>
            {/* Overlay — klik van dropdown-a zatvara */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setPickerOpen(false)}
            />
            <MonthDropdown onClose={() => setPickerOpen(false)} />
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Standard / Fokus / Podeljeni toggle */}
        <div className="flex items-center gap-1 rounded-full bg-venus-surface-2 p-1">
          {LAYOUTS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLayout(opt.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                layout === opt.value
                  ? "bg-venus-gold text-[#0d0d0d]"
                  : "text-venus-text-dim hover:text-venus-text"
              )}
            >
              {opt.label}
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
      </div>
    </div>
  );
}
