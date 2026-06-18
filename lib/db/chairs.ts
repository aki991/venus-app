import { createClient as createBrowserClient } from "@/lib/supabase/client";

export interface Chair {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export async function fetchChairs(): Promise<Chair[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("chairs")
    .select("id, name, display_order, is_active")
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return data ?? [];
}
