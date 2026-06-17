"use client";

import { parseISO, format } from "date-fns";

import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/lib/db/appointments";
import { useAppointmentModalStore } from "@/stores/appointmentModalStore";

const DEFAULT_COLOR = "#c9a24b";

export function AppointmentBlock({
  appointment,
  style,
}: {
  appointment: AppointmentWithRelations;
  style?: React.CSSProperties;
}) {
  const openDetail = useAppointmentModalStore((s) => s.openDetail);
  const color = appointment.doctor?.color_hex ?? DEFAULT_COLOR;
  const isPending = appointment.status === "pending";

  const patientName = appointment.patient
    ? [appointment.patient.first_name, appointment.patient.last_name]
        .filter(Boolean)
        .join(" ")
    : appointment.walk_in_name;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openDetail(appointment);
      }}
      style={{
        ...style,
        // dashed leva ivica + niža opacity razlikuju 'pending' od 'confirmed'
        borderLeft: `3px ${isPending ? "dashed" : "solid"} ${color}`,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
      className={cn(
        "absolute left-1 right-1 overflow-hidden rounded-md px-2 py-1 text-left text-venus-text transition-opacity hover:opacity-90",
        isPending && "opacity-65"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold" style={{ color }}>
          {appointment.doctor?.initials ?? "—"}
        </span>
        <span className="text-[10px] text-venus-text-dim">
          {format(parseISO(appointment.starts_at), "HH:mm")}
        </span>
      </div>
      {appointment.service?.name && (
        <p className="truncate text-[11px] font-medium leading-tight">
          {appointment.service.name}
        </p>
      )}
      {patientName && (
        <p className="truncate text-[10px] text-venus-text-dim">
          {patientName}
        </p>
      )}
    </button>
  );
}
