import { createClient as createBrowserClient } from "@/lib/supabase/client";

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
