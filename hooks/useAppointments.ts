import { useQuery } from "@tanstack/react-query";
import { startOfWeek, addDays } from "date-fns";
import { fetchAppointmentsForWeek } from "@/lib/db/appointments";

export function useAppointmentsForWeek(date: Date) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  return useQuery({
    queryKey: ["appointments", "week", weekStart.toISOString()],
    queryFn: () => fetchAppointmentsForWeek(weekStart, weekEnd),
  });
}
