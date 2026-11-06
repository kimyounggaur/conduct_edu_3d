/** 패턴 라이브러리에서 고른 것들 — 기기에 저장 (키: ct.library.v1) */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getPattern, hasPattern } from "@/engine/patterns";
import { safeStorage } from "@/lib/storage";

export const BPM_MIN = 40;
export const BPM_MAX = 208;
/** 루프를 끄면 재생할 마디 수 */
export const FINITE_BARS = 4;

export const clampBpm = (bpm: number) => Math.round(Math.min(BPM_MAX, Math.max(BPM_MIN, bpm)));

export interface LibraryState {
  patternId: string;
  bpm: number;
  countIn: 0 | 1 | 2;
  loop: boolean;
  selectPattern: (id: string) => void;
  setBpm: (bpm: number) => void;
  nudgeBpm: (delta: number) => void;
  setCountIn: (n: 0 | 1 | 2) => void;
  setLoop: (on: boolean) => void;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      patternId: "FOUR",
      bpm: 60,
      countIn: 1,
      loop: true,
      selectPattern: (id) => {
        if (!hasPattern(id)) return;
        set({ patternId: id, bpm: clampBpm(getPattern(id).defaultBpm) });
      },
      setBpm: (bpm) => set({ bpm: clampBpm(bpm) }),
      nudgeBpm: (delta) => set((s) => ({ bpm: clampBpm(s.bpm + delta) })),
      setCountIn: (countIn) => set({ countIn }),
      setLoop: (loop) => set({ loop }),
    }),
    {
      name: "ct.library.v1",
      version: 1,
      storage: safeStorage,
      skipHydration: true,
      partialize: (s) => ({ patternId: s.patternId, bpm: s.bpm, countIn: s.countIn, loop: s.loop }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LibraryState>;
        return {
          ...current,
          ...p,
          patternId: p.patternId && hasPattern(p.patternId) ? p.patternId : current.patternId,
          bpm: typeof p.bpm === "number" ? clampBpm(p.bpm) : current.bpm,
        };
      },
    },
  ),
);
