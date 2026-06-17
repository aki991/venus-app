"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  appointmentSchema,
  type AppointmentFormInput,
} from "@/lib/validations/appointment";
import type { PatientSearchResult } from "@/lib/db/patients";
import { useDoctors } from "@/hooks/useDoctors";
import { useServices } from "@/hooks/useServices";
import { useCreateAppointment } from "@/hooks/useAppointmentMutations";
import type { NewAppointmentDefaults } from "@/stores/appointmentModalStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PatientSelector, type PatientMode } from "./PatientSelector";

/** Sklapa lokalni date (YYYY-MM-DD) + time (HH:mm) u ISO string (UTC). */
export function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

export function addMinutesISO(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function buildDefaults(d: NewAppointmentDefaults | null): AppointmentFormInput {
  return {
    doctor_id: d?.doctor_id ?? "",
    service_id: null,
    date: d?.date ?? "",
    time: d?.time ?? "",
    duration_minutes: 30,
    status: "confirmed",
    notes: null,
    patient_mode: "existing",
    patient_id: null,
    walk_in_name: null,
    walk_in_phone: null,
  };
}

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: NewAppointmentDefaults | null;
}

export function NewAppointmentModal({
  isOpen,
  onClose,
  defaultValues,
}: NewAppointmentModalProps) {
  const { data: doctors } = useDoctors();
  const { data: services } = useServices();
  const createMutation = useCreateAppointment();

  const [selectedPatient, setSelectedPatient] =
    useState<PatientSearchResult | null>(null);

  const form = useForm<AppointmentFormInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: buildDefaults(defaultValues ?? null),
  });

  // Reset forme svaki put kad se modal otvori sa novim defaultima (npr. iz slota).
  useEffect(() => {
    if (isOpen) {
      form.reset(buildDefaults(defaultValues ?? null));
      setSelectedPatient(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultValues]);

  const patientMode = form.watch("patient_mode");

  async function onSubmit(values: AppointmentFormInput) {
    const startsAt = toISO(values.date, values.time);
    const endsAt = addMinutesISO(startsAt, values.duration_minutes);

    try {
      await createMutation.mutateAsync({
        doctor_id: values.doctor_id,
        service_id: values.service_id,
        starts_at: startsAt,
        ends_at: endsAt,
        status: values.status,
        notes: values.notes,
        patient_id:
          values.patient_mode === "existing" ? values.patient_id : null,
        walk_in_name:
          values.patient_mode === "walk_in" ? values.walk_in_name : null,
        walk_in_phone:
          values.patient_mode === "walk_in" ? values.walk_in_phone : null,
      });
      toast.success("Termin zakazan");
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === "OVERLAP") {
        toast.error("Termin se preklapa sa drugim terminom ovog doktora");
      } else {
        toast.error("Greška pri zakazivanju termina");
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Novi termin</DialogTitle>
          <DialogDescription>
            Zakažite novi termin za pacijenta ili walk-in.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
          >
            {/* Pacijent */}
            <FormField
              control={form.control}
              name="patient_id"
              render={() => (
                <FormItem>
                  <FormLabel>Pacijent</FormLabel>
                  <PatientSelector
                    mode={patientMode}
                    onModeChange={(m: PatientMode) => {
                      form.setValue("patient_mode", m);
                      form.setValue("patient_id", null);
                      setSelectedPatient(null);
                    }}
                    patientId={form.watch("patient_id")}
                    onPatientChange={(p) => {
                      setSelectedPatient(p);
                      form.setValue("patient_id", p?.id ?? null, {
                        shouldValidate: true,
                      });
                    }}
                    walkInName={form.watch("walk_in_name") ?? ""}
                    walkInPhone={form.watch("walk_in_phone") ?? ""}
                    onWalkInNameChange={(v) =>
                      form.setValue("walk_in_name", v, { shouldValidate: true })
                    }
                    onWalkInPhoneChange={(v) =>
                      form.setValue("walk_in_phone", v, { shouldValidate: true })
                    }
                    selectedLabel={
                      selectedPatient
                        ? [
                            selectedPatient.first_name,
                            selectedPatient.last_name,
                          ]
                            .filter(Boolean)
                            .join(" ") || "Bez imena"
                        : null
                    }
                    selectedSublabel={selectedPatient?.phone ?? null}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Doktor */}
            <FormField
              control={form.control}
              name="doctor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doktor</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Izaberite doktora" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(doctors ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {[d.first_name, d.last_name]
                            .filter(Boolean)
                            .join(" ") || "Bez imena"}
                          {d.specialty ? ` — ${d.specialty}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Usluga */}
            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usluga</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={(val) => {
                      field.onChange(val);
                      const svc = (services ?? []).find((s) => s.id === val);
                      if (svc) {
                        form.setValue(
                          "duration_minutes",
                          svc.duration_minutes
                        );
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Izaberite uslugu (opciono)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(services ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} · {s.duration_minutes} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Datum / Vreme / Trajanje */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vreme</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trajanje (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      className="flex gap-4"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <RadioGroupItem value="confirmed" />
                        Potvrđen
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <RadioGroupItem value="pending" />
                        Na čekanju
                      </label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Napomena */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Napomena</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Opciono..."
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Otkaži
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Zakaži termin
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
