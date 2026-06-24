"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  patientFormSchema,
  formValuesToInput,
  PATIENT_STATUSES,
  type PatientFormValues,
} from "@/lib/validations/patient";
import { PATIENT_STATUS_CONFIG } from "@/lib/constants/patientStatus";
import { useCreatePatient, useUpdatePatient } from "@/hooks/usePatients";
import type { Patient } from "@/lib/db/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const GENDER_NONE = "_none";

function defaultsFrom(patient: Patient | null): PatientFormValues {
  return {
    first_name: patient?.first_name ?? "",
    last_name: patient?.last_name ?? "",
    date_of_birth: patient?.date_of_birth ?? "",
    gender: (patient?.gender as "M" | "Ž" | null) ?? "",
    phone: patient?.phone ?? "",
    email: patient?.email ?? "",
    occupation: patient?.occupation ?? "",
    location: patient?.location ?? "",
    status: patient?.status ?? "nov",
    card_number: patient?.card_number ?? "",
  };
}

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient?: Patient | null;
}) {
  const router = useRouter();
  const editing = !!patient;
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const pending = createPatient.isPending || updatePatient.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: defaultsFrom(patient ?? null),
  });

  // Re-inicijalizuj polja svaki put kad se dialog otvori (novi/izmena).
  useEffect(() => {
    if (open) reset(defaultsFrom(patient ?? null));
  }, [open, patient, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const input = formValuesToInput(values);

    if (editing && patient) {
      const res = await updatePatient.mutateAsync({ id: patient.id, input });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Pacijent izmenjen");
      onOpenChange(false);
      router.refresh();
    } else {
      const res = await createPatient.mutateAsync(input);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Pacijent dodat");
      onOpenChange(false);
      // Lepši UX: otvori karton novog pacijenta.
      router.push(`/dnevnik/${res.patientId}`);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Izmeni pacijenta" : "Novi pacijent"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Izmena ličnih podataka pacijenta."
              : "Unesite lične podatke. Broj kartona se dodeljuje automatski ako ga ostavite prazno."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Ime</Label>
              <Input {...register("first_name")} />
              {errors.first_name && (
                <p className="text-xs text-venus-danger">
                  {errors.first_name.message}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Prezime</Label>
              <Input {...register("last_name")} />
              {errors.last_name && (
                <p className="text-xs text-venus-danger">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Datum rođenja</Label>
              <Input type="date" {...register("date_of_birth")} />
              {errors.date_of_birth && (
                <p className="text-xs text-venus-danger">
                  {errors.date_of_birth.message}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Pol</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select
                    value={field.value === "" ? GENDER_NONE : field.value}
                    onValueChange={(v) =>
                      field.onChange(v === GENDER_NONE ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GENDER_NONE}>Nepoznato</SelectItem>
                      <SelectItem value="M">Muški</SelectItem>
                      <SelectItem value="Ž">Ženski</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Telefon</Label>
              <Input {...register("phone")} placeholder="06x xxx xxxx" />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-venus-danger">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Zanimanje</Label>
              <Input {...register("occupation")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Mesto</Label>
              <Input {...register("location")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PATIENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {PATIENT_STATUS_CONFIG[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Broj kartona</Label>
              <Input
                {...register("card_number")}
                placeholder="automatski ako prazno"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Otkaži
            </Button>
            <Button type="submit" disabled={pending}>
              {editing ? "Sačuvaj" : "Dodaj pacijenta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
