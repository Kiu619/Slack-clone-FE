import { create } from "zustand";

interface PreferencesStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
