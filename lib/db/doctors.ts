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

  const base = () =>
    supabase
      .from("profiles")
      .select("id, first_name, last_name, initials, color_hex, specialty, role")
      .in("role", ["staff", "admin"])
      .eq("is_active", true); // deaktivirani doktori se ne nude za nove termine

  // Primarno: redosled kao u admin panelu (display_order). Fallback na ime ako
  // kolona još ne postoji (migracija 20250106 nije pokrenuta) — kod 42703.
  let { data: profiles, error } = await base()
    .order("display_order", { ascending: true })
    .order("first_name", { ascending: true });
  if (error?.code === "42703") {
    ({ data: profiles, error } = await base().order("first_name", {
      ascending: true,
    }));
  }

  if (error) throw error;
  if (!profiles) return [];

  return (profiles as Omit<DoctorListItem, "appointment_count">[]).map((p) => ({
    ...p,
    appointment_count: 0,
  }));
}
