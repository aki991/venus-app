import { z } from "zod";

export const appointmentSchema = z
  .object({
    doctor_id: z.string().uuid("Izaberite doktora"),
    service_id: z.string().uuid().nullable(),
    date: z.string().min(1, "Izaberite datum"), // YYYY-MM-DD
    time: z.string().min(1, "Izaberite vreme"), // HH:mm
    duration_minutes: z.number().min(5).max(480),
    status: z.enum(["pending", "confirmed"]),
    notes: z.string().nullable(),
    // pacijent mode
    patient_mode: z.enum(["existing", "walk_in"]),
    patient_id: z.string().uuid().nullable(),
    walk_in_name: z.string().nullable(),
    walk_in_phone: z.string().nullable(),
  })
  .refine(
    (data) => {
      if (data.patient_mode === "existing") return !!data.patient_id;
      return !!data.walk_in_name && !!data.walk_in_phone;
    },
    {
      message: "Izaberite pacijenta ili unesite ime i telefon",
      path: ["patient_id"],
    }
  );

export type AppointmentFormInput = z.infer<typeof appointmentSchema>;
