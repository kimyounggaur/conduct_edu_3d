import type { Exercise } from "@/engine/types";
import { DEFAULT_STYLE } from "@/engine/types";

/** 테스트용 연습 정의: 필요한 부분만 덮어쓴다 */
export function exercise(over: Partial<Exercise> = {}): Exercise {
  return {
    id: "test",
    patternId: over.patternId ?? "FOUR",
    tempo: { bpm: 60, unit: "♩" },
    bars: 2,
    countIn: 0,
    readyHoldSec: 1.5,
    start: { beat: 1 },
    prep: "auto",
    style: DEFAULT_STYLE,
    ...over,
  };
}

export const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
