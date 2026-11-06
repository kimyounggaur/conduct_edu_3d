import type { PatternDef } from "../types";

/** 2박자: ① 아래 ② 바깥(오른쪽)으로 살짝 벌려 위 (부록 A) */
export const TWO: PatternDef = {
  id: "TWO",
  nameKo: "2박자",
  level: 2,
  meters: ["2/4", "2/2", "6/8 빠르게"],
  timeSignature: "2/4",
  tempoUnit: "♩",
  summary: "아래, 그리고 바깥으로 살짝 벌리며 위로.",
  release: 1,
  defaultBpm: 60,
  beats: [
    { n: 1, P: [0.0, 0.0], A: [0.08, 0.42], via: [[0.3, 0.25]], accent: "strong" },
    { n: 2, P: [0.45, 0.05], A: [0.42, 0.5], via: [[0.05, 0.95]], accent: "weak" },
  ],
};
