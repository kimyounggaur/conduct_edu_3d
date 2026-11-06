import type { PatternDef } from "../types";

/** 5박자(3+2): 4박 패턴의 왼쪽을 두 번 (부록 A) */
export const FIVE_32: PatternDef = {
  id: "FIVE_32",
  nameKo: "5박자 (3+2)",
  level: 6,
  meters: ["5/4"],
  timeSignature: "5/4",
  tempoUnit: "♩",
  summary: "3+2로 묶은 5박. 왼쪽을 두 번 간다.",
  release: 2,
  defaultBpm: 72,
  beats: [
    { n: 1, P: [0.0, 0.0], A: [-0.05, 0.32], via: [[-0.15, 0.2]], accent: "strong" },
    { n: 2, P: [-0.28, 0.05], A: [-0.3, 0.3], via: [[-0.42, 0.2]], accent: "weak" },
    { n: 3, P: [-0.55, 0.05], A: [-0.5, 0.45], via: [[0.0, 0.5]], accent: "weak" },
    { n: 4, P: [0.5, 0.05], A: [0.5, 0.42], via: [[0.3, 0.3]], accent: "medium" },
    { n: 5, P: [0.15, 0.08], A: [0.1, 0.6], via: [[0.02, 0.95]], accent: "weak" },
  ],
};

/** 5박자(2+3): 4박 패턴의 오른쪽을 두 번 (부록 A) */
export const FIVE_23: PatternDef = {
  id: "FIVE_23",
  nameKo: "5박자 (2+3)",
  level: 6,
  meters: ["5/4"],
  timeSignature: "5/4",
  tempoUnit: "♩",
  summary: "2+3으로 묶은 5박. 오른쪽을 두 번 간다.",
  release: 2,
  defaultBpm: 72,
  beats: [
    { n: 1, P: [0.0, 0.0], A: [-0.08, 0.38], via: [[-0.3, 0.3]], accent: "strong" },
    { n: 2, P: [-0.5, 0.05], A: [-0.45, 0.42], via: [[0.0, 0.48]], accent: "weak" },
    { n: 3, P: [0.28, 0.05], A: [0.3, 0.3], via: [[0.42, 0.2]], accent: "medium" },
    { n: 4, P: [0.55, 0.05], A: [0.52, 0.45], via: [[0.35, 0.3]], accent: "weak" },
    { n: 5, P: [0.15, 0.08], A: [0.1, 0.6], via: [[0.02, 0.95]], accent: "weak" },
  ],
};
