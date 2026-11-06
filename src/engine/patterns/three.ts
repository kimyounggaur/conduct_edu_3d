import type { PatternDef } from "../types";

/** 3박자: ① 아래 ② 오른쪽 ③ 위 (부록 A) */
export const THREE: PatternDef = {
  id: "THREE",
  nameKo: "3박자",
  level: 3,
  meters: ["3/4", "3/8", "9/8"],
  timeSignature: "3/4",
  tempoUnit: "♩",
  summary: "아래, 오른쪽, 위.",
  release: 1,
  defaultBpm: 60,
  beats: [
    { n: 1, P: [0.0, 0.0], A: [0.05, 0.38], via: [[0.3, 0.28]], accent: "strong" },
    { n: 2, P: [0.5, 0.05], A: [0.5, 0.42], via: [[0.32, 0.28]], accent: "weak" },
    { n: 3, P: [0.15, 0.08], A: [0.1, 0.6], via: [[0.02, 0.95]], accent: "weak" },
  ],
};
