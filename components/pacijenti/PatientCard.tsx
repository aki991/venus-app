"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { PatientRecord, PatientAppointmentItem } from "@/lib/db/admin";
import { PATIENT_STATUS_CONFIG } from "@/lib/constants/patientStatus";
import { STATUS_CONFIG } from "@/lib/constants/appointmentStatus";
import { deletePatientAction } from "@/lib/admin/patient-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PatientFormDialog } from "@/components/pacijenti/PatientFormDialog";
import { Odontogram } from "@/components/odontogram/Odontogram";
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

// Godine iz datuma rođenja (lokalno — da se ne uvozi server-only lib/db/admin).
function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function genderLabel(g: string | null): string {
  if (g === "M") return "Muški";
  if (g === "Ž") return "Ženski";
  return "—";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs uppercase tracking-wider text-venus-text-faint">
        {label}
      </span>
      <span className="text-sm text-venus-text">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-venus-border bg-venus-surface p-5">
      <h2 className="mb-4 font-serif text-lg font-semibold text-venus-text">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PlaceholderSection({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-xl border border-dashed border-venus-border bg-venus-surface/50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-venus-text-dim">
          {title}
        </h2>
        <Badge className="border-transparent bg-zinc-700/40 text-zinc-400">
          Uskoro
        </Badge>
      </div>
      <p className="mt-2 text-sm text-venus-text-faint">{text}</p>
    </section>
  );
}

export function PatientCard({
  patient,
  appointments,
}: {
  patient: PatientRecord;
  appointments: PatientAppointmentItem[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const statusCfg = PATIENT_STATUS_CONFIG[patient.status];
  const age = ageFromDob(patient.date_of_birth);

  function onDelete() {
    startTransition(async () => {
      const res = await deletePatientAction(patient.id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Pacijent obrisan");
      router.push("/pacijenti");
    });
  }

  return (
    <div className="grid gap-5">
      <Link
        href="/pacijenti"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-venus-text-dim transition-colors hover:text-venus-text"
      >
        <ArrowLeft size={15} />
        Nazad na spisak
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-bold text-venus-text">
              {patient.first_name} {patient.last_name}
            </h1>
            <Badge className={cn(statusCfg.badge)}>{statusCfg.label}</Badge>
            {patient.profile_id && (
              <Badge className="gap-1 border-transparent bg-venus-gold/15 text-venus-gold">
                <Smartphone size={12} />
                Mobilna app
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-venus-text-dim">
            Karton #{patient.card_number ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil size={15} />
            Izmeni
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
        </div>
      </div>

      {/* Lični podaci */}
      <Section title="Lični podaci">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Godine" value={age != null ? `${age}` : "—"} />
          <Field label="Datum rođenja" value={formatDate(patient.date_of_birth)} />
          <Field label="Pol" value={genderLabel(patient.gender)} />
          <Field label="Telefon" value={patient.phone ?? "—"} />
          <Field label="Email" value={patient.email ?? "—"} />
          <Field label="Zanimanje" value={patient.occupation ?? "—"} />
          <Field label="Mesto" value={patient.location ?? "—"} />
        </div>
        {patient.notes && (
          <p className="mt-4 border-t border-venus-border pt-3 text-sm text-venus-text-dim">
            📝 {patient.notes}
          </p>
        )}
      </Section>

      {/* Istorija termina */}
      <Section title="Istorija termina">
        {appointments.length === 0 ? (
          <p className="text-sm text-venus-text-faint">
            Nema zabeleženih termina.
          </p>
        ) : (
          <div className="grid gap-2">
            {appointments.map((a) => {
              const cfg = STATUS_CONFIG[a.status];
              const doctor = a.doctor
                ? [a.doctor.first_name, a.doctor.last_name]
                    .filter(Boolean)
                    .join(" ")
                : "—";
              return (
                <div
                  key={a.id}
                  className="grid grid-cols-[1.4fr_1.6fr_1.2fr_auto] items-center gap-3 rounded-lg border border-venus-border px-3 py-2.5"
                >
                  <span className="text-sm text-venus-text">
                    {formatDateTime(a.starts_at)}
                  </span>
                  <span className="truncate text-sm text-venus-text-dim">
                    {a.service?.name ?? "—"}
                  </span>
                  <span className="truncate text-sm text-venus-text-dim">
                    {doctor}
                  </span>
                  <span
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: cfg.color }}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Placeholder sekcije za naredne faze */}
      <PlaceholderSection
        title="Medicinski karton"
        text="Anamneza, alergije i hronična stanja — uskoro."
      />

      <Odontogram patientId={patient.id} />

      <PatientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obrisati pacijenta?</AlertDialogTitle>
            <AlertDialogDescription>
              {patient.first_name} {patient.last_name} će biti trajno obrisan iz
              registra. Ako ima zakazane buduće termine, brisanje neće biti
              dozvoljeno — prvo ih otkažite.
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
