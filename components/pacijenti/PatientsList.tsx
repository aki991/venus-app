"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Search, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import type { PatientAdminItem } from "@/lib/db/admin";
import {
  createPatientAction,
  deletePatientAction,
  updatePatientAction,
} from "@/lib/admin/patient-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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

type SortBy = "first" | "last";

function fullName(p: PatientAdminItem): string {
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "Bez imena";
}

export function PatientsList({ patients }: { patients: PatientAdminItem[] }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("first");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PatientAdminItem | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? patients.filter((p) =>
          [p.first_name, p.last_name, p.phone, p.note]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : patients;
    const key = sortBy === "first" ? "first_name" : "last_name";
    return [...filtered].sort((a, b) =>
      (a[key] ?? "").localeCompare(b[key] ?? "", "sr")
    );
  }, [patients, query, sortBy]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(p: PatientAdminItem) {
    setEditing(p);
    setDialogOpen(true);
  }

  return (
    <div>
      {/* Toolbar: pretraga + sortiranje + dodaj */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-venus-text-faint"
          />
          <Input
            className="pl-9"
            placeholder="Pretraži po imenu, telefonu ili napomeni..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first">Sortiraj: Ime</SelectItem>
            <SelectItem value="last">Sortiraj: Prezime</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={openCreate}>
          <Plus size={16} />
          Dodaj pacijenta
        </Button>
      </div>

      {/* Lista */}
      <div className="grid gap-2">
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-venus-text-faint">
            {query.trim() ? "Nema rezultata." : "Još nema pacijenata."}
          </p>
        ) : (
          visible.map((p) => (
            <PatientRow key={p.id} patient={p} onEdit={() => openEdit(p)} />
          ))
        )}
      </div>

      <PatientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}

function PatientRow({
  patient,
  onEdit,
}: {
  patient: PatientAdminItem;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function onDelete() {
    startTransition(async () => {
      const res = await deletePatientAction(patient.id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Pacijent obrisan");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-venus-border bg-venus-canvas p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-venus-surface-2 text-venus-text-dim">
        <User size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-venus-text">
          {fullName(patient)}
        </div>
        <div className="truncate text-xs text-venus-text-dim">
          {patient.phone || "—"}
        </div>
        {patient.note && (
          <p className="mt-0.5 truncate text-xs text-venus-text-faint">
            📝 {patient.note}
          </p>
        )}
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
            <AlertDialogTitle>Obrisati pacijenta?</AlertDialogTitle>
            <AlertDialogDescription>
              {fullName(patient)} će biti trajno obrisan, zajedno sa svim njegovim
              prošlim i otkazanim terminima. Ako pacijent ima zakazane buduće
              termine, brisanje neće biti dozvoljeno — prvo ih otkažite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PatientDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: PatientAdminItem | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setFirstName(editing?.first_name ?? "");
      setLastName(editing?.last_name ?? "");
      setPhone(editing?.phone ?? "");
      setNote(editing?.note ?? "");
    }
  }, [open, editing]);

  function onSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Unesite ime i prezime");
      return;
    }
    startTransition(async () => {
      const payload = { firstName, lastName, phone, note };
      const res = editing
        ? await updatePatientAction(editing.id, payload)
        : await createPatientAction(payload);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Pacijent izmenjen" : "Pacijent dodat");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Izmeni pacijenta" : "Dodaj pacijenta"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
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
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="npr. 06x xxx xxxx"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Napomena (opciono)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="npr. Alergičan na penicilin; dolazi sa majkom..."
            />
          </div>
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
            {pending && <Loader2 className="animate-spin" />}
            {editing ? "Sačuvaj" : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
