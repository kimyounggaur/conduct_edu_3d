import type { PatternDef } from "../types";

/** 6박자(독일식, 기본): ① 아래 ② 왼쪽(안) ③ 왼쪽(밖) ④ 오른쪽(안) ⑤ 오른쪽(밖) ⑥ 위 (부록 A) */
export const SIX_GERMAN: PatternDef = {
  id: "SIX_GERMAN",
  nameKo: "6박자 (독일식)",
  level: 5,
  meters: ["6/8 느리게", "6/4"],
  timeSignature: "6/8",
  tempoUnit: "♪",
  summary: "왼쪽 두 번, 오른쪽 두 번, 위. 느린 6/8을 여섯 번 셀 때.",
  release: 1,
  defaultBpm: 90,
  beats: [
    { n: 1, P: [0.0, 0.0], A: [-0.05, 0.32], via: [[-0.15, 0.2]], accent: "strong" },
    { n: 2, P: [-0.25, 0.05], A: [-0.28, 0.3], via: [[-0.42, 0.2]], accent: "weak" },
    { n: 3, P: [-0.55, 0.05], A: [-0.5, 0.45], via: [[0.0, 0.5]], accent: "weak" },
    { n: 4, P: [0.25, 0.05], A: [0.28, 0.3], via: [[0.42, 0.2]], accent: "medium" },
    { n: 5, P: [0.55, 0.05], A: [0.52, 0.45], via: [[0.35, 0.3]], accent: "weak" },
    { n: 6, P: [0.15, 0.08], A: [0.1, 0.6], via: [[0.02, 0.95]], accent: "weak" },
  ],
};

/** 6박자(이탈리아식, 선택): 4박 패턴에서 1·3박을 분할 (부록 A) */
export const SIX_ITALIAN: PatternDef = {
  id: "SIX_ITALIAN",
  nameKo: "6박자 (이탈리아식)",
  level: 5,
  meters: ["6/8 느리게"],
  timeSignature: "6/8",
  tempoUnit: "♪",
  summary: "4박자 모양에서 1박과 3박을 제자리에서 한 번 더 찍는다.",
  release: 1,
  defaultBpm: 90,
  beats: [
    { n: 1, P: [0.0, 0.0], A: [-0.05, 0.3], accent: "strong" },
    { n: 2, P: [-0.05, 0.02], A: [-0.1, 0.3], via: [[-0.3, 0.25]], accent: "weak" },
    { n: 3, P: [-0.5, 0.05], A: [-0.45, 0.42], via: [[0.0, 0.48]], accent: "weak" },
    { n: 4, P: [0.5, 0.05], A: [0.5, 0.35], accent: "medium" },
    { n: 5, P: [0.52, 0.03], A: [0.5, 0.42], via: [[0.3, 0.3]], accent: "weak" },
    { n: 6, P: [0.15, 0.08], A: [0.1, 0.6], via: [[0.02, 0.95]], accent: "weak" },
  ],
};
