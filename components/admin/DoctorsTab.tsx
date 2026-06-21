"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { parseISO, format } from "date-fns";
import { srLatn } from "date-fns/locale";
import { CalendarDays, GripVertical, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { DoctorAdminItem } from "@/lib/db/admin";
import type { DoctorAppointmentItem } from "@/lib/db/doctor-appointments";
import { useDoctorAppointments } from "@/hooks/useDoctorAppointments";
import { STATUS_CONFIG } from "@/lib/constants/appointmentStatus";
import type { CreateDoctorInput, UpdateDoctorInput } from "@/lib/admin/types";
import {
  createDoctorAction,
  deleteDoctorAction,
  inviteDoctorAction,
  reorderDoctorsAction,
  setDoctorActiveAction,
  updateDoctorAction,
} from "@/lib/admin/doctor-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DOCTOR_COLORS = [
  "#e5c45f",
  "#8a9a6b",
  "#6b9080",
  "#a07f9e",
  "#c98a5e",
  "#7f9ea0",
  "#b07f7f",
  "#9a8ac9",
];

function fullName(d: DoctorAdminItem): string {
  return [d.first_name, d.last_name].filter(Boolean).join(" ") || "Bez imena";
}

export function DoctorsTab({ doctors }: { doctors: DoctorAdminItem[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DoctorAdminItem | null>(null);
  const [, startTransition] = useTransition();

  // Optimistic redosled SAMO tokom/posle drag-a; briše se na null čim server
  // (router.refresh → novi props) potvrdi isti redosled. (Isti princip kao usluge.)
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);

  const ordered = useMemo(() => {
    if (!dragOrder) return doctors;
    const map = new Map(doctors.map((d) => [d.id, d]));
    const seen = new Set(dragOrder);
    const out = dragOrder
      .map((id) => map.get(id))
      .filter(Boolean) as DoctorAdminItem[];
    for (const d of doctors) if (!seen.has(d.id)) out.push(d);
    return out;
  }, [doctors, dragOrder]);

  useEffect(() => {
    if (
      dragOrder &&
      dragOrder.length === doctors.length &&
      dragOrder.every((id, i) => doctors[i]?.id === id)
    ) {
      setDragOrder(null);
    }
  }, [doctors, dragOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = ordered.map((d) => d.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(ids, oldIndex, newIndex);
    setDragOrder(newOrder); // optimistic
    startTransition(async () => {
      const res = await reorderDoctorsAction(newOrder);
      if ("error" in res) {
        toast.error(res.error);
        setDragOrder(null); // revert na server redosled
      } else {
        router.refresh();
        // Osveži klijent-side cache (sidebar "Tim ordinacije" + Novi termin dropdown)
        queryClient.invalidateQueries({ queryKey: ["doctors"] });
      }
    });
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(d: DoctorAdminItem) {
    setEditing(d);
    setDialogOpen(true);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus size={16} />
          Dodaj doktora
        </Button>
      </div>

      <div className="grid gap-2">
        {doctors.length === 0 ? (
          <p className="py-8 text-center text-sm text-venus-text-faint">
            Još nema doktora.
          </p>
        ) : (
          <DndContext
            id="doctors-reorder"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={ordered.map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              {ordered.map((d) => (
                <SortableDoctorRow
                  key={d.id}
                  doctor={d}
                  onEdit={() => openEdit(d)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <DoctorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}

/** Sortable wrapper — daje drag handle + transform stil. */
function SortableDoctorRow({
  doctor,
  onEdit,
}: {
  doctor: DoctorAdminItem;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: doctor.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Tokom drag-a 0.6; van drag-a `undefined` da className opacity-60
    // (neaktivan doktor) i dalje važi.
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 10 : undefined,
  };

  const handle = (
    <button
      type="button"
      className="shrink-0 cursor-grab touch-none text-venus-text-faint hover:text-venus-text active:cursor-grabbing"
      aria-label="Prevuci za redosled"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={18} />
    </button>
  );

  return (
    <DoctorRow
      doctor={doctor}
      onEdit={onEdit}
      handle={handle}
      innerRef={setNodeRef}
      style={style}
    />
  );
}

function DoctorRow({
  doctor,
  onEdit,
  handle,
  innerRef,
  style,
}: {
  doctor: DoctorAdminItem;
  onEdit: () => void;
  handle?: React.ReactNode;
  innerRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);

  function run(action: () => Promise<{ success: true } | { error: string }>) {
    startTransition(async () => {
      const res = await action();
      if ("error" in res) toast.error(res.error);
      else {
        toast.success("Sačuvano");
        router.refresh();
        // Osveži klijent-side cache (Tim ordinacije, Novi termin dropdown)
        queryClient.invalidateQueries({ queryKey: ["doctors"] });
      }
    });
  }

  const canInvite =
    !doctor.has_login && !doctor.is_synthetic_email && !!doctor.email;

  return (
    <div
      ref={innerRef}
      style={style}
      className={cn(
        "flex items-center gap-4 rounded-xl border border-venus-border bg-venus-canvas p-3",
        !doctor.is_active && "opacity-60"
      )}
    >
      {handle}

      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#0d0d0d]"
        style={{ backgroundColor: doctor.color_hex ?? "#e5c45f" }}
      >
        {doctor.initials ?? "—"}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-venus-text">
            {fullName(doctor)}
          </span>
          {doctor.role === "admin" && (
            <Badge className="border-transparent bg-venus-gold/20 text-venus-gold">
              Admin
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-venus-text-dim">
          {doctor.specialty || "—"}
          {doctor.email ? ` · ${doctor.email}` : " · nema email"}
        </p>
      </div>

      {/* Status login-a */}
      {doctor.has_login ? (
        <Badge className="border-transparent bg-emerald-500/15 text-emerald-500">
          Ima login
        </Badge>
      ) : doctor.invite_pending ? (
        <Badge className="border-transparent bg-amber-500/15 text-amber-500">
          Pozvan
        </Badge>
      ) : (
        <Badge className="border-transparent bg-zinc-500/15 text-zinc-400">
          Bez login-a
        </Badge>
      )}

      {/* Pošalji pozivnicu */}
      {canInvite && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => inviteDoctorAction(doctor.id))}
        >
          <Mail size={14} />
          Pozovi
        </Button>
      )}

      {/* Aktivan toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={doctor.is_active}
          disabled={pending}
          onCheckedChange={(v) =>
            run(() => setDoctorActiveAction(doctor.id, v))
          }
          aria-label="Aktivan"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowAppointments(true)}
        aria-label="Termini doktora"
      >
        <CalendarDays size={16} />
      </Button>

      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Izmeni">
        <Pencil size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="text-venus-danger"
        onClick={() => setConfirmDelete(true)}
        aria-label="Obriši"
      >
        <Trash2 size={16} />
      </Button>

      <DoctorAppointmentsDialog
        open={showAppointments}
        onOpenChange={setShowAppointments}
        doctorId={doctor.id}
        doctorName={fullName(doctor)}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obrisati doktora?</AlertDialogTitle>
            <AlertDialogDescription>
              {fullName(doctor)} će biti trajno obrisan. Moguće je samo ako doktor
              nema aktivnih (budućih, neotkazanih) termina — prošli i otkazani ne
              smetaju i ostaju u istoriji bez doktora. U suprotnom ga deaktivirajte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => run(() => deleteDoctorAction(doctor.id))}
            >
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function appointmentPatientLabel(a: DoctorAppointmentItem): string {
  if (a.patient) {
    return (
      [a.patient.first_name, a.patient.last_name].filter(Boolean).join(" ") ||
      "Bez imena"
    );
  }
  return a.walk_in_name || "Walk-in";
}

function AppointmentStatusBadge({
  status,
}: {
  status: DoctorAppointmentItem["status"];
}) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge
      className="shrink-0 gap-1 border-transparent"
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

/** Read-only lista SVIH termina doktora (otkazani/protekli uključeni). */
function DoctorAppointmentsDialog({
  open,
  onOpenChange,
  doctorId,
  doctorName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctorId: string;
  doctorName: string;
}) {
  const { data, isLoading, error } = useDoctorAppointments(doctorId, open);
  const items = data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Termini — {doctorName}</DialogTitle>
          <DialogDescription>
            Svi termini vezani za ovog doktora, uključujući otkazane i protekle.
            Doktor se može obrisati ako nema aktivnih (budućih, neotkazanih)
            termina — prošli i otkazani ne blokiraju brisanje.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-venus-text-faint">
            Učitavanje…
          </p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-venus-danger">
            Greška pri učitavanju termina.
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-venus-text-faint">
            Doktor nema nijedan termin — može se obrisati.
          </p>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm text-venus-text-dim">
              Ukupno termina: <span className="font-semibold">{items.length}</span>
            </p>
            {items.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-venus-border bg-venus-canvas p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-venus-text">
                    {appointmentPatientLabel(a)}
                  </div>
                  <div className="truncate text-xs text-venus-text-dim">
                    {format(parseISO(a.starts_at), "EEE, d. MMM yyyy. HH:mm", {
                      locale: srLatn,
                    })}
                    {a.chair?.name ? ` · ${a.chair.name}` : ""}
                  </div>
                </div>
                <AppointmentStatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DoctorDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: DoctorAdminItem | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [initials, setInitials] = useState("");
  const [manualInitials, setManualInitials] = useState(false);
  const [colorHex, setColorHex] = useState(DOCTOR_COLORS[0]);
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [noEmail, setNoEmail] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);

  // Inicijalizuj polja iz `editing`-a svaki put kad se dialog otvori.
  function reset() {
    setFirstName(editing?.first_name ?? "");
    setLastName(editing?.last_name ?? "");
    setInitials(editing?.initials ?? "");
    setManualInitials(!!editing?.initials);
    setColorHex(editing?.color_hex ?? DOCTOR_COLORS[0]);
    setSpecialty(editing?.specialty ?? "");
    setPhone(editing?.phone ?? "");
    setEmail("");
    setNoEmail(false);
    setSendInvite(false);
  }

  // onOpenChange se NE okida pri programskom otvaranju (open prop iz "Izmeni"),
  // pa polja punimo kroz effect — kad se dialog otvori ili promeni koji doktor.
  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  function autoInitials(f: string, l: string) {
    return ((f[0] ?? "") + (l[0] ?? "")).toUpperCase();
  }

  function onSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Unesite ime i prezime");
      return;
    }
    startTransition(async () => {
      if (editing) {
        const input: UpdateDoctorInput = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          initials: initials.trim() || autoInitials(firstName, lastName),
          colorHex,
          specialty: specialty.trim(),
          phone: phone.trim(),
        };
        const res = await updateDoctorAction(editing.id, input);
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        toast.success("Doktor izmenjen");
      } else {
        const input: CreateDoctorInput = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          initials: initials.trim() || autoInitials(firstName, lastName),
          colorHex,
          specialty: specialty.trim(),
          phone: phone.trim(),
          email: email.trim(),
          noEmail,
          sendInvite: sendInvite && !noEmail,
        };
        const res = await createDoctorAction(input);
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        toast.success("Doktor dodat");
      }
      onOpenChange(false);
      router.refresh();
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Izmeni doktora" : "Dodaj doktora"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Izmena podataka doktora. Email se ne menja ovde."
              : "Novi doktor. Login je opcioni (pozivnica se šalje na email)."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Ime</Label>
              <Input
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (!manualInitials)
                    setInitials(autoInitials(e.target.value, lastName));
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Prezime</Label>
              <Input
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (!manualInitials)
                    setInitials(autoInitials(firstName, e.target.value));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Inicijali</Label>
              <Input
                value={initials}
                maxLength={4}
                onChange={(e) => {
                  setManualInitials(true);
                  setInitials(e.target.value.toUpperCase());
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Specijalnost</Label>
            <Input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="npr. Ortodoncija"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Boja</Label>
            <div className="flex flex-wrap gap-2">
              {DOCTOR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorHex(c)}
                  aria-label={`Boja ${c}`}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    colorHex === c
                      ? "scale-110 border-venus-text"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Email + login opcije — samo pri kreiranju */}
          {!editing && (
            <>
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  disabled={noEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doktor@ordinacija.rs"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-venus-text-dim">
                <Switch checked={noEmail} onCheckedChange={setNoEmail} />
                Doktor nema email (sintetički nalog, bez login-a)
              </label>
              {!noEmail && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-venus-text-dim">
                  <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
                  Pošalji pozivnicu za pristup aplikaciji
                </label>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Otkaži
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {editing ? "Sačuvaj" : "Dodaj doktora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
