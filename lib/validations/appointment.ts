import { z } from "zod";

import {
  combineDateTime,
  fitsWithinWorkingHours,
  getTimeSlots,
  isWorkingDay,
} from "@/lib/constants/workingHours";

export const appointmentSchema = z
  .object({
    doctor_id: z.string().uuid("Izaberite doktora"),
    service_id: z.string().uuid().nullable(),
    chair_id: z.string().uuid("Izaberite stolicu"),
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
  )
  // Datum mora biti radni dan (Pon–Pet)
  .refine((data) => !data.date || isWorkingDay(data.date), {
    message: "Ordinacija ne radi vikendom",
    path: ["date"],
  })
  // Vreme mora biti u okviru radnog vremena (09:00–14:30)
  .refine((data) => !data.time || getTimeSlots().includes(data.time), {
    message: "Vreme mora biti u okviru radnog vremena (09:00–14:30)",
    path: ["time"],
  })
  // Termin (vreme + trajanje) ne sme da pređe kraj radnog vremena (15:00)
  .refine(
    (data) =>
      !data.time || fitsWithinWorkingHours(data.time, data.duration_minutes),
    {
      message: "Termin bi se završio nakon radnog vremena (15:00)",
      path: ["time"],
    }
  )
  // Termin ne sme da bude u prošlosti (web/osoblje). NEMA 1h limita —
  // to je pravilo mobilne app za pacijente. Dozvoljeno je sve od sada nadalje.
  .refine(
    (data) => {
      if (!data.date || !data.time) return true; // prazno pokrivaju druge provere
      return combineDateTime(data.date, data.time).getTime() >= Date.now();
    },
    {
      message: "Ne možete zakazati termin u prošlosti",
      path: ["time"],
    }
  );

export type AppointmentFormInput = z.infer<typeof appointmentSchema>;
