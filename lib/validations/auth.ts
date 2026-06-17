import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email nije validan"),
  // Min 1, NE min 8 — postojeći nalozi mogu imati kraće šifre
  password: z.string().min(1, "Unesite šifru"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email nije validan"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Šifra mora imati najmanje 8 karaktera")
      .regex(/[A-Z]/, "Šifra mora imati bar jedno veliko slovo")
      .regex(/[0-9]/, "Šifra mora imati bar jedan broj"),
    confirmPassword: z.string().min(1, "Potvrdite šifru"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Šifre se ne poklapaju",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
