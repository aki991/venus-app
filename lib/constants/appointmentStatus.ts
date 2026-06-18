import {
  Check,
  Clock,
  X,
  UserX,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";

interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

// Jedan izvor istine za status termina — dele ga i detalji modal (badge)
// i kalendarski blok (ikonica). Boje su prigušene, u skladu sa crno-zlatnom temom.
export const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  pending: { label: "Na čekanju", color: "#d4b465", icon: Clock },
  confirmed: { label: "Potvrđen", color: "#8a9a6b", icon: Check },
  completed: { label: "Završen", color: "#6b9080", icon: CheckCircle2 },
  no_show: { label: "Nije došao", color: "#a07f9e", icon: UserX },
  cancelled: { label: "Otkazan", color: "#c84545", icon: X },
};
