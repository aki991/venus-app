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
      data-appointment
      onClick={(e) => {
        e.stopPropagation();
        openDetail(appointment);
      }}
      style={{
        ...style,
        // Tanak border oko celog bloka (pending = dashed cue) razdvaja susedne
        // termine sličnih boja, PLUS deblja leva ivica = accent traka u boji
        // doktora. borderLeft posle shorthand-a override-uje samo levu stranu.
        border: `1.5px ${isPending ? "dashed" : "solid"} ${color}`,
        borderLeft: `5px solid ${color}`,
        // Neprozirna kartica: solidna surface pozadina + poluprozirni tint boje
        // doktora preko nje (gradient sloj). Tako se zadrži boja doktora, a
        // linije grida ne prosijavaju kroz blok niti seku tekst.
        // no_show: blago zasivljeni tint; ostali: tint boje doktora.
        background: `linear-gradient(0deg, ${
          isNoShow
            ? `color-mix(in srgb, ${color} 9%, rgba(130, 130, 130, 0.12))`
            : `color-mix(in srgb, ${color} 14%, transparent)`
        }, ${
          isNoShow
            ? `color-mix(in srgb, ${color} 9%, rgba(130, 130, 130, 0.12))`
            : `color-mix(in srgb, ${color} 14%, transparent)`
        }), var(--venus-surface)`,
      }}
      className={cn(
        "absolute left-1 right-1 z-10 flex items-start justify-between gap-1.5 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-venus-text transition-opacity hover:opacity-100",
        // prigušenje: pending (čeka), completed (gotovo), no_show (nije došao)
        isPending && "opacity-65",
        (isCompleted || isNoShow) && "opacity-75"
      )}
    >
      {/* Leva kolona: pacijent (bold, najistaknutiji) + usluga ispod */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold leading-tight">
          {patientName || "—"}
        </p>
        {appointment.service?.name && (
          <p
            className={cn(
              "truncate text-[14px] leading-tight text-venus-text-dim",
              // suptilan strikethrough za završene termine
              isCompleted && "line-through decoration-1"
            )}
          >
            {appointment.service.name}
          </p>
        )}
      </div>

      {/* Desna kolona: vreme (bold) + inicijali doktora ispod */}
      <div className="flex shrink-0 flex-col items-end">
        <div className="flex items-center gap-1">
          <span className="text-[14px] font-semibold text-venus-text-dim">
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
        <span className="text-[13px] font-semibold" style={{ color }}>
          {appointment.doctor?.initials ?? "—"}
        </span>
      </div>
    </button>
  );
}
