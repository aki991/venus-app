"use client";

import { useState } from "react";
import { parseISO, isSameDay, differenceInMinutes, format } from "date-fns";

import { cn } from "@/lib/utils";
import { useKalendarStore } from "@/stores/kalendarStore";
import { useAppointmentModalStore } from "@/stores/appointmentModalStore";
import { AppointmentBlock } from "./AppointmentBlock";
import type { AppointmentWithRelations } from "@/lib/db/appointments";

interface DayColumnProps {
  day: Date;
  now: Date;
  appointments: AppointmentWithRelations[];
  totalSlots: number;
  slotHeight: number;
  hoursStart: number;
  slotMin: number;
}

export function DayColumn({
  day,
  now,
  appointments,
  totalSlots,
  slotHeight,
  hoursStart,
  slotMin,
}: DayColumnProps) {
  const doctorFilter = useKalendarStore((s) => s.doctorFilter);
  const openNew = useAppointmentModalStore((s) => s.openNew);

  // Indeks 15-min slota nad kojim je kursor (null = miš van kolone).
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);

  const gridHeight = totalSlots * slotHeight;

  // Početak datog slota kao Date u lokalnom vremenu konkretnog dana.
  function slotStartDate(idx: number): Date {
    const totalMin = hoursStart * 60 + idx * slotMin;
    const d = new Date(day);
    d.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
    return d;
  }

  // Slot je "prošao" ako mu je početak pre sadašnjeg trenutka.
  function isSlotPast(idx: number): boolean {
    return slotStartDate(idx).getTime() < now.getTime();
  }

  // Vreme početka datog slota: slot 10:00–10:15 → "10:00", itd.
  function slotTime(idx: number): string {
    return format(slotStartDate(idx), "HH:mm");
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    // Iznad već zakazanog termina ne prikazujemo indikator vremena.
    if ((e.target as HTMLElement).closest("[data-appointment]")) {
      setHoverSlot(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    // Floor na slot: ceo opseg slota pokazuje vreme njegovog početka.
    const idx = Math.max(0, Math.min(Math.floor(y / slotHeight), totalSlots - 1));
    // Nad prošlim slotom ne prikazujemo liniju sa vremenom (slot je neaktivan).
    if (isSlotPast(idx)) {
      setHoverSlot(null);
      return;
    }
    setHoverSlot(idx);
  }

  const dayAppts = appointments.filter((a) => {
    if (!isSameDay(parseISO(a.starts_at), day)) return false;
    if (doctorFilter && a.doctor_id !== doctorFilter) return false;
    return true;
  });

  return (
    <div
      className="relative border-r border-venus-border last:border-r-0"
      style={{ height: gridHeight }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverSlot(null)}
    >
      {/* Horizontalne linije — hijerarhija po granularnosti (15-min grid):
          pun sat = najjača (venus-border), pola sata = srednja, 15/45 = najtanja.
          Crta se i početna (09:00) i završna (15:00) granica. */}
      {Array.from({ length: totalSlots + 1 }).map((_, i) => {
        const min = (hoursStart * 60 + i * slotMin) % 60;
        const lineClass =
          min === 0
            ? "bg-venus-border"
            : min === 30
              ? "bg-[color-mix(in_srgb,var(--venus-border)_55%,transparent)]"
              : "bg-[color-mix(in_srgb,var(--venus-border)_25%,transparent)]";
        return (
          <div
            key={`line-${i}`}
            className={cn(
              "pointer-events-none absolute inset-x-0 h-px",
              lineClass
            )}
            style={{ top: i * slotHeight }}
          />
        );
      })}

      {/* Klikabilni slotovi (transparentni, preko linija) — klik otvara novi termin.
          Prošli slotovi (početak slota < sada) su zasivljeni i ne reaguju na klik.
          Pošto se proverava svaki slot, cela prošla kolona dana ispada zasivljena. */}
      {Array.from({ length: totalSlots }).map((_, i) => {
        const timeLabel = slotTime(i);
        const isPast = isSlotPast(i);
        return (
          <button
            type="button"
            key={i}
            disabled={isPast}
            onClick={
              isPast
                ? undefined
                : () =>
                    openNew({
                      date: format(day, "yyyy-MM-dd"),
                      time: timeLabel,
                      doctor_id: doctorFilter ?? undefined,
                    })
            }
            className={cn(
              "absolute inset-x-0 transition-colors",
              isPast
                ? "cursor-not-allowed bg-[color-mix(in_srgb,var(--venus-text-faint)_12%,transparent)]"
                : "hover:bg-[color-mix(in_srgb,var(--venus-gold)_8%,transparent)]"
            )}
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
            now={now}
            style={{ top, height }}
          />
        );
      })}

      {/* Indikator vremena — snapuje se na slot (granicu), pill fiksiran levo */}
      {hoverSlot !== null && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20"
          style={{ top: hoverSlot * slotHeight }}
        >
          <div className="absolute inset-x-0 h-px bg-venus-gold/70" />
          <span className="absolute left-0 -translate-y-1/2 rounded-r-md bg-venus-gold px-1.5 py-0.5 text-[11px] font-semibold text-[#0d0d0d] shadow-sm">
            {slotTime(hoverSlot)}
          </span>
        </div>
      )}
    </div>
  );
}
