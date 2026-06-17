import { useQuery } from "@tanstack/react-query";

import { fetchServices } from "@/lib/db/services";

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
  });
}
