import { z } from "zod";

export const PATIENT_STATUSES = [
  "nov",
  "aktivan",
  "na_terapiji",
  "zavrseno",
  "neaktivan",
] as const;

export type PatientStatus = (typeof PATIENT_STATUSES)[number];

// Prazan string iz forme tretiramo kao null (opciona polja).
const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optionalText = z.preprocess(
  emptyToNull,
  z.string().trim().min(1).nullable()
);

export const patientSchema = z.object({
  first_name: z.string().trim().min(1, "Unesite ime"),
  last_name: z.string().trim().min(1, "Unesite prezime"),

  // YYYY-MM-DD; opciono; ne sme biti u budućnosti
  date_of_birth: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Neispravan datum")
      .refine((d) => {
        const today = new Date().toISOString().slice(0, 10);
        return d <= today;
      }, "Datum rođenja ne može biti u budućnosti")
      .nullable()
  ),

  gender: z.preprocess(emptyToNull, z.enum(["M", "Ž"]).nullable()),
  phone: optionalText,
  email: z.preprocess(
    emptyToNull,
    z.string().email("Neispravan email").nullable()
  ),
  occupation: optionalText,
  location: optionalText,
  status: z.enum(PATIENT_STATUSES),

  // Ako prazno → auto-generiše se u akciji (next_card_number RPC)
  card_number: optionalText,
});

export type PatientFormInput = z.infer<typeof patientSchema>;

// ── Forma (react-hook-form) ──────────────────────────────────────────────────
// Sva polja su stringovi (prazno = nije uneto) zbog čistog tipovanja sa RHF.
// Na submit se konvertuje u PatientFormInput; server akcija re-validira
// autoritativnom patientSchema.

const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

export const patientFormSchema = z.object({
  first_name: z.string().trim().min(1, "Unesite ime"),
  last_name: z.string().trim().min(1, "Unesite prezime"),
  date_of_birth: z
    .string()
    .refine((d) => d === "" || isValidDate(d), "Neispravan datum")
    .refine(
      (d) => d === "" || d <= new Date().toISOString().slice(0, 10),
      "Datum rođenja ne može biti u budućnosti"
    ),
  gender: z.enum(["", "M", "Ž"]),
  phone: z.string(),
  email: z
    .string()
    .refine(
      (e) => e === "" || z.string().email().safeParse(e).success,
      "Neispravan email"
    ),
  occupation: z.string(),
  location: z.string(),
  status: z.enum(PATIENT_STATUSES),
  card_number: z.string(),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

/** Prazne stringove pretvara u null za slanje akciji. */
export function formValuesToInput(v: PatientFormValues): PatientFormInput {
  const n = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    first_name: v.first_name.trim(),
    last_name: v.last_name.trim(),
    date_of_birth: n(v.date_of_birth),
    gender: v.gender === "" ? null : v.gender,
    phone: n(v.phone),
    email: n(v.email),
    occupation: n(v.occupation),
    location: n(v.location),
    status: v.status,
    card_number: n(v.card_number),
  };
}
