"use client";

import { parseISO, format } from "date-fns";
import { MessageCircleQuestion } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  resolvePatientName,
  type AppointmentWithRelations,
} from "@/lib/db/appointments";
import { useAppointmentModalStore } from "@/stores/appointmentModalStore";
import {
  STATUS_CONFIG,
  effectiveStatus,
} from "@/lib/constants/appointmentStatus";

const DEFAULT_COLOR = "#e5c45f";

export function AppointmentBlock({
  appointment,
  now,
  style,
}: {
  appointment: AppointmentWithRelations;
  now?: Date;
  style?: React.CSSProperties;
}) {
  const openDetail = useAppointmentModalStore((s) => s.openDetail);

  // Osnova bloka je BOJA DOKTORA (leva ivica + pozadina).
  // `|| DEFAULT` (ne `??`) da i prazan string padne na default boju.
  const color = appointment.doctor?.color_hex?.trim() || DEFAULT_COLOR;
  // Tanak okvir (3 ne-leve strane) je PRIGUŠENA boja doktora — tako debela leva
  // traka (puna boja) uvek dominira, nezavisno od statusa. Ranije su sve 4 strane
  // bile ista puna boja, pa se kod 'confirmed' leva traka stapala sa okvirom i
  // delovalo je kao da je nema (dok je kod 'pending' dashed okvir pravio kontrast).
  const frameColor = `color-mix(in srgb, ${color} 42%, transparent)`;

  // Prošli "potvrđen" termin se prikazuje kao "završen" (izvedeno, bez izmene baze).
  const status = effectiveStatus(appointment.status, appointment.ends_at, now);
  const isPending = status === "pending";
  const isCompleted = status === "completed";
  const isNoShow = status === "no_show";

  // Status se prikazuje kao mala ikonica gore-desno. 'confirmed' je default
  // stanje, pa ga ne crtamo da ne zatrpava UI.
  const statusCfg = STATUS_CONFIG[status];
  const StatusIcon = statusCfg.icon;
  const showStatusIcon = status !== "confirmed";

  // Ime se razrešava iz registra → legacy profila → walk-in (resolvePatientName).
  const patientName = resolvePatientName(appointment);

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
        // Border isključivo kao LONGHAND (width/style/color), nikad mešano sa
        // `borderLeft` shorthand-om — inače React pri re-renderu (npr. promena
        // statusa) ažurira `border` i resetuje levu ivicu, pa debela leva traka
        // "nestane". Redosled strana: top right bottom left.
        // Leva ivica: 5px PUNA boja doktora (uvek dominira), ostale 3: tanke i
        // prigušene; dashed kao 'pending' cue.
        borderWidth: "1.5px 1.5px 1.5px 5px",
        borderStyle: isPending ? "dashed dashed dashed solid" : "solid",
        borderColor: `${frameColor} ${frameColor} ${frameColor} ${color}`,
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
          {appointment.awaiting_response && (
            <MessageCircleQuestion
              size={13}
              className="shrink-0 text-amber-500"
              aria-label="Čeka odgovor pacijenta"
            />
          )}
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
