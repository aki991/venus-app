"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

/**
 * Login: email/password samo za staff (admin/doctor/assistant).
 * Pacijenti se izloguju i dobiju poruku da koriste mobilnu app.
 */
export async function loginAction(
  input: LoginInput
): Promise<{ error: string } | void> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Pogrešan email ili šifra" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  // NE leak-uj raw Supabase grešku
  if (error || !data.user) {
    return { error: "Pogrešan email ili šifra" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Nalog nije pronađen. Kontaktirajte administratora." };
  }

  if (profile.role === "patient") {
    await supabase.auth.signOut();
    return {
      error:
        "Ova aplikacija je namenjena samo zaposlenima ordinacije. Pacijenti koriste mobilnu Venus aplikaciju.",
    };
  }

  revalidatePath("/", "layout");
  // redirect baca NEXT_REDIRECT — mora biti IZVAN try/catch
  redirect("/kalendar");
}

/**
 * Logout: ubije sesiju i vrati na login.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Forgot password: pošalje reset email.
 * UVEK vraća success (i kad email ne postoji) — sprečava email enumeration.
 */
export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<{ success: true }> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: true };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  });

  return { success: true };
}

/**
 * Update password: postavi novu šifru (nakon recovery sesije iz reset linka).
 * Na uspeh redirect na /login sa success flag-om u query param-u.
 */
export async function updatePasswordAction(
  input: ResetPasswordInput
): Promise<{ error: string } | void> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: "Nije moguće promeniti šifru. Link je možda istekao ili nevažeći.",
    };
  }

  revalidatePath("/", "layout");
  // redirect IZVAN try/catch — poruka se prenosi preko query param-a
  redirect("/login?reset=success");
}
