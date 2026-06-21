import { create } from "zustand";
import { persist } from "zustand/middleware";

import { defaultCalendarDate } from "@/lib/constants/workingHours";

type KalendarLayout = "standard" | "fokus" | "split";

interface KalendarState {
  selectedDate: Date;
  layout: KalendarLayout;
  doctorFilter: string | null;
  selectedChairId: string | null;

  setSelectedDate: (date: Date) => void;
  setLayout: (layout: KalendarLayout) => void;
  setDoctorFilter: (id: string | null) => void;
  setSelectedChairId: (id: string | null) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
}

export const useKalendarStore = create<KalendarState>()(
  persist(
    (set, get) => ({
      selectedDate: defaultCalendarDate(),
      layout: "standard",
      doctorFilter: null,
      selectedChairId: null,

      setSelectedDate: (date) => set({ selectedDate: date }),
      setLayout: (layout) => set({ layout }),
      setDoctorFilter: (id) => set({ doctorFilter: id }),
      setSelectedChairId: (id) => set({ selectedChairId: id }),
      goToPreviousWeek: () => {
        const d = new Date(get().selectedDate);
        d.setDate(d.getDate() - 7);
        set({ selectedDate: d });
      },
      goToNextWeek: () => {
        const d = new Date(get().selectedDate);
        d.setDate(d.getDate() + 7);
        set({ selectedDate: d });
      },
      goToToday: () => set({ selectedDate: defaultCalendarDate() }),
    }),
    {
      name: "venus-kalendar-state",
      partialize: (state) => ({
        layout: state.layout,
        doctorFilter: state.doctorFilter,
        selectedChairId: state.selectedChairId,
      }),
    }
  )
);
