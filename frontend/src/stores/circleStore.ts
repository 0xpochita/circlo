import { create } from "zustand";
import type { Circle } from "@/types";

type CircleState = {
  circles: Circle[];
  selectedCircle: Circle | null;
  publicCircles: Circle[];
  isLoading: boolean;
  error: string | null;
  setCircles: (circles: Circle[]) => void;
  setSelectedCircle: (circle: Circle | null) => void;
  setPublicCircles: (circles: Circle[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const useCircleStore = create<CircleState>()((set) => ({
  circles: [],
  selectedCircle: null,
  publicCircles: [],
  isLoading: false,
  error: null,
  setCircles: (circles) => set({ circles }),
  setSelectedCircle: (circle) => set({ selectedCircle: circle }),
  setPublicCircles: (circles) => set({ publicCircles: circles }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      circles: [],
      selectedCircle: null,
      publicCircles: [],
      isLoading: false,
      error: null,
    }),
}));
