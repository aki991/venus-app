"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  usePatientMedical,
  usePatientMedicalMutation,
} from "@/hooks/usePatientMedical";
import type { PatientMedical } from "@/lib/db/patientMedical";
import type { PatientMedicalInput } from "@/lib/validations/patientMedical";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Brzi predlozi za tag-input (custom unos i dalje moguć).
const COMMON_ALLERGIES = ["Penicilin", "Lidokain", "Aspirin", "Ibuprofen", "Lateks"];
const COMMON_CONDITIONS = [
  "Dijabetes",
  "Hipertenzija",
  "Srčane bolesti",
  "Astma",
  "Epilepsija",
];

function toInput(m: PatientMedical | null): PatientMedicalInput {
  return {
    allergies: m?.allergies ?? [],
    chronic_conditions: m?.chronic_conditions ?? [],
    medications: m?.medications ?? [],
    critical_warnings: m?.critical_warnings ?? [],
    anamnesis: m?.anamnesis ?? null,
    notes: m?.notes ?? null,
    smoker: m?.smoker ?? false,
    pregnant: m?.pregnant ?? false,
  };
}

/** Red za prikaz: labela + tagovi (ili fallback tekst). */
function DisplayTags({
  label,
  tags,
  danger = false,
  empty = "—",
}: {
  label: string;
  tags: string[];
  danger?: boolean;
  empty?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs uppercase tracking-wider text-venus-text-faint">
        {label}
      </span>
      {tags.length === 0 ? (
        <span className="text-sm text-venus-text-dim">{empty}</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge
              key={t}
              className={cn(
                "border-transparent",
                danger
                  ? "bg-venus-danger/15 text-venus-danger"
                  : "bg-venus-surface-2 text-venus-text-dim"
              )}
            >
              {t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function MedicalCard({ patientId }: { patientId: string }) {
  const { data: medical, isLoading } = usePatientMedical(patientId);
  const mutation = usePatientMedicalMutation(patientId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PatientMedicalInput>(() => toInput(null));

  // Otvaranje editora → napuni iz trenutnih (keširanih) podataka.
  useEffect(() => {
    if (open) setForm(toInput(medical ?? null));
  }, [open, medical]);

  function save() {
    mutation.mutate(form, {
      onSuccess: () => {
        toast.success("Medicinski karton sačuvan");
        setOpen(false);
      },
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Greška pri čuvanju"),
    });
  }

  const m = medical ?? null;

  return (
    <section className="rounded-xl border border-venus-border bg-venus-canvas p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-venus-text">
          Medicinski karton
        </h2>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Pencil size={14} />
          Izmeni
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-venus-text-faint">Učitavanje…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <DisplayTags
            label="Alergije"
            tags={m?.allergies ?? []}
            danger
            empty="Nema poznatih alergija"
          />
          <DisplayTags
            label="Kritična upozorenja"
            tags={m?.critical_warnings ?? []}
            danger
          />
          <DisplayTags label="Hronična stanja" tags={m?.chronic_conditions ?? []} />
          <DisplayTags label="Lekovi" tags={m?.medications ?? []} />

          <div className="grid gap-1.5">
            <span className="text-xs uppercase tracking-wider text-venus-text-faint">
              Faktori
            </span>
            <div className="flex flex-wrap gap-1.5">
              {m?.smoker && (
                <Badge className="border-transparent bg-venus-surface-2 text-venus-text-dim">
                  Pušač
                </Badge>
              )}
              {m?.pregnant && (
                <Badge className="border-transparent bg-venus-surface-2 text-venus-text-dim">
                  Trudnoća
                </Badge>
              )}
              {!m?.smoker && !m?.pregnant && (
                <span className="text-sm text-venus-text-dim">—</span>
              )}
            </div>
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-wider text-venus-text-faint">
              Anamneza
            </span>
            <p className="whitespace-pre-wrap text-sm text-venus-text-dim">
              {m?.anamnesis || "Nije uneto"}
            </p>
          </div>

          {m?.notes && (
            <div className="grid gap-1.5 sm:col-span-2">
              <span className="text-xs uppercase tracking-wider text-venus-text-faint">
                Napomene
              </span>
              <p className="whitespace-pre-wrap text-sm text-venus-text-dim">
                {m.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Medicinski karton</DialogTitle>
            <DialogDescription>
              Alergije, hronična stanja, lekovi i anamneza pacijenta.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Alergije</Label>
              <TagInput
                value={form.allergies}
                danger
                suggestions={COMMON_ALLERGIES}
                placeholder="Dodaj alergiju + Enter"
                onChange={(allergies) => setForm((f) => ({ ...f, allergies }))}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Kritična upozorenja</Label>
              <TagInput
                value={form.critical_warnings}
                danger
                placeholder="npr. Antikoagulantna terapija + Enter"
                onChange={(critical_warnings) =>
                  setForm((f) => ({ ...f, critical_warnings }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Hronična stanja</Label>
              <TagInput
                value={form.chronic_conditions}
                suggestions={COMMON_CONDITIONS}
                placeholder="Dodaj stanje + Enter"
                onChange={(chronic_conditions) =>
                  setForm((f) => ({ ...f, chronic_conditions }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Lekovi</Label>
              <TagInput
                value={form.medications}
                placeholder="Dodaj lek + Enter"
                onChange={(medications) => setForm((f) => ({ ...f, medications }))}
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-venus-text">
                <Switch
                  checked={form.smoker}
                  onCheckedChange={(smoker) => setForm((f) => ({ ...f, smoker }))}
                />
                Pušač
              </label>
              <label className="flex items-center gap-2 text-sm text-venus-text">
                <Switch
                  checked={form.pregnant}
                  onCheckedChange={(pregnant) =>
                    setForm((f) => ({ ...f, pregnant }))
                  }
                />
                Trudnoća
              </label>
            </div>

            <div className="grid gap-1.5">
              <Label>Anamneza</Label>
              <Textarea
                rows={4}
                value={form.anamnesis ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, anamnesis: e.target.value }))
                }
                placeholder="Opšte zdravstveno stanje, ranije intervencije, reakcije…"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Napomene</Label>
              <Textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Dodatne napomene"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Otkaži
            </Button>
            <Button type="button" onClick={save} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="animate-spin" />}
              Sačuvaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
