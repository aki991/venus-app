import { create } from "zustand";

import type { AppointmentWithRelations } from "@/lib/db/appointments";

export interface NewAppointmentDefaults {
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  doctor_id?: string;
}

interface AppointmentModalState {
  // Novi termin
  newOpen: boolean;
  newDefaults: NewAppointmentDefaults | null;
  openNew: (defaults?: NewAppointmentDefaults) => void;
  closeNew: () => void;

  // Detalji termina
  detailOpen: boolean;
  selected: AppointmentWithRelations | null;
  openDetail: (appointment: AppointmentWithRelations) => void;
  closeDetail: () => void;
}

/**
 * Globalni store za modale termina. Razlog: "+ Novi termin" CTA živi u TopBar-u
 * (dashboard layout), dok modali žive u kalendar stranici — bez deljenog state-a
 * morali bismo provlačiti callbacks kroz layout. Zustand centralizuje sve trigere
 * (CTA, klik na slot, klik na termin) bez prop-drillinga.
 */
export const useAppointmentModalStore = create<AppointmentModalState>((set) => ({
  newOpen: false,
  newDefaults: null,
  openNew: (defaults) => set({ newOpen: true, newDefaults: defaults ?? null }),
  closeNew: () => set({ newOpen: false, newDefaults: null }),

  detailOpen: false,
  selected: null,
  openDetail: (appointment) =>
    set({ detailOpen: true, selected: appointment }),
  closeDetail: () => set({ detailOpen: false, selected: null }),
}));
