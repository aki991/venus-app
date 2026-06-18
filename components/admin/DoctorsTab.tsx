"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { DoctorAdminItem } from "@/lib/db/admin";
import type { CreateDoctorInput, UpdateDoctorInput } from "@/lib/admin/types";
import {
  createDoctorAction,
  deleteDoctorAction,
  inviteDoctorAction,
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DoctorAdminItem | null>(null);

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
        {doctors.length === 0 && (
          <p className="py-8 text-center text-sm text-venus-text-faint">
            Još nema doktora.
          </p>
        )}
        {doctors.map((d) => (
          <DoctorRow key={d.id} doctor={d} onEdit={() => openEdit(d)} />
        ))}
      </div>

      <DoctorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}

function DoctorRow({
  doctor,
  onEdit,
}: {
  doctor: DoctorAdminItem;
  onEdit: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      className={cn(
        "flex items-center gap-4 rounded-xl border border-venus-border bg-venus-surface p-3",
        !doctor.is_active && "opacity-60"
      )}
    >
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

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obrisati doktora?</AlertDialogTitle>
            <AlertDialogDescription>
              {fullName(doctor)} će biti trajno obrisan. Ovo je moguće samo ako
              doktor nema nijedan termin — u suprotnom ga deaktivirajte.
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

  // Inicijalizuj polja svaki put kad se dialog otvori.
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
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) reset();
        onOpenChange(v);
      }}
    >
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
