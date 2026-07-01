"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { parseISO, format } from "date-fns";
import { srLatn } from "date-fns/locale";
import {
  AlertTriangle,
  Loader2,
  MessageCircleQuestion,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/lib/db/appointments";
import { appointmentErrorMessage, resolvePatient } from "@/lib/db/appointments";
import { convertWalkInToPatientAction } from "@/lib/admin/patient-actions";
import { useDoctors } from "@/hooks/useDoctors";
import { useServices } from "@/hooks/useServices";
import { useChairs } from "@/hooks/useChairs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  STATUS_CONFIG,
  effectiveStatus,
} from "@/lib/constants/appointmentStatus";
import {
  fitsWithinWorkingHours,
  getTimeSlots,
  isWorkingDay,
} from "@/lib/constants/workingHours";
import { addMinutesISO, toISO } from "./NewAppointmentModal";

type AppointmentStatus = AppointmentWithRelations["status"];

// Statusi koje doktor sme ručno da postavi u modalu. "cancelled" je izostavljen
// namerno — otkazivanje ide kroz poseban tab (upisuje cancelled_at/cancelled_by).
const MANUAL_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "no_show",
] as const;
type ManualStatus = (typeof MANUAL_STATUSES)[number];

type Mode = "view" | "edit" | "cancel";

