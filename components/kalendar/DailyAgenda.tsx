"use client";

import { parseISO, isSameDay, format } from "date-fns";
import { srLatn } from "date-fns/locale";
import { Armchair } from "lucide-react";

import { useKalendarStore } from "@/stores/kalendarStore";
import { useAppointmentModalStore } from "@/stores/appointmentModalStore";
import { useChairs } from "@/hooks/useChairs";
import type { AppointmentWithRelations } from "@/lib/db/appointments";

const DEFAULT_COLOR = "#e5c45f";

// Srpska množina: 1 termin, 2 termina, 5 termina, 21 termin…
function terminWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  return mod10 === 1 && mod100 !== 11 ? "termin" : "termina";
}

function patientName(appt: AppointmentWithRelations): string {
  if (appt.patient) {
    return (
      [appt.patient.first_name, appt.patient.last_name]
        .filter(Boolean)
        .join(" ") || "Bez imena"
    );
  }
  return appt.walk_in_name ?? "Walk-in";
}

export function DailyAgenda({
  appointments,
}: {
  appointments: AppointmentWithRelations[];
}) {
  const selectedDate = useKalendarStore((s) => s.selectedDate);
  const openDetail = useAppointmentModalStore((s) => s.openDetail);
  const { data: chairs } = useChairs();
  const showChairTag = (chairs?.length ?? 0) > 1;

  const dayAppts = appointments
    .filter((a) => isSameDay(parseISO(a.starts_at), selectedDate))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  // "Sreda · 18. jun" — srpski naziv dana i meseca, prvo slovo veliko
  const rawTitle = format(selectedDate, "EEEE · d. LLLL", { locale: srLatn });
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

  return (
    <aside className="flex w-[308px] shrink-0 flex-col overflow-y-auto border-l border-venus-border bg-venus-surface">
      {/* Header */}
      <div className="shrink-0 border-b border-venus-border p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-venus-gold">
          Dnevni pregled
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-[22px] font-bold leading-tight text-venus-text">
            {title}
          </h2>
          <span className="shrink-0 text-xs text-venus-text-dim">
            {dayAppts.length} {terminWord(dayAppts.length)}
          </span>
        </div>
      </div>

      {/* Lista termina */}
      {dayAppts.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-venus-text-faint">
          Nema termina za izabrani dan
        </p>
      ) : (
        <div className="flex flex-col gap-1 p-3">
          {dayAppts.map((appt) => {
            const color = appt.doctor?.color_hex ?? DEFAULT_COLOR;
            const start = format(parseISO(appt.starts_at), "HH:mm");
            const end = format(parseISO(appt.ends_at), "HH:mm");
            return (
              <button
                key={appt.id}
                type="button"
                onClick={() => openDetail(appt)}
                className="flex items-stretch gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-venus-surface-2"
              >
                <span
                  className="w-[3px] shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div className="flex shrink-0 flex-col leading-tight">
                  <span className="text-sm font-bold text-venus-text">
                    {start}
                  </span>
                  <span className="text-xs text-venus-text-dim">{end}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-venus-text">
                    {patientName(appt)}
                  </p>
                  <p className="truncate text-xs text-venus-text-dim">
                    {appt.service?.name ?? "—"}
                  </p>
                  {showChairTag && appt.chair?.name && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-venus-border px-1.5 py-0.5 text-[10px] text-venus-text-faint">
                      <Armchair size={10} />
                      {appt.chair.name}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}
