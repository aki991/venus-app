import { createClient as createBrowserClient } from "@/lib/supabase/client";

/** Skraćeni oblik za kalendar/modale — samo AKTIVNE usluge. */
export interface ServiceListItem {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  category: string | null;
}

/** Pun oblik za admin cenovnik — sve usluge (i neaktivne). */
export interface ServiceAdminItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
  display_order: number;
}

/** Aktivne usluge — koristi NewAppointmentModal (dropdown). */
export async function fetchServices(): Promise<ServiceListItem[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, category")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return (data as ServiceListItem[]) ?? [];
}

/**
 * SVE usluge (uključujući neaktivne), sortirano po display_order — za admin
 * cenovnik. RLS (services_select USING true) pušta staff da čita sve.
 */
export async function fetchAllServices(): Promise<ServiceAdminItem[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from("services")
    .select(
      "id, name, description, category, duration_minutes, price, is_active, display_order"
    )
    .order("display_order");

  if (error) throw error;
  return (data as ServiceAdminItem[]) ?? [];
}

/** Jedinstvene kategorije (za filter), izvedene iz liste usluga. */
export function distinctCategories(services: ServiceAdminItem[]): string[] {
  const set = new Set<string>();
  for (const s of services) {
    if (s.category) set.add(s.category);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "sr"));
}
