/**
 * 브라우저에서 한 번만 만드는 재생 엔진 + Web Audio.
 * 화면 조각(캔버스·트랜스포트·박 표시)이 같은 엔진을 함께 쓴다.
 */
import { WebAudioRuntime } from "@/engine/clickSynth";
import { PlaybackEngine } from "@/engine/playback";
import { createTickTimer } from "@/engine/scheduler";
import { usePlaybackView } from "@/store/playback";

export interface PlaybackRuntime {
  engine: PlaybackEngine;
  audio: WebAudioRuntime;
}

let runtime: PlaybackRuntime | null = null;

export function getRuntime(): PlaybackRuntime {
  if (runtime) return runtime;
  const audio = new WebAudioRuntime();
  const engine = new PlaybackEngine({
    clock: audio,
    sink: audio,
    timer: createTickTimer(25),
    wallNow: () => performance.now() / 1000,
  });
  engine.subscribe(() => usePlaybackView.getState().setStatus(engine.getStatus(), engine.isAtEnd()));
  engine.onBeat((info) => usePlaybackView.getState().setBeat(info));
  runtime = { engine, audio };
  // 점검용: 주소 끝에 ?debug 를 붙이면 개발자 도구에서 window.__conductor 로 엔진을 볼 수 있다
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug")) {
    (window as unknown as { __conductor?: PlaybackRuntime }).__conductor = runtime;
  }
  return runtime;
}

/**
 * 버튼을 누른 순간에 불러 소리를 깨운다. (모바일은 사용자 동작 없이 소리를 못 낸다)
 * AudioContext를 만들고 resume을 부르는 부분은 이벤트 처리 안에서 동기적으로 실행된다.
 */
export async function unlockAudio(): Promise<void> {
  const { audio } = getRuntime();
  usePlaybackView.getState().markAudioTried();
  await audio.unlock();
}

/** iPhone·iPad인지 (무음 모드 안내용) */
export function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
