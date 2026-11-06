/** 재생 상태 (저장하지 않음) — 엔진이 알려 주는 값을 화면 조각들이 함께 본다 */
import { create } from "zustand";
import type { BeatInfo, PlaybackStatus } from "@/engine/playback";

export interface PlaybackViewState {
  status: PlaybackStatus;
  atEnd: boolean;
  beat: BeatInfo;
  /** 소리를 켜 본 적이 있는지 (iOS 무음 안내용) */
  audioTried: boolean;
  setStatus: (status: PlaybackStatus, atEnd: boolean) => void;
  setBeat: (beat: BeatInfo) => void;
  markAudioTried: () => void;
}

export const usePlaybackView = create<PlaybackViewState>()((set) => ({
  status: "stopped",
  atEnd: false,
  beat: { beat: null, accent: "strong", kind: "ready", bar: 0, key: -1 },
  audioTried: false,
  setStatus: (status, atEnd) => set({ status, atEnd }),
  setBeat: (beat) => set({ beat }),
  markAudioTried: () => set({ audioTried: true }),
}));
