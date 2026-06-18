import { useQuery } from "@tanstack/react-query";
import { fetchChairs } from "@/lib/db/chairs";

export function useChairs() {
  return useQuery({
    queryKey: ["chairs"],
    queryFn: fetchChairs,
  });
}
