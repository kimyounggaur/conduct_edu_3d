import type { PatternDef } from "../types";

/** 한 박 패턴 — 모든 패턴의 기초: 내려찍기 + 반동 (부록 A) */
export const ONE: PatternDef = {
  id: "ONE",
  nameKo: "한 박",
  level: 1,
  meters: ["3/4 빠르게", "6/8 빠르게", "3/8"],
  timeSignature: "3/8",
  tempoUnit: "♩.",
  summary: "내려찍고 튀어 오르기. 빠른 3박자를 한 마디에 한 번 셀 때.",
  release: 1,
  defaultBpm: 60,
  // via: 내려올 때 살짝 안쪽으로 지나가 올라가는 선과 겹치지 않게 (좁은 고리 모양)
  beats: [{ n: 1, P: [0, 0], A: [0.03, 0.95], via: [[-0.06, 0.5]], accent: "strong", r: 0.5 }],
};
