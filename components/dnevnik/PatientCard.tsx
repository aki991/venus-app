"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePatient, usePatientAppointments } from "@/hooks/usePatients";
import { ageFromDob } from "@/lib/db/patients";
import { PATIENT_STATUS_CONFIG } from "@/lib/constants/patientStatus";
import { STATUS_CONFIG } from "@/lib/constants/appointmentStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PatientFormDialog } from "@/components/dnevnik/PatientFormDialog";

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

function PlaceholderSection({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
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

export function PatientCard({ patientId }: { patientId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: patient, isLoading } = usePatient(patientId);
  const { data: appointments } = usePatientAppointments(patientId);

  if (isLoading) {
    return (
      <p className="py-10 text-center text-sm text-venus-text-faint">
        Učitavanje…
      </p>
    );
  }

  if (!patient) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-venus-text-faint">Pacijent nije pronađen.</p>
        <Link
          href="/dnevnik"
          className="mt-3 inline-block text-sm text-venus-gold hover:underline"
        >
          ← Nazad na listu
        </Link>
      </div>
    );
  }

  const statusCfg = PATIENT_STATUS_CONFIG[patient.status];
  const age = ageFromDob(patient.date_of_birth);

  return (
    <div className="grid gap-5">
      <Link
        href="/dnevnik"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-venus-text-dim transition-colors hover:text-venus-text"
      >
        <ArrowLeft size={15} />
        Nazad na listu
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
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil size={15} />
          Izmeni
        </Button>
      </div>

      {/* Lični podaci */}
      <Section title="Lični podaci">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Godine" value={age != null ? `${age}` : "—"} />
          <Field label="Pol" value={genderLabel(patient.gender)} />
          <Field
            label="Datum rođenja"
            value={formatDate(patient.date_of_birth)}
          />
          <Field label="Telefon" value={patient.phone ?? "—"} />
          <Field label="Email" value={patient.email ?? "—"} />
          <Field label="Zanimanje" value={patient.occupation ?? "—"} />
          <Field label="Mesto" value={patient.location ?? "—"} />
        </div>
      </Section>

      {/* Istorija termina */}
      <Section title="Istorija termina">
        {!appointments || appointments.length === 0 ? (
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
      <PlaceholderSection
        title="Odontogram"
        text="Grafički prikaz zuba — uskoro."
      />

      <PatientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
      />
    </div>
  );
}
