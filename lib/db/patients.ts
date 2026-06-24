import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { PatientStatus } from "@/lib/validations/patient";

// ── Mobilni pacijenti (profiles) — koristi PatientSelector u kalendaru ───────
// NE menjati: ovo pretražuje profiles (mobilni nalozi), ne patients registar.

export interface PatientSearchResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

export async function searchPatients(
  query: string
): Promise<PatientSearchResult[]> {
  if (query.trim().length < 2) return [];
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone")
    .eq("role", "patient")
    .or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`
    )
    .limit(10);

  if (error) throw error;
  return data ?? [];
}

// ── Registar pacijenata (patients tabela) — Dnevnik (D1) ─────────────────────
// Sve preko browser klijenta koji nosi staff sesiju; RLS "staff_full_patients"
// dozvoljava pristup samo osoblju (is_staff()).

export interface Patient {
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

// Red u listi pacijenata — Patient + izračunate godine.
export interface PatientListItem extends Patient {
  age: number | null;
}

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

const PATIENT_COLUMNS =
  "id, card_number, first_name, last_name, date_of_birth, gender, phone, email, occupation, location, status, profile_id, notes, created_at, updated_at";

/**
 * Lista pacijenata, sortirano po prezimenu pa imenu. Ako searchQuery ima >= 2
 * znaka, filtrira po imenu/prezimenu/telefonu/broju kartona (ilike OR).
 */
export async function fetchPatients(
  searchQuery?: string
): Promise<PatientListItem[]> {
  const supabase = createBrowserClient();

  let query = supabase
    .from("patients")
    .select(PATIENT_COLUMNS)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  const q = searchQuery?.trim() ?? "";
  if (q.length >= 2) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,card_number.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p) => ({
    ...(p as Patient),
    age: ageFromDob((p as Patient).date_of_birth),
  }));
}

/** Jedan pacijent po id-u (sve kolone). null ako ne postoji. */
export async function fetchPatientById(id: string): Promise<Patient | null> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Patient) ?? null;
}

export interface PatientAppointment {
  id: string;
  starts_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  service: { name: string } | null;
  doctor: { first_name: string | null; last_name: string | null } | null;
}

/**
 * Istorija termina jednog pacijenta (preko patient_record_id), najnoviji prvo.
 */
export async function fetchPatientAppointments(
  patientId: string
): Promise<PatientAppointment[]> {
  const supabase = createBrowserClient();
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
  return (data as unknown as PatientAppointment[]) ?? [];
}
