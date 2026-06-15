import { create } from "zustand";

interface PageTitleStore {
  title: string | null;
  setTitle: (title: string | null) => void;
}

export const usePageTitle = create<PageTitleStore>((set) => ({
  title: null,
  setTitle: (title) => set({ title }),
}));
