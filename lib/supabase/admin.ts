import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service role klijent - bypasses RLS, koristi se SAMO u Server Actions
// za admin operacije (kreiranje korisnika). NIKAD ne izvoziti na klijent.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
