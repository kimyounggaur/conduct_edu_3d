import type { PatternDef } from "../types";

/**
 * 느린 7박자. 교재마다 모양이 달라(DESIGN.md 4.2 비고) 데이터만 바꿔 교체할 수 있게 둔다.
 */

/** 7박자(4+3): 독일식 6박에 왼쪽 한 박 추가 (부록 A) */
export const SEVEN_43: PatternDef = {
  id: "SEVEN_43",
  nameKo: "7박자 (4+3)",
  level: 7,
  meters: ["7/4"],
  timeSignature: "7/4",
  tempoUnit: "♩",
  summary: "4+3으로 묶은 7박. 왼쪽을 세 번 간다.",
  release: 2,
  defaultBpm: 72,
  beats: [
    { n: 1, P: [0.0, 0.0], A: [-0.05, 0.3], via: [[-0.12, 0.18]], accent: "strong" },
    { n: 2, P: [-0.2, 0.05], A: [-0.22, 0.28], via: [[-0.32, 0.18]], accent: "weak" },
    { n: 3, P: [-0.4, 0.05], A: [-0.42, 0.28], via: [[-0.52, 0.18]], accent: "weak" },
    { n: 4, P: [-0.6, 0.05], A: [-0.55, 0.45], via: [[0.0, 0.5]], accent: "weak" },
    { n: 5, P: [0.3, 0.05], A: [0.32, 0.3], via: [[0.48, 0.2]], accent: "medium" },
    { n: 6, P: [0.6, 0.05], A: [0.56, 0.45], via: [[0.38, 0.3]], accent: "weak" },
    { n: 7, P: [0.15, 0.08], A: [0.1, 0.6], via: [[0.02, 0.95]], accent: "weak" },
  ],
};

/** 7박자(3+4): 독일식 6박에 오른쪽 한 박 추가 (부록 A) */
export const SEVEN_34: PatternDef = {
  id: "SEVEN_34",
  nameKo: "7박자 (3+4)",
  level: 7,
  meters: ["7/4"],
  timeSignature: "7/4",
  tempoUnit: "♩",
  summary: "3+4로 묶은 7박. 오른쪽을 세 번 간다.",
  release: 2,
  defaultBpm: 72,
  beats: [
    { n: 1, P: [0.0, 0.0], A: [-0.05, 0.3], via: [[-0.15, 0.18]], accent: "strong" },
    { n: 2, P: [-0.3, 0.05], A: [-0.32, 0.28], via: [[-0.48, 0.18]], accent: "weak" },
    { n: 3, P: [-0.6, 0.05], A: [-0.55, 0.45], via: [[0.0, 0.5]], accent: "weak" },
    { n: 4, P: [0.2, 0.05], A: [0.22, 0.28], via: [[0.32, 0.18]], accent: "medium" },
    { n: 5, P: [0.4, 0.05], A: [0.42, 0.28], via: [[0.52, 0.18]], accent: "weak" },
    { n: 6, P: [0.6, 0.05], A: [0.56, 0.45], via: [[0.38, 0.3]], accent: "weak" },
    { n: 7, P: [0.15, 0.08], A: [0.1, 0.6], via: [[0.02, 0.95]], accent: "weak" },
  ],
};
