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
import { appointmentErrorMessage } from "@/lib/db/appointments";
import { createPatientAction } from "@/lib/admin/patient-actions";
import { minimalPatientInput } from "@/lib/validations/patient";
import { useDoctors } from "@/hooks/useDoctors";
import { useServices } from "@/hooks/useServices";
import { useChairs } from "@/hooks/useChairs";
import { useCreateAppointment } from "@/hooks/useAppointmentMutations";
import type { NewAppointmentDefaults } from "@/stores/appointmentModalStore";
import { useKalendarStore } from "@/stores/kalendarStore";
import {
  combineDateTime,
  getTimeSlots,
  todayDateStr,
} from "@/lib/constants/workingHours";
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

function buildDefaults(
  d: NewAppointmentDefaults | null,
  chairId: string
): AppointmentFormInput {
  return {
    doctor_id: d?.doctor_id ?? "",
    service_id: null,
    chair_id: chairId,
    date: d?.date ?? "",
    time: d?.time ?? "",
    duration_minutes: 30,
    status: "confirmed",
    notes: null,
    patient_mode: "existing",
    patient_id: null,
    walk_in_first_name: null,
    walk_in_last_name: null,
    walk_in_phone: null,
    add_to_registry: false,
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
  const { data: chairs } = useChairs();
  const selectedChairId = useKalendarStore((s) => s.selectedChairId);
  const createMutation = useCreateAppointment();

  // Default stolica = trenutno izabrana u kalendaru (ili prva dostupna).
  const defaultChairId = selectedChairId ?? chairs?.[0]?.id ?? "";

  const [selectedPatient, setSelectedPatient] =
    useState<PatientSearchResult | null>(null);

  const form = useForm<AppointmentFormInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: buildDefaults(defaultValues ?? null, defaultChairId),
  });

  // Reset forme svaki put kad se modal otvori sa novim defaultima (npr. iz slota).
  useEffect(() => {
    if (isOpen) {
      form.reset(buildDefaults(defaultValues ?? null, defaultChairId));
      setSelectedPatient(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultValues]);

  const patientMode = form.watch("patient_mode");

  // Zabrana prošlosti (web/osoblje, BEZ 1h pravila — to je mobilna app).
  // min na date inputu sprečava biranje prošlih datuma; kad je izabran DANAS
  // prošli time slotovi se disable-uju u dropdownu. Budući datum → sve dostupno.
  const now = new Date();
  const today = todayDateStr(now);
  const selectedDate = form.watch("date");
  const isToday = selectedDate === today;

  async function onSubmit(values: AppointmentFormInput) {
    const startsAt = toISO(values.date, values.time);
    const endsAt = addMinutesISO(startsAt, values.duration_minutes);

    const isExisting = values.patient_mode === "existing";

    try {
      // Identitet pacijenta na terminu.
      let patientRecordId: string | null = null;
      let patientId: string | null = null;
      let walkInName: string | null = null;
      let walkInPhone: string | null = null;

      if (isExisting) {
        // Registar: patient_record_id = patients.id (UVEK), patient_id =
        // profile_id (samo ako pacijent ima mobilni nalog, inače null).
        patientRecordId = selectedPatient?.id ?? null;
        patientId = selectedPatient?.profile_id ?? null;
      } else if (values.add_to_registry) {
        // Walk-in + "Dodaj u registar": prvo kreiraj pacijenta, pa veži termin
        // preko patient_record_id (bez walk_in polja).
        const created = await createPatientAction(
          minimalPatientInput(
            values.walk_in_first_name ?? "",
            values.walk_in_last_name ?? "",
            values.walk_in_phone ?? null
          )
        );
        if ("error" in created) {
          toast.error(created.error);
          return;
        }
        patientRecordId = created.patientId;
      } else {
        // Čist walk-in: spoji ime + prezime u postojeću walk_in_name kolonu.
        walkInName = [values.walk_in_first_name, values.walk_in_last_name]
          .map((s) => s?.trim())
          .filter(Boolean)
          .join(" ");
        walkInPhone = values.walk_in_phone;
      }

      await createMutation.mutateAsync({
        doctor_id: values.doctor_id,
        service_id: values.service_id,
        chair_id: values.chair_id,
        starts_at: startsAt,
        ends_at: endsAt,
        status: values.status,
        notes: values.notes,
        patient_record_id: patientRecordId,
        patient_id: patientId,
        walk_in_name: walkInName,
        walk_in_phone: walkInPhone,
      });
      toast.success("Termin zakazan");
      onClose();
    } catch (err) {
      toast.error(appointmentErrorMessage(err, "Greška pri zakazivanju termina"));
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
                    walkInFirstName={form.watch("walk_in_first_name") ?? ""}
                    walkInLastName={form.watch("walk_in_last_name") ?? ""}
                    walkInPhone={form.watch("walk_in_phone") ?? ""}
                    onWalkInFirstNameChange={(v) =>
                      form.setValue("walk_in_first_name", v, {
                        shouldValidate: true,
                      })
                    }
                    onWalkInLastNameChange={(v) =>
                      form.setValue("walk_in_last_name", v, {
                        shouldValidate: true,
                      })
                    }
                    onWalkInPhoneChange={(v) =>
                      form.setValue("walk_in_phone", v, { shouldValidate: true })
                    }
                    addToRegistry={form.watch("add_to_registry")}
                    onAddToRegistryChange={(v) =>
                      form.setValue("add_to_registry", v)
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

            {/* Stolica — prikazuje se samo ako ima više od jedne (inače auto) */}
            {(chairs?.length ?? 0) > 1 && (
              <FormField
                control={form.control}
                name="chair_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stolica</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite stolicu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(chairs ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                      <Input type="date" min={today} {...field} />
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
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vreme" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getTimeSlots().map((t) => {
                          // Samo kad je izabran DANAS gledamo prošlost; za
                          // budući datum su svi slotovi dostupni.
                          const isPast =
                            isToday &&
                            combineDateTime(selectedDate, t).getTime() <
                              now.getTime();
                          return (
                            <SelectItem key={t} value={t} disabled={isPast}>
                              {t}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
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