function patientDisplay(appt: AppointmentWithRelations): {
  name: string;
  phone: string | null;
} {
  // Registar → legacy profil → walk-in (resolvePatient); "—" ako nema nijednog.
  const r = resolvePatient(appt);
  return { name: r.name || "—", phone: r.phone };
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge
      className="gap-1 border-transparent"
      style={{
        backgroundColor: `color-mix(in srgb, ${cfg.color} 18%, transparent)`,
        color: cfg.color,
      }}
    >
      <Icon size={12} />
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
          <ViewMode appointment={appointment} onClose={onClose} />
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

function ViewMode({
  appointment,
  onClose,
}: {
  appointment: AppointmentWithRelations;
  onClose: () => void;
}) {
  const patient = patientDisplay(appointment);
  const doctorName =
    [appointment.doctor?.first_name, appointment.doctor?.last_name]
      .filter(Boolean)
      .join(" ") || "—";
  const start = parseISO(appointment.starts_at);
  const end = parseISO(appointment.ends_at);

  // Walk-in (ima ime, nije iz registra) može da se doda u registar pacijenata.
  const isWalkIn = !!appointment.walk_in_name && !appointment.patient_record_id;
  const [converting, setConverting] = useState(false);

  // Ručna izmena statusa (npr. doktor potvrđuje AI termin: pending → confirmed).
  // Otkazivanje ide kroz poseban "Otkazivanje" tab (postavlja cancelled_at/by),
  // pa ga ovde NE nudimo. "completed" je dostupan i ručno (uz automatski prikaz
  // proteklih potvrđenih kao završenih preko effectiveStatus).
  const updateMutation = useUpdateAppointment();

  async function changeStatus(next: ManualStatus) {
    if (next === appointment.status) return;
    try {
      await updateMutation.mutateAsync({
        id: appointment.id,
        input: { status: next },
      });
      toast.success(`Status: ${STATUS_CONFIG[next].label}`);
      onClose();
    } catch (err) {
      toast.error(appointmentErrorMessage(err, "Greška pri izmeni statusa"));
    }
  }

  return (
    <div>
      {appointment.awaiting_response && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400">
          <MessageCircleQuestion size={16} className="shrink-0" />
          Čeka odgovor pacijenta (WhatsApp)
        </div>
      )}

      {isWalkIn && (
        <div className="mb-2 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConverting(true)}
          >
            <UserPlus size={14} />
            Dodaj u registar
          </Button>
        </div>
      )}

      {isWalkIn && converting && (
        <ConvertWalkInForm
          appointment={appointment}
          onCancel={() => setConverting(false)}
          onDone={onClose}
        />
      )}

      <div className="divide-y divide-venus-line">
      <InfoRow label="Ime">{patient.name}</InfoRow>
      <InfoRow label="Broj">{patient.phone ?? "—"}</InfoRow>
      <InfoRow label="Doktor">{doctorName}</InfoRow>
      <InfoRow label="Stolica">{appointment.chair?.name ?? "—"}</InfoRow>
      <InfoRow label="Usluga">{appointment.service?.name ?? "—"}</InfoRow>
      <InfoRow label="Datum">
        {format(start, "EEEE, d. MMMM yyyy.", { locale: srLatn })}
      </InfoRow>
      <InfoRow label="Vreme">
        {format(start, "HH:mm")} – {format(end, "HH:mm")}
      </InfoRow>
      <InfoRow label="Status">
        <div className="flex items-center gap-2">
          <StatusBadge
            status={effectiveStatus(appointment.status, appointment.ends_at)}
          />
          <Select
            value={appointment.status}
            onValueChange={(v) => changeStatus(v as ManualStatus)}
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="h-8 w-[150px]">
              {updateMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <SelectValue placeholder="Promeni status" />
              )}
            </SelectTrigger>
            <SelectContent>
              {MANUAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </InfoRow>
        {appointment.notes && (
          <div className="py-2">
            <p className="mb-1 text-sm text-venus-text-dim">Napomene</p>
            <p className="text-sm">{appointment.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inline forma za konverziju walk-in termina u pacijenta iz registra.
 * Ime/Prezime se predlažu deljenjem walk_in_name na prvi razmak, editabilno.
 */
function ConvertWalkInForm({
  appointment,
  onCancel,
  onDone,
}: {
  appointment: AppointmentWithRelations;
  onCancel: () => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();

  const raw = (appointment.walk_in_name ?? "").trim();
  const space = raw.indexOf(" ");
  const [firstName, setFirstName] = useState(
    space === -1 ? raw : raw.slice(0, space)
  );
  const [lastName, setLastName] = useState(
    space === -1 ? "" : raw.slice(space + 1).trim()
  );
  const [phone, setPhone] = useState(appointment.walk_in_phone ?? "");
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Unesite ime i prezime");
      return;
    }
    setSaving(true);
    const res = await convertWalkInToPatientAction(appointment.id, {
      firstName,
      lastName,
      phone: phone.trim() || null,
    });
    setSaving(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    // Kalendar koristi react-query keš — osveži da termin pokaže pacijenta.
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    toast.success("Pacijent dodat u registar");
    onDone();
  }

  return (
    <div className="mb-3 grid gap-3 rounded-md border border-venus-border bg-venus-surface-2 p-3">
      <p className="text-sm font-medium">Dodaj pacijenta u registar</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Ime</Label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Prezime</Label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Telefon</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          Otkaži
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <UserPlus size={14} />}
          Sačuvaj
        </Button>
      </div>
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
  const { data: chairs } = useChairs();
  const updateMutation = useUpdateAppointment();

  const start = parseISO(appointment.starts_at);
  const end = parseISO(appointment.ends_at);
  const initialDuration = Math.max(
    Math.round((end.getTime() - start.getTime()) / 60_000),
    5
  );

  const [doctorId, setDoctorId] = useState(appointment.doctor_id ?? "");
  const [chairId, setChairId] = useState(appointment.chair_id ?? "");
  const [serviceId, setServiceId] = useState<string | null>(
    appointment.service?.id ?? null
  );
  const [date, setDate] = useState(format(start, "yyyy-MM-dd"));
  const [time, setTime] = useState(format(start, "HH:mm"));
  const [duration, setDuration] = useState(initialDuration);
  const [notes, setNotes] = useState(appointment.notes ?? "");

  async function onSave() {
    if (!doctorId) {
      toast.error("Izaberite doktora");
      return;
    }
    if (!chairId) {
      toast.error("Izaberite stolicu");
      return;
    }
    if (!date || !time) {
      toast.error("Izaberite datum i vreme");
      return;
    }
    if (!isWorkingDay(date)) {
      toast.error("Ordinacija ne radi vikendom");
      return;
    }
    if (!fitsWithinWorkingHours(time, duration)) {
      toast.error("Termin bi se završio nakon radnog vremena (15:00)");
      return;
    }
    const startsAt = toISO(date, time);
    const endsAt = addMinutesISO(startsAt, duration);

    try {
      await updateMutation.mutateAsync({
        id: appointment.id,
        input: {
          doctor_id: doctorId,
          chair_id: chairId,
          service_id: serviceId,
          starts_at: startsAt,
          ends_at: endsAt,
          notes: notes || null,
        },
      });
      toast.success("Termin izmenjen");
      onDone();
    } catch (err) {
      toast.error(appointmentErrorMessage(err, "Greška pri izmeni termina"));
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

      {(chairs?.length ?? 0) > 1 && (
        <div className="grid gap-1.5">
          <Label>Stolica</Label>
          <Select value={chairId || undefined} onValueChange={setChairId}>
            <SelectTrigger>
              <SelectValue placeholder="Izaberite stolicu" />
            </SelectTrigger>
            <SelectContent>
              {(chairs ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
          <Select value={time || undefined} onValueChange={setTime}>
            <SelectTrigger>
              <SelectValue placeholder="Vreme" />
            </SelectTrigger>
            <SelectContent>
              {getTimeSlots().map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
