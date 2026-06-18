"use client";

import { parseISO, format } from "date-fns";

import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/lib/db/appointments";
import { useAppointmentModalStore } from "@/stores/appointmentModalStore";
import { STATUS_CONFIG } from "@/lib/constants/appointmentStatus";

const DEFAULT_COLOR = "#e5c45f";

export function AppointmentBlock({
  appointment,
  style,
}: {
  appointment: AppointmentWithRelations;
  style?: React.CSSProperties;
}) {
  const openDetail = useAppointmentModalStore((s) => s.openDetail);

  // Osnova bloka je BOJA DOKTORA (leva ivica + pozadina).
  const color = appointment.doctor?.color_hex ?? DEFAULT_COLOR;

  const status = appointment.status;
  const isPending = status === "pending";
  const isCompleted = status === "completed";
  const isNoShow = status === "no_show";

  // Status se prikazuje kao mala ikonica gore-desno. 'confirmed' je default
  // stanje, pa ga ne crtamo da ne zatrpava UI.
  const statusCfg = STATUS_CONFIG[status];
  const StatusIcon = statusCfg.icon;
  const showStatusIcon = status !== "confirmed";

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
        // dashed leva ivica razlikuje 'pending' od ostalih statusa
        borderLeft: `3px ${isPending ? "dashed" : "solid"} ${color}`,
        // no_show: blago zasivljena pozadina; ostali: čista boja doktora
        backgroundColor: isNoShow
          ? `color-mix(in srgb, ${color} 9%, rgba(130, 130, 130, 0.12))`
          : `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
      className={cn(
        "absolute left-1 right-1 overflow-hidden rounded-md px-2 py-1 text-left text-venus-text transition-opacity hover:opacity-100",
        // prigušenje: pending (čeka), completed (gotovo), no_show (nije došao)
        isPending && "opacity-65",
        (isCompleted || isNoShow) && "opacity-75"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold" style={{ color }}>
          {appointment.doctor?.initials ?? "—"}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-venus-text-dim">
            {format(parseISO(appointment.starts_at), "HH:mm")}
          </span>
          {showStatusIcon && (
            <StatusIcon
              size={13}
              className="shrink-0"
              style={{ color: statusCfg.color }}
              aria-label={statusCfg.label}
            />
          )}
        </div>
      </div>
      {appointment.service?.name && (
        <p
          className={cn(
            "truncate text-[11px] font-medium leading-tight",
            // suptilan strikethrough za završene termine
            isCompleted && "line-through decoration-1"
          )}
        >
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
