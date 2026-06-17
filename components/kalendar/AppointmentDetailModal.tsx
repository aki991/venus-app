"use client";

import { useEffect, useState } from "react";
import { parseISO, format } from "date-fns";
import { sr } from "date-fns/locale";
import { AlertTriangle, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/lib/db/appointments";
import { useDoctors } from "@/hooks/useDoctors";
import { useServices } from "@/hooks/useServices";
import {
  useCancelAppointment,
  useUpdateAppointment,
} from "@/hooks/useAppointmentMutations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addMinutesISO, toISO } from "./NewAppointmentModal";

type AppointmentStatus = AppointmentWithRelations["status"];

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Na čekanju",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  confirmed: {
    label: "Potvrđen",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  cancelled: {
    label: "Otkazan",
    className: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
  completed: {
    label: "Završen",
    className: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  no_show: {
    label: "Nije se pojavio",
    className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  },
};

const EDIT_STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: "confirmed", label: "Potvrđen" },
  { value: "pending", label: "Na čekanju" },
  { value: "completed", label: "Završen" },
  { value: "no_show", label: "Nije se pojavio" },
];

type Mode = "view" | "edit" | "cancel";

function patientDisplay(appt: AppointmentWithRelations): {
  name: string;
  phone: string | null;
} {
  if (appt.patient) {
    return {
      name:
        [appt.patient.first_name, appt.patient.last_name]
          .filter(Boolean)
          .join(" ") || "Bez imena",
      phone: null,
    };
  }
  return { name: appt.walk_in_name ?? "Walk-in", phone: appt.walk_in_phone };
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge className={cn("border-transparent", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-venus-text-dim">{label}</span>
      <span className="text-right text-sm font-medium">{children}</span>
    </div>
  );
}

interface AppointmentDetailModalProps {
  appointment: AppointmentWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AppointmentDetailModal({
  appointment,
  isOpen,
  onClose,
}: AppointmentDetailModalProps) {
  const [mode, setMode] = useState<Mode>("view");

  // Reset na "view" svaki put kad se otvori novi termin.
  useEffect(() => {
    if (isOpen) setMode("view");
  }, [isOpen, appointment?.id]);

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Detalji termina</DialogTitle>
          <DialogDescription>
            {mode === "view" && "Pregled informacija o terminu."}
            {mode === "edit" && "Izmena termina."}
            {mode === "cancel" && "Otkazivanje termina."}
          </DialogDescription>
        </DialogHeader>

        {/* Tab dugmad */}
        <div className="flex gap-2 rounded-lg bg-venus-surface-2 p-1">
          {(
            [
              { key: "view", label: "Pregled" },
              { key: "edit", label: "Izmeni" },
              { key: "cancel", label: "Otkazivanje" },
            ] as { key: Mode; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMode(t.key)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === t.key
                  ? "bg-venus-surface text-venus-text shadow-xs"
                  : "text-venus-text-dim hover:text-venus-text"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === "view" && (
          <ViewMode appointment={appointment} />
        )}
        {mode === "edit" && (
          <EditMode
            appointment={appointment}
            onDone={onClose}
            onCancelEdit={() => setMode("view")}
          />
        )}
        {mode === "cancel" && (
          <CancelMode appointment={appointment} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ViewMode({ appointment }: { appointment: AppointmentWithRelations }) {
  const patient = patientDisplay(appointment);
  const doctorName =
    [appointment.doctor?.first_name, appointment.doctor?.last_name]
      .filter(Boolean)
      .join(" ") || "—";
  const start = parseISO(appointment.starts_at);
  const end = parseISO(appointment.ends_at);

  return (
    <div className="divide-y divide-venus-line">
      <InfoRow label="Pacijent">
        <div className="leading-tight">
          <div>{patient.name}</div>
          {patient.phone && (
            <div className="text-xs text-venus-text-dim">{patient.phone}</div>
          )}
          {!appointment.patient && (
            <div className="text-xs text-venus-text-faint">Walk-in</div>
          )}
        </div>
      </InfoRow>
      <InfoRow label="Doktor">{doctorName}</InfoRow>
      <InfoRow label="Usluga">{appointment.service?.name ?? "—"}</InfoRow>
      <InfoRow label="Datum">
        {format(start, "EEEE, d. MMMM yyyy.", { locale: sr })}
      </InfoRow>
      <InfoRow label="Vreme">
        {format(start, "HH:mm")} – {format(end, "HH:mm")}
      </InfoRow>
      <InfoRow label="Status">
        <StatusBadge status={appointment.status} />
      </InfoRow>
      {appointment.notes && (
        <div className="py-2">
          <p className="mb-1 text-sm text-venus-text-dim">Napomene</p>
          <p className="text-sm">{appointment.notes}</p>
        </div>
      )}
    </div>
  );
}

function EditMode({
  appointment,
  onDone,
  onCancelEdit,
}: {
  appointment: AppointmentWithRelations;
  onDone: () => void;
  onCancelEdit: () => void;
}) {
  const { data: doctors } = useDoctors();
  const { data: services } = useServices();
  const updateMutation = useUpdateAppointment();

  const start = parseISO(appointment.starts_at);
  const end = parseISO(appointment.ends_at);
  const initialDuration = Math.max(
    Math.round((end.getTime() - start.getTime()) / 60_000),
    5
  );

  const [doctorId, setDoctorId] = useState(appointment.doctor_id ?? "");
  const [serviceId, setServiceId] = useState<string | null>(
    appointment.service?.id ?? null
  );
  const [date, setDate] = useState(format(start, "yyyy-MM-dd"));
  const [time, setTime] = useState(format(start, "HH:mm"));
  const [duration, setDuration] = useState(initialDuration);
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [notes, setNotes] = useState(appointment.notes ?? "");

  async function onSave() {
    if (!doctorId) {
      toast.error("Izaberite doktora");
      return;
    }
    if (!date || !time) {
      toast.error("Izaberite datum i vreme");
      return;
    }
    const startsAt = toISO(date, time);
    const endsAt = addMinutesISO(startsAt, duration);

    try {
      await updateMutation.mutateAsync({
        id: appointment.id,
        input: {
          doctor_id: doctorId,
          service_id: serviceId,
          starts_at: startsAt,
          ends_at: endsAt,
          status: status as
            | "pending"
            | "confirmed"
            | "completed"
            | "no_show",
          notes: notes || null,
        },
      });
      toast.success("Termin izmenjen");
      onDone();
    } catch (err) {
      if (err instanceof Error && err.message === "OVERLAP") {
        toast.error("Termin se preklapa sa drugim terminom ovog doktora");
      } else {
        toast.error("Greška pri izmeni termina");
      }
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label>Doktor</Label>
        <Select value={doctorId || undefined} onValueChange={setDoctorId}>
          <SelectTrigger>
            <SelectValue placeholder="Izaberite doktora" />
          </SelectTrigger>
          <SelectContent>
            {(doctors ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {[d.first_name, d.last_name].filter(Boolean).join(" ") ||
                  "Bez imena"}
                {d.specialty ? ` — ${d.specialty}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label>Usluga</Label>
        <Select
          value={serviceId ?? undefined}
          onValueChange={(val) => {
            setServiceId(val);
            const svc = (services ?? []).find((s) => s.id === val);
            if (svc) setDuration(svc.duration_minutes);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Izaberite uslugu" />
          </SelectTrigger>
          <SelectContent>
            {(services ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} · {s.duration_minutes} min
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label>Datum</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Vreme</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Trajanje (min)</Label>
          <Input
            type="number"
            min={5}
            max={480}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>Status</Label>
        <RadioGroup
          className="grid grid-cols-2 gap-2"
          value={status}
          onValueChange={(v) => setStatus(v as AppointmentStatus)}
        >
          {EDIT_STATUSES.map((s) => (
            <label
              key={s.value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <RadioGroupItem value={s.value} />
              {s.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid gap-1.5">
        <Label>Napomena</Label>
        <Textarea
          placeholder="Opciono..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelEdit}>
          Nazad
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Pencil />
          )}
          Sačuvaj izmene
        </Button>
      </DialogFooter>
    </div>
  );
}

function CancelMode({
  appointment,
  onDone,
}: {
  appointment: AppointmentWithRelations;
  onDone: () => void;
}) {
  const cancelMutation = useCancelAppointment();
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);

  async function onCancel() {
    try {
      await cancelMutation.mutateAsync({
        id: appointment.id,
        reason: reason.trim() || null,
      });
      toast.success("Termin otkazan");
      onDone();
    } catch {
      toast.error("Greška pri otkazivanju termina");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3 rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>
          Otkazivanje termina je trajno. Termin više neće biti prikazan u
          kalendaru.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label>Razlog otkazivanja (opciono)</Label>
        <Textarea
          placeholder="npr. Pacijent je otkazao..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <DialogFooter>
        {!confirm ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirm(true)}
          >
            <Trash2 />
            Otkaži termin
          </Button>
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-sm text-venus-text-dim">Da li ste sigurni?</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirm(false)}
              >
                Ne
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Da, otkaži
              </Button>
            </div>
          </div>
        )}
      </DialogFooter>
    </div>
  );
}
