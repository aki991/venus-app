import { createClient as createBrowserClient } from "@/lib/supabase/client";

// Medicinski karton pacijenta (1:1 sa patients). Red se kreira LAZY — prvi
// upsert ga pravi; dok ne postoji, karton je prazan (fetch vraća null).
export interface PatientMedical {
  patient_id: string;
  allergies: string[];
  chronic_conditions: string[];
  medications: string[];
  critical_warnings: string[];
  anamnesis: string | null;
  smoker: boolean;
  pregnant: boolean;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

const COLUMNS =
  "patient_id, allergies, chronic_conditions, medications, critical_warnings, anamnesis, smoker, pregnant, notes, updated_by, updated_at, created_at";

/**
 * Medicinski karton jednog pacijenta ili null ako još nije unet.
 * Browser klijent (RLS staff_full_patient_medical); troši ga usePatientMedical.
 */
export async function fetchPatientMedical(
  patientId: string
): Promise<PatientMedical | null> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("patient_medical")
    .select(COLUMNS)
    .eq("patient_id", patientId)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as PatientMedical) ?? null;
}
