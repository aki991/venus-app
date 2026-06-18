"use client";

import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameWeek,
  isSameMonth,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { sr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useKalendarStore } from "@/stores/kalendarStore";

// Pon-prvo: P(on) U(to) S(re) Č(et) P(et) S(ub) N(ed)
const WEEKDAYS = ["P", "U", "S", "Č", "P", "S", "N"];

export function MonthDropdown({ onClose }: { onClose: () => void }) {
  const selectedDate = useKalendarStore((s) => s.selectedDate);
  const setSelectedDate = useKalendarStore((s) => s.setSelectedDate);

  // Lokalni mesec — listanje meseca ne dira izabranu nedelju dok ne klikneš dan.
  const [viewMonth, setViewMonth] = useState<Date>(selectedDate);

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const monthLabel = format(viewMonth, "LLLL yyyy", { locale: sr }).toUpperCase();

  return (
    <div className="absolute left-0 top-full z-50 mt-2 w-[300px] rounded-[13px] border border-venus-border bg-venus-surface p-4 shadow-xl shadow-black/40">
      {/* Header: mesec + listanje */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-serif text-[20px] font-bold text-venus-text">
          {monthLabel}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Prethodni mesec"
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            className="flex size-7 items-center justify-center rounded-md text-venus-text-dim transition-colors hover:bg-venus-surface-2"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Sledeći mesec"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="flex size-7 items-center justify-center rounded-md text-venus-text-dim transition-colors hover:bg-venus-surface-2"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Dani u nedelji */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <span
            key={i}
            className="text-center text-[9.5px] font-bold uppercase tracking-[0.1em] text-venus-text-faint"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Brojevi dana */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const today = isToday(day);
          const inSelectedWeek = isSameWeek(day, selectedDate, {
            weekStartsOn: 1,
          });

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                setSelectedDate(day);
                onClose();
              }}
              className={cn(
                "flex aspect-square items-center justify-center rounded-[7px] text-[11.5px] tabular-nums transition-colors",
                today
                  ? "bg-venus-gold font-bold text-venus-bg"
                  : inSelectedWeek
                    ? "bg-[color-mix(in_srgb,var(--venus-gold)_13%,transparent)] font-bold text-venus-text hover:bg-venus-surface-2"
                    : inMonth
                      ? "text-venus-text hover:bg-venus-surface-2"
                      : "text-venus-text-faint hover:bg-venus-surface-2"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
