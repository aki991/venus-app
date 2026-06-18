"use client";

import { startOfWeek, addDays, isToday, format } from "date-fns";

import { cn } from "@/lib/utils";
import { useKalendarStore } from "@/stores/kalendarStore";
import { WORKING_HOURS } from "@/lib/constants/workingHours";
import { DayColumn } from "./DayColumn";
import type { AppointmentWithRelations } from "@/lib/db/appointments";

const HOURS_START = WORKING_HOURS.start; // 09:00
const HOURS_END = WORKING_HOURS.end; // 15:00
const SLOT_MIN = WORKING_HOURS.slotMinutes; // 30
const SLOT_HEIGHT = 52; // grid je 6h/12 slotova — veći slot da termini dišu
const WORK_DAYS = 5; // Pon–Pet (ordinacija ne radi vikendom)

// PON, UTO, SRE, ČET, PET — vikend se ne prikazuje
const DAY_NAMES = ["PON", "UTO", "SRE", "ČET", "PET"];

export function WeekView({
  appointments,
}: {
  appointments: AppointmentWithRelations[];
}) {
  const selectedDate = useKalendarStore((s) => s.selectedDate);
  // startOfWeek i dalje računa od ponedeljka; renderujemo samo prvih 5 dana.
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: WORK_DAYS }, (_, i) => addDays(weekStart, i));

  const totalSlots = ((HOURS_END - HOURS_START) * 60) / SLOT_MIN; // 12
  const gridHeight = totalSlots * SLOT_HEIGHT;

  // Granične linije 09:00 … 15:00; label crtamo samo na pun sat.
  const lines = Array.from({ length: totalSlots + 1 }, (_, i) => {
    const totalMin = HOURS_START * 60 + i * SLOT_MIN;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return {
      i,
      isHour: m === 0,
      label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    };
  });

  // Literal (ne interpolirati) — Tailwind JIT skenira samo statične string-ove.
  const gridCols = "grid-cols-[64px_repeat(5,1fr)]";

  return (
    <div className="min-w-[680px] overflow-hidden rounded-2xl border border-venus-border bg-venus-canvas">
      {/* Header: dani */}
      <div className={cn("grid border-b border-venus-border", gridCols)}>
        <div className="border-r border-venus-border" />
        {days.map((day, idx) => {
          const today = isToday(day); // vikend kolone se ne renderuju → nema highlight-a vikendom
          return (
            <div
              key={idx}
              className={cn(
                "flex flex-col items-center justify-center border-r border-venus-border py-2.5 last:border-r-0",
                today &&
                  "bg-[color-mix(in_srgb,var(--venus-gold)_10%,transparent)]"
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  today ? "text-venus-gold" : "text-venus-text-faint"
                )}
              >
                {DAY_NAMES[idx]}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  today ? "text-venus-gold" : "text-venus-text"
                )}
              >
                {format(day, "d")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Body: time grid (py- da prva/poslednja linija ne budu zalepljene za ivicu) */}
      <div className={cn("grid py-3", gridCols)}>
        {/* Time labele — poravnate na liniju punog sata */}
        <div
          className="relative border-r border-venus-border"
          style={{ height: gridHeight }}
        >
          {lines
            .filter((l) => l.isHour)
            .map(({ i, label }) => (
              <div
                key={i}
                className="absolute right-3 -translate-y-1/2 text-[11px] font-medium text-venus-text-faint"
                style={{ top: i * SLOT_HEIGHT }}
              >
                {label}
              </div>
            ))}
        </div>

        {/* Dan kolone (Pon–Pet) */}
        {days.map((day, idx) => (
          <DayColumn
            key={idx}
            day={day}
            appointments={appointments}
            totalSlots={totalSlots}
            slotHeight={SLOT_HEIGHT}
            hoursStart={HOURS_START}
            slotMin={SLOT_MIN}
          />
        ))}
      </div>
    </div>
  );
}
