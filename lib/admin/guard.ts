import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Proverava da je trenutni (cookie) korisnik admin. Baca grešku ako nije.
 * Koristi se na početku SVAKE admin Server Action-e PRE bilo kakve
 * privilegovane (service-role) operacije.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niste prijavljeni");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Nemate dozvolu za ovu akciju");
  return user;
}
