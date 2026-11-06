import type { PatternDef } from "../types";
import { ONE } from "./one";
import { TWO } from "./two";
import { THREE } from "./three";
import { FOUR } from "./four";
import { SIX_GERMAN, SIX_ITALIAN } from "./six";
import { FIVE_23, FIVE_32 } from "./five";
import { SEVEN_34, SEVEN_43 } from "./seven";
import { DERIVED_SPECS, derivePattern } from "./derived";

const BASE_PATTERNS: PatternDef[] = [
  ONE,
  TWO,
  THREE,
  FOUR,
  SIX_GERMAN,
  SIX_ITALIAN,
  FIVE_32,
  FIVE_23,
  SEVEN_43,
  SEVEN_34,
];

const baseById = new Map(BASE_PATTERNS.map((p) => [p.id, p]));

const DERIVED_PATTERNS: PatternDef[] = DERIVED_SPECS.map((spec) => {
  const base = baseById.get(spec.base);
  if (!base) throw new Error(`파생 패턴 ${spec.id}의 원본 ${spec.base}가 없습니다`);
  return derivePattern(base, spec);
});

export const PATTERNS: PatternDef[] = [...BASE_PATTERNS, ...DERIVED_PATTERNS];

const byId = new Map(PATTERNS.map((p) => [p.id, p]));

export function getPattern(id: string): PatternDef {
  const p = byId.get(id);
  if (!p) throw new Error(`알 수 없는 패턴: ${id}`);
  return p;
}

export function hasPattern(id: string): boolean {
  return byId.has(id);
}

/** 라이브러리 목록의 묶음 (난이도 순) */
export interface PatternGroup {
  id: string;
  title: string;
  /** 1차 = 기본, 2차 = 고급(레슨은 2차에 열림) */
  release: 1 | 2;
  patternIds: string[];
}

export const PATTERN_GROUPS: PatternGroup[] = [
  { id: "basic", title: "기본 박자", release: 1, patternIds: ["ONE", "TWO", "THREE", "FOUR"] },
  {
    id: "compound",
    title: "6박자와 복합 박자",
    release: 1,
    patternIds: ["SIX_GERMAN", "SIX_ITALIAN", "SIX8_IN2", "NINE8_IN3", "TWELVE8_IN4"],
  },
  { id: "five-seven", title: "5박자 · 7박자", release: 2, patternIds: ["FIVE_32", "FIVE_23", "SEVEN_43", "SEVEN_34"] },
  { id: "subdivided", title: "분할 패턴", release: 2, patternIds: ["SUB_TWO_4", "SUB_THREE_6", "SUB_FOUR_8"] },
  {
    id: "asymmetric",
    title: "불규칙 박",
    release: 2,
    patternIds: [
      "FIVE8_IN2_32",
      "FIVE8_IN2_23",
      "SEVEN8_IN3_223",
      "SEVEN8_IN3_322",
      "SEVEN8_IN3_232",
      "EIGHT8_IN3_332",
    ],
  },
];

export { ONE, TWO, THREE, FOUR, SIX_GERMAN, SIX_ITALIAN, FIVE_32, FIVE_23, SEVEN_43, SEVEN_34 };
