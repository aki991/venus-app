import { z } from "zod";

// Tag liste (alergije/stanja/lekovi/upozorenja): trim, izbaci prazne, dedup
// (case-insensitive, čuva prvi zapis). Non-array ulaz → prazan niz.
const tagList = z.preprocess(
  (v) => (Array.isArray(v) ? v : []),
  z
    .array(z.string().trim().min(1))
    .transform((arr) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const t of arr) {
        const key = t.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(t);
        }
      }
      return out;
    })
);

// Slobodan tekst — prazno/whitespace → null.
const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().min(1).nullable()
);

// Autoritativna šema (server) za medicinski karton.
export const patientMedicalSchema = z.object({
  allergies: tagList,
  chronic_conditions: tagList,
  medications: tagList,
  critical_warnings: tagList,
  anamnesis: optionalText,
  notes: optionalText,
  smoker: z.boolean(),
  pregnant: z.boolean(),
});

export type PatientMedicalInput = z.infer<typeof patientMedicalSchema>;
