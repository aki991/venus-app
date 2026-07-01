"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  useToothProcedures,
  useProcedureMutations,
} from "@/hooks/useToothProcedures";
import { useDoctors } from "@/hooks/useDoctors";
import type { ToothProcedure } from "@/lib/db/toothProcedures";
import type { ToothProcedureInput } from "@/lib/validations/toothProcedure";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const GRID = "grid grid-cols-[100px_50px_1.3fr_1.3fr_1fr_1.4fr_auto] items-center gap-3";
const DOCTOR_NONE = "_none";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// "YYYY-MM-DD" → "dd.mm.yyyy" (bez TZ konverzije).
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}.${m}.${y}` : iso;
}

function doctorName(p: ToothProcedure): string {
  if (!p.doctor) return "—";
  const n = [p.doctor.first_name, p.doctor.last_name].filter(Boolean).join(" ");
  return n || "—";
}

interface FormState {
  performed_on: string;
  tooth_number: string;
  diagnosis: string;
  therapy: string;
  doctor_id: string;
  note: string;
}

function emptyForm(): FormState {
  return {
    performed_on: today(),
    tooth_number: "",
    diagnosis: "",
    therapy: "",
    doctor_id: "",
    note: "",
  };
}

function formFrom(p: ToothProcedure): FormState {
  return {
    performed_on: p.performed_on,
    tooth_number: p.tooth_number != null ? String(p.tooth_number) : "",
    diagnosis: p.diagnosis ?? "",
    therapy: p.therapy ?? "",
    doctor_id: p.doctor_id ?? "",
    note: p.note ?? "",
  };
}

function toInput(f: FormState): ToothProcedureInput {
  const raw = f.tooth_number.trim();
  const toothNum = raw === "" ? null : Number(raw);
  return {
    performed_on: f.performed_on,
    tooth_number: toothNum !== null && Number.isNaN(toothNum) ? null : toothNum,
    diagnosis: f.diagnosis.trim() === "" ? null : f.diagnosis.trim(),
    therapy: f.therapy.trim() === "" ? null : f.therapy.trim(),
    doctor_id: f.doctor_id === "" ? null : f.doctor_id,
    note: f.note.trim() === "" ? null : f.note.trim(),
  };
}

export function ProcedureProtocol({ patientId }: { patientId: string }) {
  const { data: procedures = [], isLoading } = useToothProcedures(patientId);
  const { data: doctors = [] } = useDoctors();
  const { create, update, remove } = useProcedureMutations(patientId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ToothProcedure | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Otvaranje forme → napuni (edit iz reda, dodavanje iz praznog).
  useEffect(() => {
    if (formOpen) setForm(editing ? formFrom(editing) : emptyForm());
  }, [formOpen, editing]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: ToothProcedure) {
    setEditing(p);
    setFormOpen(true);
  }

  function save() {
    const input = toInput(form);
    const onError = (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Greška");

    if (editing) {
      update.mutate(
        { id: editing.id, input },
        {
          onSuccess: () => {
            toast.success("Intervencija izmenjena");
            setFormOpen(false);
          },
          onError,
        }
      );
    } else {
      create.mutate(input, {
        onSuccess: () => {
          toast.success("Intervencija dodata");
          setFormOpen(false);
        },
        onError,
      });
    }
  }

  function onDelete() {
    if (!confirmId) return;
    remove.mutate(confirmId, {
      onSuccess: () => {
        toast.success("Intervencija obrisana");
        setConfirmId(null);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Greška"),
    });
  }

  const saving = create.isPending || update.isPending;

  return (
    <section className="rounded-xl border border-venus-border bg-venus-canvas p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-venus-text">
          Protokol intervencija
        </h2>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus size={14} />
          Dodaj intervenciju
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-venus-text-faint">Učitavanje…</p>
      ) : procedures.length === 0 ? (
        <p className="text-sm text-venus-text-faint">
          Nema zabeleženih intervencija.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            {/* Zaglavlje */}
            <div
              className={`${GRID} border-b border-venus-border px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-venus-text-dim`}
            >
              <span>Datum</span>
              <span>Zub</span>
              <span>Dijagnoza</span>
              <span>Terapija</span>
              <span>Doktor</span>
              <span>Napomena</span>
              <span className="text-right">Akcije</span>
            </div>

            {procedures.map((p) => (
              <div
                key={p.id}
                className={`${GRID} border-b border-venus-border px-2 py-2.5 last:border-b-0`}
              >
                <span className="flex items-center gap-1.5 text-sm text-venus-text">
                  {fmtDate(p.performed_on)}
                </span>
                <span className="text-sm text-venus-text-dim">
                  {p.tooth_number ?? "—"}
                </span>
                <span className="truncate text-sm text-venus-text-dim">
                  {p.diagnosis ?? "—"}
                </span>
                <span className="truncate text-sm text-venus-text-dim">
                  {p.therapy ?? "—"}
                </span>
                <span className="truncate text-sm text-venus-text-dim">
                  {doctorName(p)}
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm text-venus-text-dim">
                    {p.note ?? "—"}
                  </span>
                  {p.source === "auto" && (
                    <Badge className="shrink-0 border-transparent bg-venus-surface-2 text-[10px] text-venus-text-faint">
                      iz odontograma
                    </Badge>
                  )}
                </span>
                <span className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(p)}
                    aria-label="Izmeni"
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-venus-danger"
                    onClick={() => setConfirmId(p.id)}
                    aria-label="Obriši"
                  >
                    <Trash2 size={15} />
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dodaj / izmeni dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Izmeni intervenciju" : "Nova intervencija"}
            </DialogTitle>
            <DialogDescription>
              Datum, zub (opciono), dijagnoza, terapija, doktor i napomena.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={form.performed_on}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, performed_on: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Zub (FDI, opciono)</Label>
                <Input
                  inputMode="numeric"
                  placeholder="npr. 21"
                  value={form.tooth_number}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tooth_number: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Dijagnoza</Label>
              <Input
                value={form.diagnosis}
                onChange={(e) =>
                  setForm((f) => ({ ...f, diagnosis: e.target.value }))
                }
                placeholder="npr. Karijes"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Terapija</Label>
              <Input
                value={form.therapy}
                onChange={(e) =>
                  setForm((f) => ({ ...f, therapy: e.target.value }))
                }
                placeholder="npr. Ispun / plomba"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Doktor</Label>
              <Select
                value={form.doctor_id === "" ? DOCTOR_NONE : form.doctor_id}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    doctor_id: v === DOCTOR_NONE ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Izaberi doktora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DOCTOR_NONE}>—</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {[d.first_name, d.last_name].filter(Boolean).join(" ") ||
                        "Bez imena"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Napomena</Label>
              <Textarea
                rows={3}
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Otkaži
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {editing ? "Sačuvaj" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Potvrda brisanja */}
      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(v) => !v && setConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obrisati intervenciju?</AlertDialogTitle>
            <AlertDialogDescription>
              Zapis iz protokola će biti trajno obrisan. Ova akcija se ne može
              opozvati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={remove.isPending}>
              {remove.isPending && <Loader2 className="animate-spin" />}
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
