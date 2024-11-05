import { create } from 'zustand';

export const useModeStore = create((set) => ({
  mode: 'default',
  setMode: (mode) => set({ mode }),
}));