/** 보기·소리 설정 (DESIGN.md 5.4, 6.6) — 기기에 저장 (키: ct.settings.v1) */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ViewMode } from "@/render/transform";
import { safeStorage } from "@/lib/storage";

export type ClickChoice = "wood" | "beep" | "off";

export interface SettingsState {
  view: ViewMode;
  leftHanded: boolean;
  baton: boolean;
  /** 손과 지휘봉을 입체(3D)로 보기 */
  hand3d: boolean;
  /** 잔상 길이(밀리초) 0~1500 */
  trailMs: number;
  showGhost: boolean;
  showNumbers: boolean;
  showPlane: boolean;
  click: ClickChoice;
  /** 음소거(M)를 풀 때 돌아갈 소리 */
  lastSound: Exclude<ClickChoice, "off">;
  subdivisionClick: boolean;
  /** 화면 지연 보정(밀리초): 블루투스 스피커처럼 소리가 늦게 나는 기기용 */
  audioOffsetMs: number;
  stageLayout: "orchestra" | "choir2" | "choir4";
  update: (patch: Partial<Omit<SettingsState, "update" | "toggleMute">>) => void;
  toggleMute: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      view: "conductor",
      leftHanded: false,
      baton: true,
      hand3d: true,
      trailMs: 700,
      showGhost: true,
      showNumbers: true,
      showPlane: true,
      click: "wood",
      lastSound: "wood",
      subdivisionClick: false,
      audioOffsetMs: 0,
      stageLayout: "orchestra",
      update: (patch) =>
        set((s) => ({
          ...patch,
          lastSound: patch.click && patch.click !== "off" ? patch.click : s.lastSound,
        })),
      toggleMute: () => {
        const { click, lastSound } = get();
        set({ click: click === "off" ? lastSound : "off" });
      },
    }),
    {
      name: "ct.settings.v1",
      version: 1,
      storage: safeStorage,
      skipHydration: true,
      partialize: (s) => {
        const rest: Partial<SettingsState> = { ...s };
        delete rest.update;
        delete rest.toggleMute;
        return rest;
      },
    },
  ),
);
