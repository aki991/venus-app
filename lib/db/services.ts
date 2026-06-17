import { createClient as createBrowserClient } from "@/lib/supabase/client";

export interface ServiceListItem {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  category: string | null;
}

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
