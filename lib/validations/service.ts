import { z } from "zod";

export const serviceFormSchema = z.object({
  name: z.string().min(1, "Unesite naziv usluge"),
  category: z.string().min(1, "Unesite kategoriju"),
  description: z.string().nullable(),
  duration_minutes: z
    .number({ message: "Unesite trajanje" })
    .int("Trajanje mora biti ceo broj")
    .min(5, "Minimum 5 minuta")
    .max(480, "Maksimum 480 minuta"),
  // Cena je opciona — prazno polje znači "bez cene" (NULL u bazi).
  price: z
    .number({ message: "Cena mora biti broj" })
    .min(0, "Cena ne može biti negativna")
    .nullable(),
});

export type ServiceFormInput = z.infer<typeof serviceFormSchema>;
