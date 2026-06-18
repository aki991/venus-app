"use client";

import { parseISO, isSameDay, differenceInMinutes, format } from "date-fns";

import { cn } from "@/lib/utils";
import { useKalendarStore } from "@/stores/kalendarStore";
import { useAppointmentModalStore } from "@/stores/appointmentModalStore";
import { AppointmentBlock } from "./AppointmentBlock";
import type { AppointmentWithRelations } from "@/lib/db/appointments";

interface DayColumnProps {
  day: Date;
  appointments: AppointmentWithRelations[];
  totalSlots: number;
  slotHeight: number;
  hoursStart: number;
  slotMin: number;
}

export function DayColumn({
  day,
  appointments,
  totalSlots,
  slotHeight,
  hoursStart,
  slotMin,
}: DayColumnProps) {
  const doctorFilter = useKalendarStore((s) => s.doctorFilter);
  const openNew = useAppointmentModalStore((s) => s.openNew);

  const dayAppts = appointments.filter((a) => {
    if (!isSameDay(parseISO(a.starts_at), day)) return false;
    if (doctorFilter && a.doctor_id !== doctorFilter) return false;
    return true;
  });

  return (
    <div
      className="relative border-r border-venus-border last:border-r-0"
      style={{ height: totalSlots * slotHeight }}
    >
      {/* Horizontalne linije: pun sat jača (border), pola sata suptilna (line).
          Crta se i početna (09:00) i završna (15:00) granica. */}
      {Array.from({ length: totalSlots + 1 }).map((_, i) => (
        <div
          key={`line-${i}`}
          className={cn(
            "pointer-events-none absolute inset-x-0 h-px",
            i % 2 === 0 ? "bg-venus-border" : "bg-venus-line"
          )}
          style={{ top: i * slotHeight }}
        />
      ))}

      {/* Klikabilni slotovi (transparentni, preko linija) — klik otvara novi termin */}
      {Array.from({ length: totalSlots }).map((_, i) => {
        const totalMin = hoursStart * 60 + i * slotMin;
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        const timeLabel = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        return (
          <button
            type="button"
            key={i}
            onClick={() =>
              openNew({
                date: format(day, "yyyy-MM-dd"),
                time: timeLabel,
                doctor_id: doctorFilter ?? undefined,
              })
            }
            className="absolute inset-x-0 transition-colors hover:bg-[color-mix(in_srgb,var(--venus-gold)_8%,transparent)]"
            style={{ top: i * slotHeight, height: slotHeight }}
          />
        );
      })}

      {/* Termini — apsolutno pozicionirani preko grida */}
      {dayAppts.map((appt) => {
        const start = parseISO(appt.starts_at);
        const end = parseISO(appt.ends_at);
        const minutesFromStart =
          start.getHours() * 60 + start.getMinutes() - hoursStart * 60;
        const durationMin = Math.max(differenceInMinutes(end, start), slotMin);
        const top = (minutesFromStart / slotMin) * slotHeight;
        const height = (durationMin / slotMin) * slotHeight;

        return (
          <AppointmentBlock
            key={appt.id}
            appointment={appt}
            style={{ top, height }}
          />
        );
      })}
    </div>
  );
}
