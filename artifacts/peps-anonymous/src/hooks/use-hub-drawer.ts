import { create } from "zustand";

interface HubDrawerStore {
  open: boolean;
  setOpen: (v: boolean) => void;
}

export const useHubDrawerStore = create<HubDrawerStore>()((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}));
