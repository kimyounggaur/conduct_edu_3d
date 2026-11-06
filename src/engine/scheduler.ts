/**
 * 오디오 예약에 필요한 부품의 약속(인터페이스)과 타이머 (DESIGN.md 7.3)
 *
 * 재생 엔진은 이 인터페이스만 알고, 실제 Web Audio 구현(clickSynth.ts)이나
 * 테스트용 가짜 시계를 주입받는다.
 */

export type ClickKind = "strong" | "medium" | "weak" | "sub";

export interface AudioClock {
  /** 소리를 예약할 때 쓰는 현재 시각(초). Web Audio의 currentTime */
  now(): number;
  /** 지금 스피커에서 나오고 있는 소리의 시각(초). 화면은 이 시각으로 그려야 소리와 맞는다 */
  outputNow(): number;
}

export interface ClickSink {
  /** time(오디오 시각)에 클릭 하나를 예약한다 */
  schedule(time: number, kind: ClickKind): void;
  /** time 이후로 예약된 클릭을 모두 취소한다 (일시정지·정지) */
  cancelFrom(time: number): void;
}

export interface TickTimer {
  start(onTick: () => void): void;
  stop(): void;
}

/** 오디오 없이 그림만 돌릴 때(홈 화면 시연 등) 쓰는 시계와 무음 출력 */
export function createSilentAudio(now: () => number): AudioClock & ClickSink {
  return {
    now,
    outputNow: now,
    schedule: () => {},
    cancelFrom: () => {},
  };
}

/**
 * 25ms마다 tick을 부르는 타이머. 가능하면 Web Worker에서 돌려
 * 브라우저 탭이 뒤로 가도 박자가 밀리지 않게 한다. Worker를 못 쓰면 일반 타이머로 대신한다.
 */
export function createTickTimer(intervalMs = 25): TickTimer {
  let worker: Worker | null = null;
  let fallbackId: ReturnType<typeof setInterval> | null = null;
  let handler: (() => void) | null = null;

  const g = globalThis as typeof globalThis & { Worker?: typeof Worker };
  if (typeof g.Worker === "function" && typeof Blob === "function" && typeof URL?.createObjectURL === "function") {
    try {
      const src =
        "let id=null;onmessage=function(e){if(e.data==='start'){if(id===null){id=setInterval(function(){postMessage(0)}," +
        intervalMs +
        ")}}else if(e.data==='stop'){if(id!==null){clearInterval(id);id=null}}};";
      const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
      worker = new g.Worker(url);
      worker.onmessage = () => handler?.();
      worker.onerror = () => {
        // 보안 정책 등으로 Worker가 막히면 일반 타이머로 전환
        worker?.terminate();
        worker = null;
        if (handler && fallbackId === null) fallbackId = setInterval(() => handler?.(), intervalMs);
      };
    } catch {
      worker = null;
    }
  }

  return {
    start(onTick) {
      handler = onTick;
      if (worker) worker.postMessage("start");
      else if (fallbackId === null) fallbackId = setInterval(() => handler?.(), intervalMs);
    },
    stop() {
      handler = null;
      worker?.postMessage("stop");
      if (fallbackId !== null) {
        clearInterval(fallbackId);
        fallbackId = null;
      }
    },
  };
}
