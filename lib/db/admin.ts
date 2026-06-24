import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PatientStatus } from "@/lib/validations/patient";

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

// Pun zapis pacijenta iz `patients` registra (P1 model).
export interface PatientRecord {
  id: string;
  card_number: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  location: string | null;
  status: PatientStatus;
  profile_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Red u spisku — PatientRecord + izračunate godine.
export interface PatientListItem extends PatientRecord {
  age: number | null;
}

const PATIENT_COLUMNS =
  "id, card_number, first_name, last_name, date_of_birth, gender, phone, email, occupation, location, status, profile_id, notes, created_at, updated_at";

/** Godine iz datuma rođenja (YYYY-MM-DD). null ako nema datuma. */
export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Spisak pacijenata iz `patients` registra. Sort po prezimenu pa imenu. Ako
 * search ima >= 2 znaka, filtrira po imenu/prezimenu/telefonu/broju kartona.
 */
export async function fetchPatients(
  search?: string
): Promise<PatientListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("patients")
    .select(PATIENT_COLUMNS)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  const q = search?.trim() ?? "";
  if (q.length >= 2) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,card_number.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data as unknown as PatientRecord[]) ?? []).map((p) => ({
    ...p,
    age: ageFromDob(p.date_of_birth),
  }));
}

/** Jedan pacijent po id-u (sva polja). null ako ne postoji. */
export async function fetchPatientById(
  id: string
): Promise<PatientRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PatientRecord) ?? null;
}

export interface PatientAppointmentItem {
  id: string;
  starts_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  service: { name: string } | null;
  doctor: { first_name: string | null; last_name: string | null } | null;
}

/** Istorija termina pacijenta (preko patient_record_id), najnoviji prvo. */
export async function fetchPatientAppointments(
  patientId: string
): Promise<PatientAppointmentItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id, starts_at, status,
      service:services(name),
      doctor:profiles!appointments_doctor_id_fkey(first_name, last_name)
    `
    )
    .eq("patient_record_id", patientId)
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as PatientAppointmentItem[]) ?? [];
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
