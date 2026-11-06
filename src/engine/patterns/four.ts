import type { PatternDef } from "../types";

/** 4박자: ① 아래 ② 왼쪽 ③ 오른쪽 ④ 위 (부록 A) */
export const FOUR: PatternDef = {
  id: "FOUR",
  nameKo: "4박자",
  level: 4,
  meters: ["4/4", "4/2", "12/8"],
  timeSignature: "4/4",
  tempoUnit: "♩",
  summary: "아래, 왼쪽, 오른쪽, 위. 가장 많이 쓰는 패턴.",
  release: 1,
  defaultBpm: 60,
  beats: [
    { n: 1, P: [0.0, 0.0], A: [-0.08, 0.38], via: [[-0.3, 0.3]], accent: "strong" },
    { n: 2, P: [-0.5, 0.05], A: [-0.45, 0.42], via: [[0.0, 0.48]], accent: "weak" },
    { n: 3, P: [0.5, 0.05], A: [0.5, 0.42], via: [[0.3, 0.3]], accent: "medium" },
    { n: 4, P: [0.15, 0.08], A: [0.1, 0.6], via: [[0.02, 0.95]], accent: "weak" },
  ],
};
