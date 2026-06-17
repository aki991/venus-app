import { create } from "zustand";
import { persist } from "zustand/middleware";

interface KalendarState {
  selectedDate: Date;
  layout: "standard" | "fokus";
  doctorFilter: string | null;

  setSelectedDate: (date: Date) => void;
  setLayout: (layout: "standard" | "fokus") => void;
  setDoctorFilter: (id: string | null) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
}

export const useKalendarStore = create<KalendarState>()(
  persist(
    (set, get) => ({
      selectedDate: new Date(),
      layout: "standard",
      doctorFilter: null,

      setSelectedDate: (date) => set({ selectedDate: date }),
      setLayout: (layout) => set({ layout }),
      setDoctorFilter: (id) => set({ doctorFilter: id }),
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
      goToToday: () => set({ selectedDate: new Date() }),
    }),
    {
      name: "venus-kalendar-state",
      partialize: (state) => ({
        layout: state.layout,
        doctorFilter: state.doctorFilter,
      }),
    }
  )
);
