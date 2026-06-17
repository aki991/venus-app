"use client";

import { startOfWeek, addDays, isToday, format } from "date-fns";

import { cn } from "@/lib/utils";
import { useKalendarStore } from "@/stores/kalendarStore";
import { DayColumn } from "./DayColumn";
import type { AppointmentWithRelations } from "@/lib/db/appointments";

const HOURS_START = 8;
const HOURS_END = 20;
const SLOT_MIN = 30;
const SLOT_HEIGHT = 28;

const DAY_NAMES = ["PON", "UTO", "SRE", "ČET", "PET", "SUB", "NED"];

export function WeekView({
  appointments,
}: {
  appointments: AppointmentWithRelations[];
}) {
  const selectedDate = useKalendarStore((s) => s.selectedDate);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const totalSlots = ((HOURS_END - HOURS_START) * 60) / SLOT_MIN; // 24
  const gridHeight = totalSlots * SLOT_HEIGHT;

  const timeLabels = Array.from({ length: totalSlots }, (_, i) => {
    const totalMin = HOURS_START * 60 + i * SLOT_MIN;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return { i, label: m === 0 ? `${String(h).padStart(2, "0")}:00` : "" };
  });

  return (
    <div className="min-w-[760px] overflow-hidden rounded-2xl border border-venus-border bg-venus-surface">
      {/* Header: dani */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-venus-border">
        <div className="border-r border-venus-line" />
        {days.map((day, idx) => {
          const today = isToday(day);
          return (
            <div
              key={idx}
              className={cn(
                "flex flex-col items-center justify-center border-r border-venus-line py-2 last:border-r-0",
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

      {/* Body: time grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)]">
        {/* Time labele */}
        <div
          className="relative border-r border-venus-line"
          style={{ height: gridHeight }}
        >
          {timeLabels.map(({ i, label }) => (
            <div
              key={i}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-venus-text-faint"
              style={{ top: i * SLOT_HEIGHT }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Dan kolone */}
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
