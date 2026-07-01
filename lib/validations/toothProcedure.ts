import { z } from "zod";

// Prazan string / undefined → null (opciona polja).
const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optionalText = z.preprocess(
  emptyToNull,
  z.string().trim().min(1).nullable()
);

// FDI opseg (4 kvadranta). null = opšta intervencija (bez konkretnog zuba).
function isFdi(n: number): boolean {
  return (
    (n >= 11 && n <= 18) ||
    (n >= 21 && n <= 28) ||
    (n >= 31 && n <= 38) ||
    (n >= 41 && n <= 48)
  );
}

export const toothProcedureSchema = z.object({
  tooth_number: z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return null;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isNaN(n) ? v : n;
      }
      return v;
    },
    z.number().int().refine(isFdi, "Neispravan FDI broj zuba").nullable()
  ),
  performed_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Unesite datum intervencije"),
  diagnosis: optionalText,
  therapy: optionalText,
  doctor_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  note: optionalText,
});

export type ToothProcedureInput = z.infer<typeof toothProcedureSchema>;
