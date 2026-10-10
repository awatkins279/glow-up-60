import { create } from 'zustand';
import type { BadgeDef, LevelDef } from '@/lib/types';

export interface ScorePop {
  id: number;
  base: number;
  mult: number;
  points: number;
  label: string | null;
  big: boolean;
  title?: string;
}

interface FxState {
  pops: ScorePop[];
  levelUp: LevelDef | null;
  badge: BadgeDef | null;
  toast: string | null;
  pop: (p: Omit<ScorePop, 'id'>) => void;
  removePop: (id: number) => void;
  showLevelUp: (l: LevelDef) => void;
  clearLevelUp: () => void;
  showBadge: (b: BadgeDef) => void;
  clearBadge: () => void;
  showToast: (t: string) => void;
  clearToast: () => void;
}

let seq = 1;

/** Transient UI effects (score pop-ups, confetti, badge toasts). Not persisted. */
export const useFx = create<FxState>((set) => ({
  pops: [],
  levelUp: null,
  badge: null,
  toast: null,
  pop: (p) => set((s) => ({ pops: [...s.pops.slice(-3), { ...p, id: seq++ }] })),
  removePop: (id) => set((s) => ({ pops: s.pops.filter((p) => p.id !== id) })),
  showLevelUp: (l) => set({ levelUp: l }),
  clearLevelUp: () => set({ levelUp: null }),
  showBadge: (b) => set({ badge: b }),
  clearBadge: () => set({ badge: null }),
  showToast: (t) => set({ toast: t }),
  clearToast: () => set({ toast: null }),
}));
