import "server-only";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Mora odgovarati 'user_role' enum-u u bazi: patient | staff | admin.
// "Doktor" i "asistent" su oboje role='staff' (razlika je popunjena 'specialty' kolona).
export type UserRole = "patient" | "staff" | "admin";

export interface UserWithProfile {
  id: string;
  email: string | null;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
}

/**
 * Vraća trenutnog usera + njegov profile (sa role).
 * Vraća null ako nije logovan.
 */
export async function getCurrentUser(): Promise<UserWithProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    role: profile.role as UserRole,
    first_name: profile.first_name,
    last_name: profile.last_name,
  };
}

/**
 * Za dashboard rute - zahteva staff role.
 * Redirect-uje pacijente na /patient-not-allowed, ne-logovane na /login.
 */
export async function requireStaff(): Promise<UserWithProfile> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "patient") redirect("/patient-not-allowed");
  return user;
}
