import type { PatientStatus } from "@/lib/validations/patient";

interface PatientStatusConfig {
  label: string;
  // Tailwind klase za badge (bg + text), u skladu sa crno-zlatnom temom.
  badge: string;
}

// Jedan izvor istine za status pacijenta — dele ga lista i karton.
export const PATIENT_STATUS_CONFIG: Record<PatientStatus, PatientStatusConfig> =
  {
    nov: {
      label: "Nov",
      badge: "border-transparent bg-blue-500/15 text-blue-400",
    },
    aktivan: {
      label: "Aktivan",
      badge: "border-transparent bg-emerald-500/15 text-emerald-500",
    },
    na_terapiji: {
      label: "Na terapiji",
      badge: "border-transparent bg-venus-gold/20 text-venus-gold",
    },
    zavrseno: {
      label: "Završeno",
      badge: "border-transparent bg-zinc-500/15 text-zinc-300",
    },
    neaktivan: {
      label: "Neaktivan",
      badge: "border-transparent bg-zinc-700/40 text-zinc-500",
    },
  };
