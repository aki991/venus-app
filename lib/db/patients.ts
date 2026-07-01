import { createClient as createBrowserClient } from "@/lib/supabase/client";

export interface PatientSearchResult {
  id: string; // patients.id (registar)
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  card_number: string | null;
  // profile_id != null → pacijent ima mobilni nalog (profiles). Booking ga
  // upisuje u appointments.patient_id da mobilna veza nastavi da radi.
  profile_id: string | null;
}

export async function searchPatients(
  query: string
): Promise<PatientSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = createBrowserClient();

  // Pretraga REGISTRA pacijenata (patients), ne profiles. Kalendar zakazuje za
  // pacijente iz kartoteke; profile_id se vuče da bismo znali ima li mobilni nalog.
  const { data, error } = await supabase
    .from("patients")
    .select("id, first_name, last_name, phone, card_number, profile_id")
    .or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,card_number.ilike.%${q}%`
    )
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .limit(10);

  if (error) throw error;
  return (data as unknown as PatientSearchResult[]) ?? [];
}

// ── Registar pacijenata (patients tabela) — klijentska pretraga ──────────────
// Browser klijent (RLS staff_full_patients). Koristi PatientPicker na
// /odontogram. NE meša se sa searchPatients iznad (koji gleda profiles/mobilne).

export interface PatientPickerResult {
  id: string;
  first_name: string;
  last_name: string;
  card_number: string | null;
  phone: string | null;
}

const PICKER_COLUMNS = "id, first_name, last_name, card_number, phone";

/**
 * Pretraga registra pacijenata. Prazan/kratak upit → prvih 20 (po prezimenu),
 * da picker ima šta da prikaže; >= 2 znaka filtrira po imenu/prezimenu/
 * telefonu/broju kartona.
 */
export async function searchPatientRecords(
  query: string
): Promise<PatientPickerResult[]> {
  const supabase = createBrowserClient();
  let req = supabase
    .from("patients")
    .select(PICKER_COLUMNS)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .limit(20);

  const q = query.trim();
  if (q.length >= 2) {
    req = req.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,card_number.ilike.%${q}%`
    );
  }

  const { data, error } = await req;
  if (error) throw error;
  return (data as unknown as PatientPickerResult[]) ?? [];
}

/** Jedan pacijent (osnovna polja) za obnavljanje poslednjeg iz localStorage. */
export async function fetchPatientRecordById(
  id: string
): Promise<PatientPickerResult | null> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("patients")
    .select(PICKER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PatientPickerResult) ?? null;
}
