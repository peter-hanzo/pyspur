import { create } from 'zustand';

export const useModeStore = create((set) => ({
  mode: 'pointer',
  setMode: (mode) => set({ mode }),
}));