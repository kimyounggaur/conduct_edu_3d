import type { PatternDef, TempoUnit } from "../types";

/** 원본 패턴을 복제해 만드는 파생 패턴의 규칙 (부록 A DERIVED) */
export interface DerivedSpec {
  id: string;
  base: string;
  nameKo: string;
  level: number;
  timeSignature: string;
  meters: string[];
  summary: string;
  release: 1 | 2;
  defaultBpm: number;
  subdivide?: 2 | 3;
  weights?: number[];
  tempoUnit?: TempoUnit;
}

export const DERIVED_SPECS: DerivedSpec[] = [
  // 복합 박자: 같은 도형을 점4분음표(♩.) 단위로
  {
    id: "SIX8_IN2",
    base: "TWO",
    nameKo: "빠른 6/8 (2박)",
    level: 2,
    timeSignature: "6/8",
    meters: ["6/8 빠르게"],
    tempoUnit: "♩.",
    summary: "빠른 6/8은 점4분음표를 한 박으로, 2박자처럼.",
    release: 1,
    defaultBpm: 60,
  },
  {
    id: "NINE8_IN3",
    base: "THREE",
    nameKo: "9/8 (3박)",
    level: 3,
    timeSignature: "9/8",
    meters: ["9/8"],
    tempoUnit: "♩.",
    summary: "점4분음표를 한 박으로, 3박자처럼.",
    release: 1,
    defaultBpm: 56,
  },
  {
    id: "TWELVE8_IN4",
    base: "FOUR",
    nameKo: "12/8 (4박)",
    level: 4,
    timeSignature: "12/8",
    meters: ["12/8"],
    tempoUnit: "♩.",
    summary: "점4분음표를 한 박으로, 4박자처럼.",
    release: 1,
    defaultBpm: 50,
  },
  // 분할 패턴
  {
    id: "SUB_TWO_4",
    base: "TWO",
    nameKo: "2박자 분할",
    level: 8,
    timeSignature: "2/4",
    meters: ["2/4 아주 느리게"],
    subdivide: 2,
    summary: "아주 느린 2박자. 박마다 '그리고'를 작게 한 번 더 찍는다.",
    release: 2,
    defaultBpm: 40,
  },
  {
    id: "SUB_THREE_6",
    base: "THREE",
    nameKo: "3박자 분할",
    level: 8,
    timeSignature: "3/4",
    meters: ["3/4 아주 느리게"],
    subdivide: 2,
    summary: "아주 느린 3박자. 박마다 둘로 나누어 찍는다.",
    release: 2,
    defaultBpm: 40,
  },
  {
    id: "SUB_FOUR_8",
    base: "FOUR",
    nameKo: "4박자 분할",
    level: 8,
    timeSignature: "4/4",
    meters: ["4/4 아주 느리게"],
    subdivide: 2,
    summary: "아주 느린 4박자. 박마다 둘로 나누어 찍는다.",
    release: 2,
    defaultBpm: 40,
  },
  // 불규칙 박: 박 길이가 서로 다르다 (8분음표 단위 가중치)
  {
    id: "FIVE8_IN2_32",
    base: "TWO",
    nameKo: "5/8 (3+2)",
    level: 9,
    timeSignature: "5/8",
    meters: ["5/8"],
    weights: [3, 2],
    tempoUnit: "♪",
    summary: "빠른 5/8을 2박으로. 첫 박이 길다.",
    release: 2,
    defaultBpm: 200,
  },
  {
    id: "FIVE8_IN2_23",
    base: "TWO",
    nameKo: "5/8 (2+3)",
    level: 9,
    timeSignature: "5/8",
    meters: ["5/8"],
    weights: [2, 3],
    tempoUnit: "♪",
    summary: "빠른 5/8을 2박으로. 둘째 박이 길다.",
    release: 2,
    defaultBpm: 200,
  },
  {
    id: "SEVEN8_IN3_223",
    base: "THREE",
    nameKo: "7/8 (2+2+3)",
    level: 9,
    timeSignature: "7/8",
    meters: ["7/8"],
    weights: [2, 2, 3],
    tempoUnit: "♪",
    summary: "빠른 7/8을 3박으로. 마지막 박이 길다.",
    release: 2,
    defaultBpm: 200,
  },
  {
    id: "SEVEN8_IN3_322",
    base: "THREE",
    nameKo: "7/8 (3+2+2)",
    level: 9,
    timeSignature: "7/8",
    meters: ["7/8"],
    weights: [3, 2, 2],
    tempoUnit: "♪",
    summary: "빠른 7/8을 3박으로. 첫 박이 길다.",
    release: 2,
    defaultBpm: 200,
  },
  {
    id: "SEVEN8_IN3_232",
    base: "THREE",
    nameKo: "7/8 (2+3+2)",
    level: 9,
    timeSignature: "7/8",
    meters: ["7/8"],
    weights: [2, 3, 2],
    tempoUnit: "♪",
    summary: "빠른 7/8을 3박으로. 가운데 박이 길다.",
    release: 2,
    defaultBpm: 200,
  },
  {
    id: "EIGHT8_IN3_332",
    base: "THREE",
    nameKo: "8/8 (3+3+2)",
    level: 9,
    timeSignature: "8/8",
    meters: ["8/8"],
    weights: [3, 3, 2],
    tempoUnit: "♪",
    summary: "8/8을 3+3+2로 묶어 3박으로.",
    release: 2,
    defaultBpm: 200,
  },
];

/** 원본 패턴의 박 모양을 깊은 복사하고 파생 규칙을 덮어쓴다 */
export function derivePattern(base: PatternDef, spec: DerivedSpec): PatternDef {
  if (spec.weights && spec.weights.length !== base.beats.length) {
    throw new Error(`${spec.id}: weights 길이(${spec.weights.length})가 박 수(${base.beats.length})와 다릅니다`);
  }
  return {
    ...base,
    id: spec.id,
    base: base.id,
    nameKo: spec.nameKo,
    level: spec.level,
    timeSignature: spec.timeSignature,
    meters: [...spec.meters],
    summary: spec.summary,
    release: spec.release,
    defaultBpm: spec.defaultBpm,
    tempoUnit: spec.tempoUnit ?? base.tempoUnit,
    weights: spec.weights ? [...spec.weights] : undefined,
    subdivide: spec.subdivide,
    beats: base.beats.map((b) => ({
      ...b,
      P: [...b.P] as typeof b.P,
      A: [...b.A] as typeof b.A,
      via: b.via?.map((v) => [...v] as typeof v),
      label: b.label ? ([...b.label] as typeof b.label) : undefined,
    })),
  };
}
