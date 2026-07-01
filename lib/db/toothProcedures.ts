import { createClient as createBrowserClient } from "@/lib/supabase/client";

// Jedan zapis protokola intervencija (hronologija). ODVOJENO od tooth_records
// (trenutno stanje) — ovde je append-only istorija urađenog.
export interface ToothProcedure {
  id: string;
  patient_id: string;
  tooth_number: number | null; // FDI, null = opšta intervencija
  performed_on: string; // datum "YYYY-MM-DD"
  diagnosis: string | null;
  therapy: string | null;
  doctor_id: string | null;
  note: string | null;
  source: "auto" | "manual"; // 'auto' = iz odontograma, 'manual' = ručni unos
  created_at: string;
  // Ime doktora (join profiles) — za prikaz u tabeli.
  doctor: { first_name: string | null; last_name: string | null } | null;
}

// doctor_id embedujemo preko imena FK-a (tabela ima 2 FK ka profiles:
// doctor_id i created_by), pa Supabase mora znati koji.
const COLUMNS = `
  id, patient_id, tooth_number, performed_on, diagnosis, therapy,
  doctor_id, note, source, created_at,
  doctor:profiles!tooth_procedures_doctor_id_fkey(first_name, last_name)
`;

/**
 * Protokol intervencija pacijenta, najnovije prvo. Browser klijent
 * (RLS staff_full_tooth_procedures); troši ga useToothProcedures hook.
 */
export async function fetchToothProcedures(
  patientId: string
): Promise<ToothProcedure[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("tooth_procedures")
    .select(COLUMNS)
    .eq("patient_id", patientId)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as ToothProcedure[]) ?? [];
}
