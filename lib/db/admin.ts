import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DoctorAdminItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
  initials: string | null;
  color_hex: string | null;
  specialty: string | null;
  phone: string | null;
  role: "staff" | "admin";
  is_active: boolean;
  email: string | null; // null ako je sintetički (@venus.local) ili ga nema
  is_synthetic_email: boolean;
  has_login: boolean; // doktor je aktivirao nalog (potvrdio email / logovao se)
  invite_pending: boolean; // pozvan, ali još nije aktivirao
}

/**
 * Lista doktora za admin panel. Profili se čitaju preko (cookie) klijenta uz
 * RLS, a email/login-status iz auth.users — koji NIJE u profiles — dohvata se
 * preko service-role admin klijenta i mapira po id-u.
 */
export async function fetchAllDoctors(): Promise<DoctorAdminItem[]> {
  const supabase = await createClient();
  const base = () =>
    supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, initials, color_hex, specialty, phone, role, is_active"
      )
      .in("role", ["staff", "admin"]);

  // Redosled po display_order (admin reorder); fallback na ime ako kolona još
  // ne postoji (migracija 20250106 nije pokrenuta) — kod 42703.
  let { data: profiles, error } = await base()
    .order("display_order", { ascending: true })
    .order("first_name");
  if (error?.code === "42703") {
    ({ data: profiles, error } = await base().order("first_name"));
  }
  if (error) throw error;
  if (!profiles) return [];

  const admin = createAdminClient();
  const { data: list } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const byId = new Map((list?.users ?? []).map((u) => [u.id, u]));

  return profiles.map((p) => {
    const u = byId.get(p.id);
    const email = u?.email ?? null;
    const isSynthetic = !!email && email.endsWith("@venus.local");
    const confirmed = !!u?.email_confirmed_at || !!u?.last_sign_in_at;
    const invited = !!u?.invited_at;
    return {
      ...p,
      role: p.role as "staff" | "admin",
      email: isSynthetic ? null : email,
      is_synthetic_email: isSynthetic,
      has_login: confirmed,
      invite_pending: invited && !confirmed,
    };
  });
}

export interface ChairAdminItem {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

/**
 * Trenutno izabrani AI default doktor (sirov uuid iz app_settings, bez fallback
 * logike — to radi get_ai_default_doctor() RPC za n8n). Vraća null ako nije
 * postavljen ili tabela još ne postoji (migracija 20250107 nije pokrenuta).
 */
export async function fetchAiDefaultDoctorId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ai_default_doctor_id")
    .maybeSingle();
  if (error) return null; // npr. 42P01 (tabela ne postoji) → tretiramo kao "nije postavljeno"
  return data?.value ?? null;
}

export interface PatientAdminItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  note: string | null;
  created_at: string;
}

/** Svi pacijenti (profiles role='patient'). Staff/admin čita preko RLS. */
export async function fetchPatients(): Promise<PatientAdminItem[]> {
  const supabase = await createClient();
  const base = (cols: string) =>
    supabase
      .from("profiles")
      .select(cols)
      .eq("role", "patient")
      .order("first_name", { ascending: true });

  // `note` kolona dolazi migracijom 20250108; fallback ako još ne postoji (42703).
  let { data, error } = await base(
    "id, first_name, last_name, phone, note, created_at"
  );
  if (error?.code === "42703") {
    ({ data, error } = await base(
      "id, first_name, last_name, phone, created_at"
    ));
  }
  if (error) throw error;
  return ((data as unknown as PatientAdminItem[]) ?? []).map((p) => ({
    ...p,
    note: p.note ?? null,
  }));
}

export async function fetchAllChairs(): Promise<ChairAdminItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chairs")
    .select("id, name, display_order, is_active")
    .order("display_order");
  if (error) throw error;
  return data ?? [];
}
