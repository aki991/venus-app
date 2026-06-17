import { useQuery } from "@tanstack/react-query";
import { fetchDoctors } from "@/lib/db/doctors";

export function useDoctors() {
  return useQuery({
    queryKey: ["doctors"],
    queryFn: fetchDoctors,
  });
}
