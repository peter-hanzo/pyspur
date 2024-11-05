import { create } from 'zustand';

export const useModeStore = create((set) => ({
  mode: 'hand',
  setMode: (mode) => set({ mode }),
}));