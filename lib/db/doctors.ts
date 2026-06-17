import { createClient as createBrowserClient } from "@/lib/supabase/client";

export interface DoctorListItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
  initials: string | null;
  color_hex: string | null;
  specialty: string | null;
  role: "staff" | "admin";
  appointment_count: number;
}

export async function fetchDoctors(): Promise<DoctorListItem[]> {
  const supabase = createBrowserClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, initials, color_hex, specialty, role")
    .in("role", ["staff", "admin"]);

  if (error) throw error;
  if (!profiles) return [];

  return (profiles as Omit<DoctorListItem, "appointment_count">[]).map((p) => ({
    ...p,
    appointment_count: 0,
  }));
}
